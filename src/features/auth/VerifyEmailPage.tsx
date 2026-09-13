import {
  useState,
} from 'react';

import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  reload,
  sendEmailVerification,
} from 'firebase/auth';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  getErrorMessage,
} from '../../utils/errors';

export function VerifyEmailPage() {
  const {
    user,
    logOut,
  } = useAuth();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const returnTo =
    typeof location.state?.from === 'string'
    && location.state.from.startsWith('/')
      ? location.state.from
      : '';

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={
          returnTo
            ? { from: returnTo }
            : undefined
        }
      />
    );
  }

  if (user.emailVerified) {
    return (
      <Navigate
        to="/onboarding"
        replace
        state={
          returnTo
            ? { from: returnTo }
            : undefined
        }
      />
    );
  }

  const check = async () => {
    setError('');

    await reload(
      user,
    );

    if (!user.emailVerified) {
      setMessage(
        'Not verified yet. Open the email link, then check again.',
      );

      return;
    }

    navigate(
      '/onboarding',
      {
        replace: true,
        state:
          returnTo
            ? { from: returnTo }
            : undefined,
      },
    );
  };

  return (
    <div className="auth-card">
      <span className="eyebrow">
        One more step
      </span>

      <h2>Verify your email</h2>

      <p>
        We sent a verification link to{' '}
        <strong>{user.email}</strong>.
      </p>

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="button-row">
        <button
          className="button primary"
          onClick={() =>
            void check().catch(
              (nextError) =>
                setError(
                  getErrorMessage(
                    nextError,
                  ),
                ),
            )
          }
        >
          I have verified
        </button>

        <button
          className="button secondary"
          onClick={() =>
            void sendEmailVerification(
              user,
            )
              .then(
                () =>
                  setMessage(
                    'Verification email sent again.',
                  ),
              )
              .catch(
                (nextError) =>
                  setError(
                    getErrorMessage(
                      nextError,
                    ),
                  ),
              )
          }
        >
          Resend
        </button>
      </div>

      <button
        className="text-button"
        onClick={() => void logOut()}
      >
        Use another account
      </button>
    </div>
  );
}
