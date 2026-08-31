import {
  useState,
  type FormEvent,
} from 'react';
import {
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { Brand } from '../../components/Brand';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { requireFirebase } from '../../services/firebase';
import { getErrorMessage } from '../../utils/errors';

type OnboardingStep = 1 | 2 | 3;

export function OnboardingPage() {
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const preferences = usePreferences();
  const navigate = useNavigate();

  const [step, setStep] =
    useState<OnboardingStep>(1);

  const [fullName, setFullName] =
    useState(user?.displayName || '');

  const [language, setLanguage] =
    useState<'en' | 'ms'>(
      preferences.language,
    );

  const currency = 'BND';

  const [timezone, setTimezone] =
    useState('Asia/Brunei');


  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');


  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.onboardingCompleted) {
    return <Navigate to="/" replace />;
  }

  const finishSetup = async () => {
    setBusy(true);
    setError('');

    try {
      const { functions } =
        requireFirebase();

      const call =
        httpsCallable(
          functions,
          'completeOnboarding',
        );

      await call({
        fullName: fullName.trim(),
        language,
        currency,
        timezone,
        appearance:
          preferences.appearance,
      });

      await refreshProfile();

      navigate(
        '/spaces?welcome=1',
        { replace: true },
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    setError('');

    if (step === 1) {
      if (!fullName.trim()) {
        setError(
          'Enter your full name to continue.',
        );

        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    await finishSetup();
  };

  const goBack = () => {
    setError('');

    if (step === 3) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(1);
    }
  };

  return (
    <main className="onboarding-shell">
      <div className="onboarding-brand">
        <Brand />
      </div>

      <section className="onboarding-card guided-onboarding-v113">
        <div className="guided-onboarding-heading">
          <div>
            <span className="step-pill">
              Step {step} of 3
            </span>

            <h1>
              {step === 1
                ? 'Tell us about you'
                : step === 2
                  ? 'How BajetBN organises your money'
                  : 'Your first steps'}
            </h1>
          </div>

          <div
            className="guided-onboarding-progress"
            aria-label={`Onboarding step ${step} of 3`}
          >
            {[1, 2, 3].map(
              (item) => (
                <span
                  key={item}
                  className={
                    item <= step
                      ? 'complete'
                      : ''
                  }
                />
              ),
            )}
          </div>
        </div>

        {step === 1 && (
          <p>
            Start with the basics.
            BajetBN always creates one private
            Personal Space for your own money.
          </p>
        )}

        {step === 2 && (
          <p>
            Start with your Personal Space. A Space separates one part
            of your financial life; Accounts inside it show where that
            money is actually kept.
          </p>
        )}

        {step === 3 && (
          <p>
            Keep the first setup simple. Add another Space later only
            when a household, trip, business or other purpose needs to
            stay separate from your personal money.
          </p>
        )}

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="form-stack guided-onboarding-form"
        >
          {step === 1 && (
            <div className="form-grid guided-onboarding-details">
              <label className="span-2">
                Full name

                <input
                  required
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Your full name"
                />
              </label>

              <label>
                Language

                <select
                  value={language}
                  onChange={(event) => {
                    const next =
                      event.target.value as
                        | 'en'
                        | 'ms';

                    setLanguage(next);
                    preferences.setLanguage(next);
                  }}
                >
                  <option value="en">
                    English
                  </option>

                  <option value="ms">
                    Bahasa Melayu
                  </option>
                </select>
              </label>

              <label>
                Currency

                <select
                  value={currency}
                  disabled
                >
                  <option value="BND">
                    BND — Brunei Dollar
                  </option>
                </select>
              </label>

              <label className="span-2">
                Timezone

                <select
                  value={timezone}
                  onChange={(event) =>
                    setTimezone(
                      event.target.value,
                    )
                  }
                >
                  <option value="Asia/Brunei">
                    Asia/Brunei (UTC+8)
                  </option>
                </select>
              </label>

              <div className="personal-space-preview span-2">
                <span className="space-icon personal">
                  P
                </span>

                <div>
                  <strong>
                    Personal Space
                  </strong>

                  <small>
                    Private · Owner only · BND
                  </small>
                </div>

                <span>
                  Created automatically
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="guided-setup-review">
              <article className="guided-setup-summary">
                <span
                  className="space-icon personal"
                  aria-hidden="true"
                >
                  P
                </span>

                <div>
                  <span className="eyebrow">
                    The simple rule
                  </span>

                  <h2>
                    Space = purpose
                  </h2>

                  <p>
                    Your Personal Space is your private money home.
                    Household, Trip and Business Spaces are separate
                    environments you can add only when you need them.
                  </p>
                </div>
              </article>

              <div className="guided-setup-checklist">
                <article className="guided-setup-item complete">
                  <span>S</span>

                  <div>
                    <strong>
                      Space = purpose
                    </strong>

                    <small>
                      Personal, Household, Trip or Business.
                    </small>
                  </div>

                  <em>
                    Context
                  </em>
                </article>

                <article className="guided-setup-item">
                  <span>A</span>

                  <div>
                    <strong>
                      Account = where money is kept
                    </strong>

                    <small>
                      BIBD, Baiduri, cash, card or e-wallet can
                      live inside the right Space.
                    </small>
                  </div>

                  <em>
                    Money location
                  </em>
                </article>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="guided-setup-review">
              <div className="guided-setup-checklist">
                <article className="guided-setup-item complete">
                  <span>1</span>

                  <div>
                    <strong>
                      Personal Space
                    </strong>

                    <small>
                      Created automatically as your private money home.
                    </small>
                  </div>

                  <em>
                    Ready
                  </em>
                </article>

                <article className="guided-setup-item">
                  <span>2</span>

                  <div>
                    <strong>
                      Add your first account
                    </strong>

                    <small>
                      Add the bank, cash, card or e-wallet you actually use.
                    </small>
                  </div>

                  <em>
                    Next
                  </em>
                </article>

                <article className="guided-setup-item">
                  <span>3</span>

                  <div>
                    <strong>
                      Record your first money activity
                    </strong>

                    <small>
                      Add income or an expense inside your Personal Space.
                    </small>
                  </div>

                  <em>
                    Then
                  </em>
                </article>

                <article className="guided-setup-item">
                  <span>4</span>

                  <div>
                    <strong>
                      Add another Space only when needed
                    </strong>

                    <small>
                      Use one for a household, trip, business or
                      another purpose that should stay separate.
                    </small>
                  </div>

                  <em>
                    Later
                  </em>
                </article>
              </div>

              <div className="notice">
                Your theme is chosen on the sign-in page
                and can be changed later in Settings.
              </div>
            </div>
          )}

          <div className="guided-onboarding-actions">
            {step > 1 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={goBack}
              >
                Back
              </button>
            )}

            <button
              className="button primary"
              disabled={busy}
            >
              {busy
                ? 'Creating your Personal Space...'
                : step === 1
                  ? 'Continue'
                  : step === 2
                    ? 'Show my first steps'
                    : 'Finish setup'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
