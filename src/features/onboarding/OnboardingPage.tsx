import {
  useMemo,
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

type OnboardingPurpose =
  | 'personal'
  | 'household'
  | 'sme'
  | 'trip';

interface PurposeOption {
  value: OnboardingPurpose;
  icon: string;
  title: string;
  description: string;
  nextStep: string;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    value: 'personal',
    icon: 'P',
    title: 'Personal money',
    description:
      'Track your own bank, cash, spending, bills, budgets and savings.',
    nextStep:
      'Add your first account and record your first money activity.',
  },
  {
    value: 'household',
    icon: 'H',
    title: 'Household & family',
    description:
      'Keep household money, shared bills, tasks and shopping together.',
    nextStep:
      'Create a Household Space after your Personal Space is ready.',
  },
  {
    value: 'sme',
    icon: 'B',
    title: 'Business / SME',
    description:
      'Separate business accounts, sales, POS, invoices and operations from personal money.',
    nextStep:
      'Create an SME Space after your Personal Space is ready.',
  },
  {
    value: 'trip',
    icon: 'T',
    title: 'Trip / travel',
    description:
      'Plan trip money, contributions, expenses, tasks and settlements.',
    nextStep:
      'Create a Trip Space after your Personal Space is ready.',
  },
];

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

  const [purpose, setPurpose] =
    useState<OnboardingPurpose>('personal');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const selectedPurpose = useMemo(
    () =>
      PURPOSE_OPTIONS.find(
        (item) =>
          item.value === purpose,
      ) || PURPOSE_OPTIONS[0],
    [purpose],
  );

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
        `/spaces?welcome=1&setup=${purpose}`,
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
                  ? 'What do you want to organise first?'
                  : 'Your first setup plan'}
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
            Choose what you want help setting up first.
            This does not remove your Personal Space —
            it only changes the next recommended step.
          </p>
        )}

        {step === 3 && (
          <p>
            Review what BajetBN will prepare for you.
            You can change or add more Spaces later.
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
            <div
              className="onboarding-purpose-grid"
              role="radiogroup"
              aria-label="Choose what to organise first"
            >
              {PURPOSE_OPTIONS.map(
                (option) => {
                  const selected =
                    purpose === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`onboarding-purpose-card ${
                        selected
                          ? 'selected'
                          : ''
                      }`}
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setPurpose(
                          option.value,
                        )
                      }
                    >
                      <span
                        className={`space-icon ${
                          option.value === 'sme'
                            ? 'sme'
                            : option.value
                        }`}
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>

                      <span className="onboarding-purpose-copy">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>

                      <span
                        className="onboarding-purpose-check"
                        aria-hidden="true"
                      >
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {step === 3 && (
            <div className="guided-setup-review">
              <article className="guided-setup-summary">
                <span
                  className={`space-icon ${
                    purpose === 'sme'
                      ? 'sme'
                      : purpose
                  }`}
                  aria-hidden="true"
                >
                  {selectedPurpose.icon}
                </span>

                <div>
                  <span className="eyebrow">
                    Your focus
                  </span>

                  <h2>
                    {selectedPurpose.title}
                  </h2>

                  <p>
                    {selectedPurpose.description}
                  </p>
                </div>
              </article>

              <div className="guided-setup-checklist">
                <article className="guided-setup-item complete">
                  <span>1</span>

                  <div>
                    <strong>
                      Personal Space
                    </strong>

                    <small>
                      Created automatically as your
                      private money home.
                    </small>
                  </div>

                  <em>Ready</em>
                </article>

                <article className="guided-setup-item">
                  <span>2</span>

                  <div>
                    <strong>
                      Add your first account
                    </strong>

                    <small>
                      Add your bank, cash, card or
                      e-wallet so balances have a
                      real money location.
                    </small>
                  </div>

                  <em>Next</em>
                </article>

                <article className="guided-setup-item">
                  <span>3</span>

                  <div>
                    <strong>
                      Continue with {selectedPurpose.title}
                    </strong>

                    <small>
                      {selectedPurpose.nextStep}
                    </small>
                  </div>

                  <em>Suggested</em>
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
                    ? 'Review my setup'
                    : 'Finish setup'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
