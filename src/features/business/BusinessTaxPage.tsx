import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  Link,
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
  saveBusinessTaxSettings,
} from '../../repositories/businessAdvancedRepository';

import {
  listBusinessInvoices,
} from '../../repositories/businessInvoiceRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  BusinessInvoice,
  BusinessProfile,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

interface TaxForm {
  enabled: boolean;
  name: string;
  rate: string;
  registrationNumber: string;
}

function money(
  amountMinor: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(
    amountMinor / 100,
  );
}

function formFromProfile(
  profile:
    BusinessProfile | null,
): TaxForm {
  const rate =
    (
      (
        profile?.taxRateBps
        || 0
      ) / 100
    )
      .toFixed(2)
      .replace(
        /\.00$/,
        '',
      );

  return {
    enabled:
      Boolean(
        profile?.taxEnabled,
      ),
    name:
      profile?.taxName
      || 'Tax',
    rate,
    registrationNumber:
      profile?.taxRegistrationNumber
      || '',
  };
}

export function BusinessTaxPage() {
  const {
    user,
  } = useAuth();

  const {
    spaceId = '',
  } = useParams();

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
    invoices,
    setInvoices,
  ] = useState<BusinessInvoice[]>(
    [],
  );

  const [
    form,
    setForm,
  ] = useState<TaxForm>(
    formFromProfile(
      null,
    ),
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

  const [
    feedback,
    setFeedback,
  ] = useState('');

  const load =
    useCallback(
      async () => {
        if (
          !user
          || !spaceId
        ) {
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

          setSpace(
            nextSpace,
          );

          if (
            !nextSpace
            || nextSpace.type
              !== 'sme'
            || nextSpace.ownerId
              !== user.uid
          ) {
            return;
          }

          const [
            nextProfile,
            nextInvoices,
          ] =
            await Promise.all([
              getBusinessProfile(
                spaceId,
              ),
              listBusinessInvoices(
                user.uid,
                spaceId,
              ),
            ]);

          setProfile(
            nextProfile,
          );

          setForm(
            formFromProfile(
              nextProfile,
            ),
          );

          setInvoices(
            nextInvoices,
          );
        } catch (
          nextError
        ) {
          setError(
            getErrorMessage(
              nextError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [
        spaceId,
        user,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  const trackedInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            invoice.status
              !== 'draft'
            && invoice.status
              !== 'cancelled',
        ),
      [
        invoices,
      ],
    );

  const taxInvoicedMinor =
    useMemo(
      () =>
        trackedInvoices.reduce(
          (
            total,
            invoice,
          ) =>
            total
            + invoice.taxMinor,
          0,
        ),
      [
        trackedInvoices,
      ],
    );

  const paidInvoiceTaxMinor =
    useMemo(
      () =>
        trackedInvoices.reduce(
          (
            total,
            invoice,
          ) =>
            invoice.status
              === 'paid'
              ? total
                + invoice.taxMinor
              : total,
          0,
        ),
      [
        trackedInvoices,
      ],
    );

  const openInvoiceTaxMinor =
    useMemo(
      () =>
        trackedInvoices.reduce(
          (
            total,
            invoice,
          ) =>
            (
              invoice.status === 'issued'
              || invoice.status
                === 'partially_paid'
            )
              ? total
                + invoice.taxMinor
              : total,
          0,
        ),
      [
        trackedInvoices,
      ],
    );

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!profile) {
      setError(
        'Set up the Business Profile before configuring tax.',
      );
      return;
    }

    const rate =
      Number(
        form.rate,
      );

    if (
      !Number.isFinite(rate)
      || rate < 0
      || rate > 100
    ) {
      setError(
        'Tax rate must be between 0% and 100%.',
      );
      return;
    }

    if (
      form.enabled
      && !form.name.trim()
    ) {
      setError(
        'Enter a tax name before enabling invoice tax.',
      );
      return;
    }

    setBusy(true);
    setError('');
    setFeedback('');

    try {
      await saveBusinessTaxSettings(
        spaceId,
        {
          taxEnabled:
            form.enabled,
          taxName:
            form.name,
          taxRateBps:
            Math.round(
              rate * 100,
            ),
          taxRegistrationNumber:
            form.registrationNumber,
        },
      );

      setFeedback(
        'Business tax settings saved.',
      );

      await load();
    } catch (
      nextError
    ) {
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
          Loading business tax...
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
          eyebrow="Business tax"
          title="SME Space not found"
          description="Open an SME Space to configure business tax."
        />
      </main>
    );
  }

  if (
    space.ownerId
    !== user?.uid
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business tax"
          title={space.name}
          description="Business tax settings are restricted to the business owner."
          action={
            <Link
              className="button secondary"
              to={`/spaces/${space.id}`}
            >
              Back to Space
            </Link>
          }
        />
      </main>
    );
  }

  const currency =
    space.currency
    || 'BND';

  return (
    <main
      className="page"
      data-business-tax
    >
      <PageHeader
        eyebrow="Business tax"
        title={space.name}
        description="Configure the business invoice tax and review tax values captured on issued invoices."
        action={
          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business`}
          >
            Business Admin
          </Link>
        }
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {feedback && (
        <div className="notice success">
          {feedback}
        </div>
      )}

      {!profile ? (
        <section className="panel">
          <h2>
            Business Profile required
          </h2>

          <p>
            Create the Business Profile before enabling invoice tax.
          </p>

          <Link
            className="button primary"
            to={`/spaces/${space.id}/business`}
          >
            Open Business Profile
          </Link>
        </section>
      ) : (
        <>
          <section className="panel">
            <span className="eyebrow">
              Tax configuration
            </span>

            <h2>
              Invoice tax settings
            </h2>

            <form
              className="form-grid"
              onSubmit={submit}
            >
              <label className="span-2">
                <span>
                  Apply tax to business invoices
                </span>

                <input
                  type="checkbox"
                  checked={
                    form.enabled
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          enabled:
                            event.target.checked,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Tax name

                <input
                  maxLength={80}
                  value={
                    form.name
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          name:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label>
                Tax rate (%)

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    form.rate
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          rate:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <label className="span-2">
                Tax registration number

                <input
                  maxLength={100}
                  value={
                    form.registrationNumber
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          registrationNumber:
                            event.target.value,
                        }),
                      )
                  }
                />
              </label>

              <div className="button-row span-2">
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy}
                >
                  {busy
                    ? 'Saving...'
                    : 'Save Tax Settings'}
                </button>
              </div>
            </form>
          </section>

          <section className="summary-grid">
            <article className="summary-card featured">
              <span>
                Tax status
              </span>

              <strong>
                {profile.taxEnabled
                  ? 'Enabled'
                  : 'Off'}
              </strong>

              <small>
                {profile.taxEnabled
                  ? (
                      `${profile.taxName || 'Tax'} `
                      + `${(profile.taxRateBps || 0) / 100}%`
                    )
                  : 'No invoice tax configured'}
              </small>
            </article>

            <article className="summary-card">
              <span>
                Tax invoiced
              </span>

              <strong>
                {money(
                  taxInvoicedMinor,
                  currency,
                )}
              </strong>

              <small>
                Issued and paid invoices
              </small>
            </article>

            <article className="summary-card">
              <span>
                Paid invoice tax
              </span>

              <strong>
                {money(
                  paidInvoiceTaxMinor,
                  currency,
                )}
              </strong>

              <small>
                Tax value on fully paid invoices
              </small>
            </article>

            <article className="summary-card">
              <span>
                Open invoice tax
              </span>

              <strong>
                {money(
                  openInvoiceTaxMinor,
                  currency,
                )}
              </strong>

              <small>
                Tax value on open invoices
              </small>
            </article>
          </section>

          <div className="notice">
            These figures are business tracking records.
            They are not a statutory tax filing or professional tax advice.
          </div>
        </>
      )}
    </main>
  );
}