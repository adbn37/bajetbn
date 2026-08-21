import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createSpaceAnnouncement,
  createSpacePoll,
  setSpaceAnnouncementState,
  setSpacePollStatus,
  subscribeSpaceAnnouncements,
  subscribeSpacePolls,
  subscribeSpacePollVotes,
  voteSpacePoll,
} from '../../repositories/spaceCollaborationActionsRepository';
import type {
  SpaceAnnouncement,
  SpaceMember,
  SpacePoll,
  SpacePollVote,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';

function displayTime(value: { toDate?: () => Date } | null | undefined) {
  const date = value?.toDate?.();
  return date
    ? date.toLocaleString('en-BN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Just now';
}

function isExpired(expiresOn?: string | null) {
  if (!expiresOn) return false;
  return expiresOn < new Date().toISOString().slice(0, 10);
}

export function SpaceUpdatesPanel({
  spaceId,
  currentMember,
}: {
  spaceId: string;
  currentMember: SpaceMember | null;
}) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<SpaceAnnouncement[]>([]);
  const [polls, setPolls] = useState<SpacePoll[]>([]);
  const [votes, setVotes] = useState<SpacePollVote[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [kind, setKind] = useState<'announcement' | 'poll'>('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const canVote = Boolean(
    user &&
    currentMember &&
    (currentMember.status || 'active') === 'active',
  );

  useEffect(() => {
    setError('');

    const stopAnnouncements = subscribeSpaceAnnouncements(
      spaceId,
      setAnnouncements,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    const stopPolls = subscribeSpacePolls(
      spaceId,
      setPolls,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    const stopVotes = subscribeSpacePollVotes(
      spaceId,
      setVotes,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    return () => {
      stopAnnouncements();
      stopPolls();
      stopVotes();
    };
  }, [spaceId]);

  const visibleAnnouncements = useMemo(
    () => announcements.filter((item) => !item.archivedAt),
    [announcements],
  );

  function resetComposer() {
    setTitle('');
    setBody('');
    setExpiresOn('');
    setQuestion('');
    setOptions(['', '']);
    setKind('announcement');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      if (kind === 'announcement') {
        await createSpaceAnnouncement({
          spaceId,
          title: title.trim(),
          body: body.trim(),
          expiresOn: expiresOn || null,
        });
        setNotice('Announcement posted.');
      } else {
        await createSpacePoll({
          spaceId,
          question: question.trim(),
          options: options.map((item) => item.trim()).filter(Boolean),
        });
        setNotice('Poll opened.');
      }

      resetComposer();
      setComposerOpen(false);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function announcementAction(
    announcement: SpaceAnnouncement,
    action: 'pin' | 'unpin' | 'archive',
  ) {
    setBusyId(announcement.id);
    setError('');
    setNotice('');

    try {
      await setSpaceAnnouncementState({
        spaceId,
        announcementId: announcement.id,
        action,
      });
      setNotice(
        action === 'archive'
          ? 'Announcement archived.'
          : action === 'pin'
            ? 'Announcement pinned.'
            : 'Announcement unpinned.',
      );
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  async function castVote(poll: SpacePoll, optionId: string) {
    if (!canVote || poll.status !== 'open') return;

    setBusyId(poll.id);
    setError('');
    setNotice('');

    try {
      await voteSpacePoll({ spaceId, pollId: poll.id, optionId });
      setNotice('Vote saved. You can change it while the poll is open.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  async function changePollStatus(poll: SpacePoll) {
    setBusyId(poll.id);
    setError('');
    setNotice('');

    try {
      const nextStatus = poll.status === 'open' ? 'closed' : 'open';
      await setSpacePollStatus({
        spaceId,
        pollId: poll.id,
        status: nextStatus,
      });
      setNotice(nextStatus === 'closed' ? 'Poll closed.' : 'Poll reopened.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusyId('');
    }
  }

  function votesFor(pollId: string, optionId: string) {
    return votes.filter(
      (vote) => vote.pollId === pollId && vote.optionId === optionId,
    ).length;
  }

  function myVote(pollId: string) {
    return votes.find(
      (vote) => vote.pollId === pollId && vote.uid === user?.uid,
    ) || null;
  }

  return (
    <section className="space-updates">
      <section className="panel space-updates-hero">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Space updates</span>
            <h2>Announcements & polls</h2>
            <p>
              Keep important updates and group decisions in the Space instead of
              losing them in chat.
            </p>
          </div>
          {canManage && (
            <button
              className="button primary"
              type="button"
              onClick={() => setComposerOpen((value) => !value)}
            >
              {composerOpen ? 'Close' : 'Add update'}
            </button>
          )}
        </div>

        {!canManage && (
          <div className="notice">
            Only the Space owner or manager can post announcements or create and
            manage polls. Every active member can vote.
          </div>
        )}
        {error && <div className="notice error">{error}</div>}
        {notice && <div className="notice success">{notice}</div>}

        {canManage && composerOpen && (
          <form className="space-update-composer" onSubmit={submit}>
            <div className="segmented-control">
              <button
                type="button"
                className={kind === 'announcement' ? 'active' : ''}
                onClick={() => setKind('announcement')}
              >
                Announcement
              </button>
              <button
                type="button"
                className={kind === 'poll' ? 'active' : ''}
                onClick={() => setKind('poll')}
              >
                Poll
              </button>
            </div>

            {kind === 'announcement' ? (
              <>
                <label>
                  Title
                  <input
                    value={title}
                    maxLength={120}
                    required
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Important update"
                  />
                </label>
                <label>
                  Message
                  <textarea
                    value={body}
                    maxLength={2000}
                    required
                    rows={4}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="What should everyone know?"
                  />
                </label>
                <label>
                  Expires on <span className="muted">optional</span>
                  <input
                    type="date"
                    value={expiresOn}
                    onChange={(event) => setExpiresOn(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Question
                  <input
                    value={question}
                    maxLength={240}
                    required
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="What should the group decide?"
                  />
                </label>

                <div className="space-poll-option-editor">
                  {options.map((option, index) => (
                    <label key={index}>
                      Option {index + 1}
                      <div className="input-action-row">
                        <input
                          value={option}
                          maxLength={120}
                          required={index < 2}
                          onChange={(event) =>
                            setOptions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            )
                          }
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              setOptions((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {options.length < 8 && (
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={() => setOptions((current) => [...current, ''])}
                  >
                    Add option
                  </button>
                )}
              </>
            )}

            <div className="button-row">
              <button className="button primary" disabled={busy} type="submit">
                {busy
                  ? 'Saving...'
                  : kind === 'announcement'
                    ? 'Post announcement'
                    : 'Open poll'}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  resetComposer();
                  setComposerOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Important</span>
            <h2>Announcements</h2>
          </div>
        </div>

        {visibleAnnouncements.length ? (
          <div className="space-announcement-list">
            {visibleAnnouncements.map((announcement) => {
              const expired = isExpired(announcement.expiresOn);
              const className =
                'space-announcement-card' +
                (announcement.pinnedAt ? ' pinned' : '') +
                (expired ? ' expired' : '');

              return (
                <article key={announcement.id} className={className}>
                  <div className="space-announcement-meta">
                    <div className="badge-row">
                      {announcement.pinnedAt && (
                        <span className="type-badge">Pinned</span>
                      )}
                      {expired && <span className="type-badge">Expired</span>}
                    </div>
                    <small>
                      {announcement.createdByName || 'Space manager'} ·{' '}
                      {displayTime(announcement.createdAt)}
                    </small>
                  </div>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.body}</p>
                  {announcement.expiresOn && (
                    <small>Expires {announcement.expiresOn}</small>
                  )}
                  {canManage && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="text-button"
                        disabled={busyId === announcement.id}
                        onClick={() =>
                          void announcementAction(
                            announcement,
                            announcement.pinnedAt ? 'unpin' : 'pin',
                          )
                        }
                      >
                        {announcement.pinnedAt ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        className="text-button danger"
                        disabled={busyId === announcement.id}
                        onClick={() =>
                          void announcementAction(announcement, 'archive')
                        }
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact">
            <strong>No announcements yet</strong>
            <p>Important Space updates will appear here.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Decisions</span>
            <h2>Polls</h2>
          </div>
        </div>

        {polls.length ? (
          <div className="space-poll-list">
            {polls.map((poll) => {
              const mine = myVote(poll.id);
              const total = votes.filter(
                (vote) => vote.pollId === poll.id,
              ).length;

              return (
                <article
                  key={poll.id}
                  className={'space-poll-card status-' + poll.status}
                >
                  <div className="space-poll-heading">
                    <div>
                      <span className="type-badge">
                        {poll.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                      <h3>{poll.question}</h3>
                      <small>
                        {poll.createdByName || 'Space manager'} ·{' '}
                        {displayTime(poll.createdAt)}
                      </small>
                    </div>
                    <strong>
                      {total} vote{total === 1 ? '' : 's'}
                    </strong>
                  </div>

                  <div className="space-poll-options">
                    {poll.options.map((option) => {
                      const count = votesFor(poll.id, option.id);
                      const selected = mine?.optionId === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={
                            'space-poll-option' + (selected ? ' selected' : '')
                          }
                          disabled={
                            !canVote ||
                            poll.status !== 'open' ||
                            busyId === poll.id
                          }
                          onClick={() => void castVote(poll, option.id)}
                        >
                          <span>
                            {option.label}
                            {selected ? ' · You voted' : ''}
                          </span>
                          <strong>{count}</strong>
                        </button>
                      );
                    })}
                  </div>

                  {canManage && (
                    <div className="button-row">
                      <button
                        type="button"
                        className="text-button"
                        disabled={busyId === poll.id}
                        onClick={() => void changePollStatus(poll)}
                      >
                        {poll.status === 'open' ? 'Close poll' : 'Reopen poll'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact">
            <strong>No polls yet</strong>
            <p>Use a poll when the Space needs a clear group decision.</p>
          </div>
        )}
      </section>
    </section>
  );
}
