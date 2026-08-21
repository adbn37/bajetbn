import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  sendSpaceMessage,
  subscribeSpaceMessages,
} from '../../repositories/spaceChatRepository';
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

function messageTime(message: SpaceMessage) {
  const date = message.createdAt?.toDate?.();

  if (!date) return 'Sending…';

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

export function SpaceChatPanel({
  space,
  members,
  currentMember,
}: Props) {
  const { user } = useAuth();

  const [messages, setMessages] =
    useState<SpaceMessage[]>([]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);

  const memberNames = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.uid,
          member.displayName?.trim()
            || member.email?.trim()
            || 'Member',
        ]),
      ),
    [members],
  );

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
    endRef.current?.scrollIntoView({
      block: 'end',
    });
  }, [messages]);

  const maySend = Boolean(
    user
    && currentMember
    && (currentMember.status || 'active') === 'active',
  );

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!user || !maySend) return;

    const body = message.trim();
    if (!body) return;

    setSending(true);
    setError('');

    try {
      await sendSpaceMessage({
        spaceId: space.id,
        senderUid: user.uid,
        body,
      });

      setMessage('');
    }
    catch (nextError) {
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
            Talk with members here without leaving this Space.
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
            Loading chat…
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

            return (
              <article
                key={item.id}
                className={
                  mine
                    ? 'space-chat-message mine'
                    : 'space-chat-message'
                }
              >
                <div className="space-chat-message-meta">
                  <strong>{sender}</strong>
                  <small>{messageTime(item)}</small>
                </div>

                <p>{item.body}</p>
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
          <label>
            Message
            <textarea
              value={message}
              maxLength={2000}
              rows={3}
              placeholder={`Message ${space.name}`}
              onChange={(event) =>
                setMessage(event.target.value)
              }
            />
          </label>

          <div className="space-chat-composer-footer">
            <small>{message.length}/2000</small>

            <button
              type="submit"
              className="button primary"
              disabled={sending || !message.trim()}
            >
              {sending ? 'Sending…' : 'Send'}
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
