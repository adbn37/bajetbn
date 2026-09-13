import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  acceptSpaceInvitation,
} from '../../repositories/collaborationRepository';

import {
  getErrorMessage,
} from '../../utils/errors';

function safeJoinTarget(
  spaceId: string,
  requested: string,
) {
  const root =
    '/spaces/'
    + spaceId;

  if (
    requested === root
    || requested.startsWith(
      root + '?',
    )
    || requested.startsWith(
      root + '/',
    )
  ) {
    return requested;
  }

  return root;
}

export function JoinSpacePage() {
  const [
    params,
  ] = useSearchParams();

  const navigate =
    useNavigate();

  const token =
    params.get(
      'token',
    ) || '';

  const requestedNext =
    params.get(
      'next',
    ) || '';

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');

    try {
      const result =
        await acceptSpaceInvitation(
          token,
        );

      navigate(
        safeJoinTarget(
          result.spaceId,
          requestedNext,
        ),
        {
          replace: true,
        },
      );
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page join-space-page">
      <PageHeader
        eyebrow="Invitation"
        title="Join a shared Space"
        description="Sign in to BajetBN, then use this secure invite link. If the sender added your email, sign in with that email."
      />

      {!token ? (
        <div className="notice error">
          This invite link is incomplete.
          Ask the sender for a new link.
        </div>
      ) : (
        <section className="panel join-card">
          {error && (
            <div className="notice error">
              {error}
            </div>
          )}

          <h2>Join this Space</h2>

          <p>
            Joining gives you the access chosen by
            the Space owner.
          </p>

          {requestedNext && (
            <div className="info-banner">
              <strong>
                Continue where you were invited
              </strong>

              <span>
                After joining, BajetBN will open the
                shared expense or settlement area
                connected to this invitation.
              </span>
            </div>
          )}

          <button
            className="button primary"
            disabled={busy}
            onClick={() => void accept()}
          >
            {busy
              ? 'Joining…'
              : 'Join this Space'}
          </button>

          <Link
            className="button secondary"
            to="/"
          >
            Not now
          </Link>
        </section>
      )}
    </main>
  );
}
