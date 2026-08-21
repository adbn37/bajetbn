import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSpaceChatAttachmentUrl,
  removeSpaceChatAttachment,
  sendSpaceMessage,
  subscribeSpaceMessages,
  uploadSpaceChatAttachment,
  type SpaceChatAttachmentInput,
} from '../../repositories/spaceChatRepository';
import {
  listSpaceChatRecordOptions,
  spaceChatRecordTypeLabel,
  type SpaceChatRecordOption,
} from '../../repositories/spaceChatRecordRepository';
import type {
  Space,
  SpaceMember,
  SpaceMessage,
} from '../../types/models';

interface Props {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
}

function memberLabel(member: SpaceMember) {
  return (
    member.displayName?.trim()
    || member.email?.trim()
    || 'Member'
  );
}

function messageTime(message: SpaceMessage) {
  const date = message.createdAt?.toDate?.();

  if (!date) return 'Sending...';

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function SpaceChatAttachment({ message }: { message: SpaceMessage }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    if (!message.storagePath) {
      setUrl('');
      setFailed(false);
      return () => {
        active = false;
      };
    }

    setFailed(false);

    void getSpaceChatAttachmentUrl(message.storagePath)
      .then((nextUrl) => {
        if (active) setUrl(nextUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [message.storagePath]);

  if (!message.storagePath) return null;

  if (failed) {
    return <div className="space-chat-attachment unavailable">Attachment unavailable</div>;
  }

  if (!url) {
    return <div className="space-chat-attachment">Loading attachment...</div>;
  }

  if (message.contentType?.startsWith('image/')) {
    return (
      <a
        className="space-chat-attachment image"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        <img src={url} alt={message.fileName || 'Chat attachment'} />
        <span>{message.fileName || 'Open image'}</span>
      </a>
    );
  }

  return (
    <a
      className="space-chat-attachment file"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {message.fileName || 'Open PDF attachment'}
    </a>
  );
}

export function SpaceChatPanel({
  space,
  members,
  currentMember,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [messages, setMessages] =
    useState<SpaceMessage[]>([]);

  const [message, setMessage] = useState('');
  const [mentionUids, setMentionUids] = useState<string[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showRecordPicker, setShowRecordPicker] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [records, setRecords] = useState<SpaceChatRecordOption[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<SpaceChatRecordOption | null>(null);
  const [replyingTo, setReplyingTo] =
    useState<SpaceMessage | null>(null);
  const [attachmentFile, setAttachmentFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);

  const activeMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          (member.status || 'active') === 'active',
      ),
    [members],
  );

  const memberNames = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.uid,
          memberLabel(member),
        ]),
      ),
    [members],
  );

  const mentionableMembers = useMemo(
    () =>
      activeMembers.filter(
        (member) => member.uid !== user?.uid,
      ),
    [activeMembers, user?.uid],
  );

  const mentionedMembers = useMemo(
    () =>
      mentionUids
        .map((uid) =>
          activeMembers.find((member) => member.uid === uid),
        )
        .filter((member): member is SpaceMember => Boolean(member)),
    [activeMembers, mentionUids],
  );

  const filteredRecords = useMemo(() => {
    const term = recordSearch.trim().toLowerCase();

    return records
      .filter((record) =>
        !term || record.searchText.includes(term),
      )
      .slice(0, 30);
  }, [recordSearch, records]);

  useEffect(() => {
    setLoading(true);
    setError('');

    return subscribeSpaceMessages(
      space.id,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      () => {
        setError(
          'Chat could not refresh. Check your connection and try again.',
        );
        setLoading(false);
      },
    );
  }, [space.id]);

  useEffect(() => {
    let active = true;
    setRecordsLoading(true);

    void listSpaceChatRecordOptions(space.id)
      .then((nextRecords) => {
        if (active) setRecords(nextRecords);
      })
      .finally(() => {
        if (active) setRecordsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [space.id]);

  useEffect(() => {
    const recordType = searchParams.get('recordType');
    const recordId = searchParams.get('recordId');

    if (!recordType || !recordId || records.length === 0) return;

    const record = records.find(
      (item) =>
        item.type === recordType
        && item.id === recordId,
    );

    if (record) {
      setSelectedRecord(record);
      setShowRecordPicker(false);
    }
  }, [records, searchParams]);

  useEffect(() => {
    const focusMessageId = searchParams.get('messageId');
    if (!focusMessageId || loading) return;

    const node = document.getElementById(
      'space-message-' + focusMessageId,
    );

    node?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [loading, messages, searchParams]);

  useEffect(() => {
    if (searchParams.get('messageId')) return;

    endRef.current?.scrollIntoView({
      block: 'end',
    });
  }, [messages, searchParams]);

  const maySend = Boolean(
    user
    && currentMember
    && (currentMember.status || 'active') === 'active',
  );

  function addMention(member: SpaceMember) {
    setMentionUids((current) =>
      current.includes(member.uid)
        ? current
        : [...current, member.uid],
    );

    const token = '@' + memberLabel(member);
    setMessage((current) => {
      if (current.includes(token)) return current;
      return (current.trimEnd() + (current.trim() ? ' ' : '') + token + ' ').slice(0, 2000);
    });

    setShowMemberPicker(false);
  }

  function removeMention(uid: string) {
    setMentionUids((current) =>
      current.filter((item) => item !== uid),
    );
  }

  function chooseRecord(record: SpaceChatRecordOption) {
    setSelectedRecord(record);
    setShowRecordPicker(false);

    const token = '@' + spaceChatRecordTypeLabel(record.type);

    setMessage((current) => {
      if (current.includes(token)) return current;
      return (current.trimEnd() + (current.trim() ? ' ' : '') + token + ' ').slice(0, 2000);
    });
  }

  function chooseAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (
      file
      && !file.type.startsWith('image/')
      && file.type !== 'application/pdf'
    ) {
      setError('Attach an image or PDF.');
      event.target.value = '';
      return;
    }

    if (file && (file.size <= 0 || file.size >= 10 * 1024 * 1024)) {
      setError('Attachments must be smaller than 10 MB.');
      event.target.value = '';
      return;
    }

    setAttachmentFile(file);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!user || !maySend) return;

    const body = message.trim();

    if (!body && !selectedRecord && !attachmentFile) return;

    setSending(true);
    setError('');

    let uploadedAttachment: SpaceChatAttachmentInput | null = null;

    try {
      if (attachmentFile) {
        uploadedAttachment = await uploadSpaceChatAttachment({
          spaceId: space.id,
          uid: user.uid,
          file: attachmentFile,
        });
      }

      await sendSpaceMessage({
        spaceId: space.id,
        body,
        mentionUids,
        recordRef: selectedRecord
          ? {
              type: selectedRecord.type,
              id: selectedRecord.id,
              label: selectedRecord.label,
              targetPath: selectedRecord.targetPath,
            }
          : null,
        replyToMessageId: replyingTo?.id || null,
        attachment: uploadedAttachment,
      });

      setMessage('');
      setMentionUids([]);
      setSelectedRecord(null);
      setReplyingTo(null);
      setAttachmentFile(null);
      setRecordSearch('');
    }
    catch (nextError) {
      if (uploadedAttachment?.storagePath) {
        await removeSpaceChatAttachment(
          uploadedAttachment.storagePath,
        );
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Message could not be sent.',
      );
    }
    finally {
      setSending(false);
    }
  }

  return (
    <section className="panel space-chat-panel">
      <div className="panel-heading space-chat-heading">
        <div>
          <span className="eyebrow">Space chat</span>
          <h2>{space.name}</h2>
          <p>
            Talk with members, mention records, and keep decisions beside the source.
          </p>
        </div>

        <span className="type-badge">
          {messages.length} message(s)
        </span>
      </div>

      <div
        className="space-chat-messages"
        aria-live="polite"
      >
        {loading && (
          <div className="loading-panel">
            Loading chat...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="empty-inline">
            No messages yet. Start the conversation for this Space.
          </div>
        )}

        {!loading
          && messages.map((item) => {
            const mine = item.senderUid === user?.uid;

            const sender =
              mine
                ? 'You'
                : memberNames.get(item.senderUid)
                  || 'Former member';

            const focused =
              searchParams.get('messageId') === item.id;

            return (
              <article
                id={'space-message-' + item.id}
                key={item.id}
                className={
                  (mine
                    ? 'space-chat-message mine'
                    : 'space-chat-message')
                  + (focused ? ' focused' : '')
                }
              >
                <div className="space-chat-message-meta">
                  <strong>{sender}</strong>
                  <small>{messageTime(item)}</small>
                </div>

                {item.replyTo && (
                  <div className="space-chat-reply-preview">
                    <span>Reply</span>
                    <small>{item.replyTo.bodyPreview}</small>
                  </div>
                )}

                {item.body && <p>{item.body}</p>}

                {item.mentionLabels
                  && item.mentionLabels.length > 0
                  && (
                    <div className="space-chat-mention-labels">
                      {item.mentionLabels.map((label) => (
                        <span key={label}>@{label}</span>
                      ))}
                    </div>
                  )}

                {item.recordRef && (
                  <div className="space-chat-record-card">
                    <div>
                      <span className="eyebrow">
                        {spaceChatRecordTypeLabel(item.recordRef.type)}
                      </span>
                      <strong>{item.recordRef.label}</strong>
                    </div>

                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={() => navigate(item.recordRef?.targetPath || '')}
                    >
                      Open record
                    </button>
                  </div>
                )}

                <SpaceChatAttachment message={item} />

                {maySend && (
                  <div className="space-chat-message-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setReplyingTo(item)}
                    >
                      Reply
                    </button>
                  </div>
                )}
              </article>
            );
          })}

        <div ref={endRef} />
      </div>

      {error && (
        <div className="notice warning">
          {error}
        </div>
      )}

      {maySend ? (
        <form
          className="space-chat-composer"
          onSubmit={submit}
        >
          {replyingTo && (
            <div className="space-chat-composer-context">
              <div>
                <span className="eyebrow">Replying to</span>
                <strong>
                  {(replyingTo.body || replyingTo.recordRef?.label || 'Attachment').slice(0, 180)}
                </strong>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </button>
            </div>
          )}

          {selectedRecord && (
            <div className="space-chat-composer-context">
              <div>
                <span className="eyebrow">Referenced record</span>
                <strong>{selectedRecord.label}</strong>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelectedRecord(null)}
              >
                Remove
              </button>
            </div>
          )}

          {mentionedMembers.length > 0 && (
            <div className="space-chat-composer-tags">
              {mentionedMembers.map((member) => (
                <button
                  type="button"
                  key={member.uid}
                  className="type-badge"
                  onClick={() => removeMention(member.uid)}
                  title="Remove mention"
                >
                  @{memberLabel(member)} x
                </button>
              ))}
            </div>
          )}

          {attachmentFile && (
            <div className="space-chat-composer-context">
              <div>
                <span className="eyebrow">Attachment</span>
                <strong>{attachmentFile.name}</strong>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setAttachmentFile(null)}
              >
                Remove
              </button>
            </div>
          )}

          <label>
            Message
            <textarea
              value={message}
              maxLength={2000}
              rows={3}
              placeholder={'Message ' + space.name}
              onChange={(event) =>
                setMessage(event.target.value)
              }
            />
          </label>

          <div className="space-chat-tools">
            <button
              type="button"
              className="button secondary compact"
              onClick={() => {
                setShowMemberPicker((current) => !current);
                setShowRecordPicker(false);
              }}
            >
              @ Mention member
            </button>

            <button
              type="button"
              className="button secondary compact"
              onClick={() => {
                setShowRecordPicker((current) => !current);
                setShowMemberPicker(false);
              }}
            >
              @ Reference record
            </button>

            <label className="button secondary compact space-chat-file-button">
              Attach image or PDF
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={chooseAttachment}
              />
            </label>
          </div>

          {showMemberPicker && (
            <div className="space-chat-picker">
              <strong>Mention member</strong>

              {mentionableMembers.length === 0
                ? <small>No other active members to mention.</small>
                : mentionableMembers.map((member) => (
                    <button
                      type="button"
                      key={member.uid}
                      className="space-chat-picker-row"
                      onClick={() => addMention(member)}
                    >
                      <strong>{memberLabel(member)}</strong>
                      <small>{member.role}</small>
                    </button>
                  ))}
            </div>
          )}

          {showRecordPicker && (
            <div className="space-chat-picker">
              <div className="space-chat-picker-heading">
                <strong>Reference record</strong>
                <small>
                  {recordsLoading
                    ? 'Loading...'
                    : records.length + ' available'}
                </small>
              </div>

              <input
                type="search"
                value={recordSearch}
                placeholder="Search Expense, Booking, Task, Budget..."
                onChange={(event) => setRecordSearch(event.target.value)}
              />

              <div className="space-chat-picker-list">
                {filteredRecords.length === 0
                  ? <small>No accessible matching records.</small>
                  : filteredRecords.map((record) => (
                      <button
                        type="button"
                        key={record.type + ':' + record.id}
                        className="space-chat-picker-row"
                        onClick={() => chooseRecord(record)}
                      >
                        <strong>{record.label}</strong>
                        <small>{spaceChatRecordTypeLabel(record.type)}</small>
                      </button>
                    ))}
              </div>
            </div>
          )}

          <div className="space-chat-composer-footer">
            <small>{message.length}/2000</small>

            <button
              type="submit"
              className="button primary"
              disabled={
                sending
                || (
                  !message.trim()
                  && !selectedRecord
                  && !attachmentFile
                )
              }
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      ) : (
        <div className="notice">
          Only active members of this Space can send messages.
        </div>
      )}
    </section>
  );
}
