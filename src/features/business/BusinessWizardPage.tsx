import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  getBusinessProfile,
  saveBusinessProfile,
  type BusinessProfileInput,
} from '../../repositories/businessAdvancedRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  BusinessIndustry,
  BusinessProfile,
  MarketplaceInventoryProfile,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

type WizardStep =
  | 1
  | 2
  | 3
  | 4;

interface IndustryOption {
  value: BusinessIndustry;
  label: string;
}

interface SetupPlan {
  headline: string;
  tools: string[];
  firstAction: string;
}

const industries: IndustryOption[] = [
  {
    value: 'general',
    label: 'General business',
  },
  {
    value: 'retail',
    label: 'Retail / shop',
  },
  {
    value: 'service',
    label: 'Service business',
  },
  {
    value: 'marketplace',
    label: 'Marketplace / consignment',
  },
  {
    value: 'rental',
    label: 'Rental business',
  },
  {
    value: 'transport_delivery',
    label: 'Transport / delivery',
  },
  {
    value: 'other',
    label: 'Other business',
  },
];

const marketplaceInventoryProfiles: Array<{
  value: MarketplaceInventoryProfile;
  label: string;
}> = [
  { value: 'general', label: 'General / Mixed items' },
  { value: 'collectibles', label: 'Trading Cards & Collectibles' },
  { value: 'fashion', label: 'Fashion / Clothing' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'toys_hobby', label: 'Toys / Hobby' },
  { value: 'books_comics', label: 'Books / Comics' },
  { value: 'beauty', label: 'Beauty / Personal Care' },
  { value: 'food', label: 'Food / Homemade Products' },
  { value: 'automotive', label: 'Automotive / Parts' },
  { value: 'handmade', label: 'Handmade / Crafts' },
  { value: 'other', label: 'Other / Custom' },
];

const setupPlans:
  Record<
    BusinessIndustry,
    SetupPlan
  > = {
    general: {
      headline:
        'Start with the core Business tools',
      tools: [
        'Business Accounts',
        'Customers & Vendors',
        'Invoices',
        'Accounting',
      ],
      firstAction:
        'Add the Business bank, cash or e-wallet accounts you actually use.',
    },

    retail: {
      headline:
        'Set up stock and daily checkout',
      tools: [
        'Business Accounts',
        'POS & Inventory',
        'Customers',
        'Accounting',
      ],
      firstAction:
        'Add a Business Account, then register your first product or stock item.',
    },

    service: {
      headline:
        'Set up customers, work and billing',
      tools: [
        'Customers',
        'Tasks',
        'Invoices',
        'Business Accounts',
      ],
      firstAction:
        'Add your Business Account and first reusable customer.',
    },

    marketplace: {
      headline:
        'Set up seller stock and payouts',
      tools: [
        'POS & Inventory',
        'Sellers',
        'Seller Payouts',
        'Business Accounts',
      ],
      firstAction:
        'Add the Business Account used for collections, then register your sellers.',
    },

    rental: {
      headline:
        'Set up customers and collections',
      tools: [
        'Customers',
        'Tasks',
        'Invoices',
        'Accounting',
      ],
      firstAction:
        'Add your Business Account and first customer or renter.',
    },

    transport_delivery: {
      headline:
        'Set up jobs and customer collections',
      tools: [
        'Tasks',
        'Customers',
        'Invoices',
        'Business Accounts',
      ],
      firstAction:
        'Add the Business Account used for job collections and expenses.',
    },

    other: {
      headline:
        'Build around how your Business works',
      tools: [
        'Business Accounts',
        'Customers & Vendors',
        'Invoices',
        'Accounting',
      ],
      firstAction:
        'Start with the Business Account where money is received or spent.',
    },
  };

function profileInput(
  space: Space,
  profile: BusinessProfile | null,
): BusinessProfileInput {
  return {
    businessName:
      profile?.businessName
      || space.name,

    industry:
      profile?.industry
      || 'general',

    marketplaceInventoryProfile:
      profile?.marketplaceInventoryProfile
      || 'general',

    registrationNumber:
      profile?.registrationNumber
      || '',

    address:
      profile?.address
      || '',

    phone:
      profile?.phone
      || '',

    email:
      profile?.email
      || '',

    fiscalYearStartMonth:
      profile?.fiscalYearStartMonth
      || 1,

    invoicePrefix:
      profile?.invoicePrefix
      || 'INV',
  };
}

export function BusinessWizardPage() {
  const {
    user,
  } = useAuth();

  const {
    spaceId = '',
  } = useParams();

  const navigate =
    useNavigate();

  const [
    space,
    setSpace,
  ] = useState<Space | null>(
    null,
  );

  const [
    profile,
    setProfile,
  ] = useState<BusinessProfile | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<BusinessProfileInput | null>(
    null,
  );

  const [
    step,
    setStep,
  ] = useState<WizardStep>(
    1,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  useEffect(
    () => {
      let active = true;

      void (
        async () => {
          if (!spaceId) {
            setLoading(false);
            return;
          }

          setLoading(true);
          setError('');

          try {
            const nextSpace =
              await getSpace(
                spaceId,
              );

            if (!active) {
              return;
            }

            setSpace(
              nextSpace,
            );

            if (
              !nextSpace
              || nextSpace.type !== 'sme'
            ) {
              return;
            }

            const nextProfile =
              await getBusinessProfile(
                spaceId,
              );

            if (!active) {
              return;
            }

            setProfile(
              nextProfile,
            );

            setForm(
              profileInput(
                nextSpace,
                nextProfile,
              ),
            );
          } catch (nextError) {
            if (!active) {
              return;
            }

            setError(
              getErrorMessage(
                nextError,
              ),
            );
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        }
      )();

      return () => {
        active = false;
      };
    },
    [
      spaceId,
    ],
  );

  const plan =
    useMemo(
      () =>
        form
          ? setupPlans[
              form.industry
            ]
          : setupPlans.general,
      [
        form,
      ],
    );

  function updateField<
    K extends keyof BusinessProfileInput,
  >(
    key: K,
    value: BusinessProfileInput[K],
  ) {
    setForm(
      (current) =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
    );
  }

  function continueWizard(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError('');

    if (!form) {
      return;
    }

    if (
      step === 1
      && !form.businessName.trim()
    ) {
      setError(
        'Business name is required.',
      );
      return;
    }

    if (step < 4) {
      setStep(
        (step + 1) as WizardStep,
      );
    }
  }

  async function finishWizard() {
    if (
      !space
      || !form
    ) {
      return;
    }

    if (!form.businessName.trim()) {
      setError(
        'Business name is required.',
      );
      setStep(1);
      return;
    }

    setBusy(true);
    setError('');

    try {
      await saveBusinessProfile(
        space.id,
        {
          ...form,
          businessName:
            form.businessName.trim(),
          registrationNumber:
            form.registrationNumber.trim(),
          address:
            form.address.trim(),
          phone:
            form.phone.trim(),
          email:
            form.email.trim(),
          invoicePrefix:
            form.invoicePrefix
              .trim()
              .toUpperCase()
              || 'INV',
        },
      );

      navigate(
        `/spaces/${space.id}?setup=complete`,
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
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading Business Setup…
        </div>
      </main>
    );
  }

  if (
    !space
    || space.type !== 'sme'
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business Setup"
          title="Business Space not found"
          description="Open a Business Space to use the Business Wizard."
        />

        <Link
          className="button primary"
          to="/spaces"
        >
          Back to Spaces
        </Link>
      </main>
    );
  }

  if (
    space.ownerId !== user?.uid
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business Setup"
          title={space.name}
          description="Only the Business owner can run the Business Setup Wizard."
          action={
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Business
            </Link>
          }
        />

        <div className="notice">
          Team members can continue using the Business tools they already have permission to access.
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="page">
        <div className="notice error">
          Business Setup could not be prepared.
        </div>
      </main>
    );
  }

  return (
    <main className="page business-wizard-page">
      <PageHeader
        eyebrow="Business Wizard"
        title={space.name}
        description="Set up the Business once, then use the same details across accounts, POS, invoices, accounting, tax and payroll."
        action={
          <Link
            className="button secondary"
            to={`/spaces/${space.id}`}
          >
            Exit setup
          </Link>
        }
      />

      <section className="panel guided-onboarding-v113">
        <div className="panel-heading">
          <div>
            <span className="step-pill">
              Step {step} of 4
            </span>

            <h2>
              {step === 1
                ? 'Tell us about the Business'
                : step === 2
                  ? 'Business contact details'
                  : step === 3
                    ? 'Money and document setup'
                    : 'Your Business setup plan'}
            </h2>
          </div>

          <span className="status-pill">
            Business Setup
          </span>
        </div>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <form
          className="form-stack"
          onSubmit={continueWizard}
        >
          {step === 1 && (
            <div className="form-grid">
              <label className="span-2">
                Business name

                <input
                  required
                  value={form.businessName}
                  onChange={
                    (event) =>
                      updateField(
                        'businessName',
                        event.target.value,
                      )
                  }
                  placeholder="Business name"
                />
              </label>

              <label className="span-2">
                Type of Business

                <select
                  value={form.industry}
                  onChange={
                    (event) =>
                      updateField(
                        'industry',
                        event.target.value as BusinessIndustry,
                      )
                  }
                >
                  {industries.map(
                    (industry) => (
                      <option
                        key={industry.value}
                        value={industry.value}
                      >
                        {industry.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {form.industry === 'marketplace' && (
                <label className="span-2">
                  What does this marketplace mainly sell?

                  <select
                    value={
                      form.marketplaceInventoryProfile
                      || 'general'
                    }
                    onChange={(event) => {
                      const selectedProfile =
                        marketplaceInventoryProfiles.find(
                          (option) =>
                            option.value === event.target.value,
                        )?.value
                        || 'general';

                      updateField(
                        'marketplaceInventoryProfile',
                        selectedProfile,
                      );
                    }}
                  >
                    {marketplaceInventoryProfiles.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>

                  <small>
                    BajetBN uses this as the default inventory
                    profile. You can change it later in
                    Business Setup.
                  </small>
                </label>
              )}

              <div className="notice span-2">
                BajetBN will recommend the most useful Business tools based on how this Business operates. All Business records remain attached to this Business Space.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <label>
                Registration number

                <input
                  value={
                    form.registrationNumber
                  }
                  onChange={
                    (event) =>
                      updateField(
                        'registrationNumber',
                        event.target.value,
                      )
                  }
                  placeholder="Optional"
                />
              </label>

              <label>
                Phone

                <input
                  value={form.phone}
                  onChange={
                    (event) =>
                      updateField(
                        'phone',
                        event.target.value,
                      )
                  }
                  placeholder="+673"
                />
              </label>

              <label className="span-2">
                Email

                <input
                  type="email"
                  value={form.email}
                  onChange={
                    (event) =>
                      updateField(
                        'email',
                        event.target.value,
                      )
                  }
                  placeholder="Optional"
                />
              </label>

              <label className="span-2">
                Business address

                <textarea
                  value={form.address}
                  onChange={
                    (event) =>
                      updateField(
                        'address',
                        event.target.value,
                      )
                  }
                  rows={3}
                  placeholder="Optional"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <label>
                Financial year starts

                <select
                  value={
                    form.fiscalYearStartMonth
                  }
                  onChange={
                    (event) =>
                      updateField(
                        'fiscalYearStartMonth',
                        Number(
                          event.target.value,
                        ),
                      )
                  }
                >
                  {[
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                  ].map(
                    (
                      month,
                      index,
                    ) => (
                      <option
                        key={month}
                        value={index + 1}
                      >
                        {month}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Invoice prefix

                <input
                  value={
                    form.invoicePrefix
                  }
                  onChange={
                    (event) =>
                      updateField(
                        'invoicePrefix',
                        event.target.value
                          .toUpperCase(),
                      )
                  }
                  maxLength={12}
                  placeholder="INV"
                />
              </label>

              <div className="notice span-2">
                Business Accounts stay separate from Personal money. After this Wizard, add the bank, cash, card or e-wallet accounts that belong to this Business.
              </div>
            </div>
          )}

          {step === 4 && (
            <>
              <section className="summary-grid">
                <article className="summary-card featured">
                  <span>
                    Business
                  </span>

                  <strong>
                    {form.businessName}
                  </strong>

                  <small>
                    {
                      industries.find(
                        (item) =>
                          item.value
                          === form.industry,
                      )?.label
                    }
                  </small>
                </article>

                <article className="summary-card">
                  <span>
                    Invoice prefix
                  </span>

                  <strong>
                    {form.invoicePrefix
                      || 'INV'}
                  </strong>

                  <small>
                    Reused by invoices
                  </small>
                </article>
              </section>

              <section className="panel">
                <span className="eyebrow">
                  Recommended setup
                </span>

                <h3>
                  {plan.headline}
                </h3>

                <p>
                  {plan.firstAction}
                </p>

                <div className="guided-setup-checklist">
                  {plan.tools.map(
                    (
                      tool,
                      index,
                    ) => (
                      <article
                        className="guided-setup-item"
                        key={tool}
                      >
                        <span>
                          {index + 1}
                        </span>

                        <div>
                          <strong>
                            {tool}
                          </strong>

                          <small>
                            Ready inside this Business Space
                          </small>
                        </div>

                        <em>
                          Next
                        </em>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <div className="notice">
                Finishing the Wizard saves this Business Profile. You can run Business Setup again later from Business Admin.
              </div>
            </>
          )}

          <div className="button-row">
            {step > 1 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={
                  () => {
                    setError('');
                    setStep(
                      (step - 1) as WizardStep,
                    );
                  }
                }
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                type="submit"
                className="button primary"
                disabled={busy}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={
                  () =>
                    void finishWizard()
                }
              >
                {busy
                  ? 'Saving Business Setup…'
                  : 'Finish Business Setup'}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
