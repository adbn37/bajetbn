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

import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';

import {
  createBusinessContact,
  getBusinessProfile,
  listBusinessContacts,
  saveBusinessProfile,
  setBusinessContactArchived,
  updateBusinessContact,
  type BusinessContactInput,
  type BusinessProfileInput,
} from '../../repositories/businessAdvancedRepository';

import { getSpace } from '../../repositories/spaceRepository';

import type {
  BusinessContact,
  BusinessIndustry,
  BusinessProfile,
  Space,
} from '../../types/models';

import { getErrorMessage } from '../../utils/errors';

type View =
  | 'overview'
  | 'profile'
  | 'contacts';

const emptyContact: BusinessContactInput = {
  kind: 'customer',
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

const industries: Array<{
  value: BusinessIndustry;
  label: string;
}> = [
  { value: 'general', label: 'General business' },
  { value: 'retail', label: 'Retail / shop' },
  { value: 'service', label: 'Services' },
  { value: 'marketplace', label: 'Marketplace / consignment' },
  { value: 'rental', label: 'Rental' },
  { value: 'transport_delivery', label: 'Transport / delivery' },
  { value: 'other', label: 'Other' },
];

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

export function BusinessAdvancedPage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [profile, setProfile] =
    useState<BusinessProfile | null>(null);

  const [contacts, setContacts] =
    useState<BusinessContact[]>([]);

  const [view, setView] =
    useState<View>('overview');

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [feedback, setFeedback] =
    useState('');

  const [showArchived, setShowArchived] =
    useState(false);

  const [editor, setEditor] =
    useState<BusinessContact | 'new' | null>(
      null,
    );

  const [contactForm, setContactForm] =
    useState<BusinessContactInput>(
      emptyContact,
    );

  const load = useCallback(
    async () => {
      if (!user || !spaceId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextSpace =
          await getSpace(spaceId);

        setSpace(nextSpace);

        if (
          !nextSpace
          || nextSpace.type !== 'sme'
        ) {
          setProfile(null);
          setContacts([]);
          return;
        }

        const [
          nextProfile,
          nextContacts,
        ] = await Promise.all([
          getBusinessProfile(spaceId),
          listBusinessContacts(spaceId),
        ]);

        setProfile(nextProfile);
        setContacts(nextContacts);
      } catch (nextError) {
        setError(
          getErrorMessage(nextError),
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
    [load],
  );

  const activeContacts =
    useMemo(
      () =>
        contacts.filter(
          (item) => !item.archivedAt,
        ),
      [contacts],
    );

  const archivedContacts =
    useMemo(
      () =>
        contacts.filter(
          (item) =>
            Boolean(item.archivedAt),
        ),
      [contacts],
    );

  const visibleContacts =
    showArchived
      ? archivedContacts
      : activeContacts;

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading Business Admin...
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
          eyebrow="Business"
          title="SME Space not found"
          description="Open an SME Space to use Business Admin."
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

  if (space.ownerId !== user?.uid) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business Admin"
          title={space.name}
          description="Advanced Business administration is currently restricted to the business owner."
          action={
            <Link
              className="button secondary"
              to={'/spaces/' + space.id}
            >
              Back to Space
            </Link>
          }
        />

        <div className="notice">
          Existing SME member and POS permissions remain unchanged.
        </div>
      </main>
    );
  }

  const openNewContact = () => {
    setContactForm({
      ...emptyContact,
    });

    setEditor('new');
    setError('');
  };

  const openContact = (
    item: BusinessContact,
  ) => {
    setContactForm({
      kind: item.kind,
      name: item.name,
      phone: item.phone,
      email: item.email,
      address: item.address,
      notes: item.notes,
    });

    setEditor(item);
    setError('');
  };

  const saveContact = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!contactForm.name.trim()) {
      setError(
        'Contact name is required.',
      );

      return;
    }

    setBusy(true);
    setError('');

    try {
      if (editor === 'new') {
        await createBusinessContact(
          space.id,
          contactForm,
        );

        setFeedback(
          'Business contact added.',
        );
      } else if (editor) {
        await updateBusinessContact(
          editor.id,
          contactForm,
        );

        setFeedback(
          'Business contact updated.',
        );
      }

      setEditor(null);
      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  };

  const changeArchive = async (
    item: BusinessContact,
    archived: boolean,
  ) => {
    setBusy(true);
    setError('');

    try {
      await setBusinessContactArchived(
        item.id,
        archived,
      );

      setFeedback(
        archived
          ? item.name + ' archived.'
          : item.name + ' restored.',
      );

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page business-admin-page">
      <PageHeader
        eyebrow="Advanced Business"
        title={space.name}
        description="Reusable business details and contacts for accounting, invoices, tax and payroll."
        action={
          <Link
            className="button secondary"
            to={'/spaces/' + space.id}
          >
            Back to Space
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

      <nav
        className="business-admin-tabs"
        aria-label="Business Admin"
      >
        <button
          type="button"
          className={
            view === 'overview'
              ? 'active'
              : ''
          }
          onClick={
            () => setView('overview')
          }
        >
          Overview
        </button>

        <button
          type="button"
          className={
            view === 'profile'
              ? 'active'
              : ''
          }
          onClick={
            () => setView('profile')
          }
        >
          Business Profile
        </button>

        <button
          type="button"
          className={
            view === 'contacts'
              ? 'active'
              : ''
          }
          onClick={
            () => setView('contacts')
          }
        >
          Customers & Vendors
        </button>
      </nav>

      {view === 'overview' && (
        <>
          <section className="summary-grid">
            <article className="summary-card featured">
              <span>
                Business profile
              </span>

              <strong>
                {profile
                  ? 'Ready'
                  : 'Set up'}
              </strong>

              <small>
                {profile?.businessName
                  || space.name}
              </small>
            </article>

            <article className="summary-card">
              <span>
                Contacts
              </span>

              <strong>
                {activeContacts.length}
              </strong>

              <small>
                Customers and vendors
              </small>
            </article>

            <article className="summary-card">
              <span>
                Industry
              </span>

              <strong>
                {profile?.industry
                  ?.replace(
                    'transport_delivery',
                    'transport',
                  )
                  || 'general'}
              </strong>

              <small>
                Business workflow profile
              </small>
            </article>

            <article className="summary-card">
              <span>
                Invoice prefix
              </span>

              <strong>
                {profile?.invoicePrefix
                  || 'INV'}
              </strong>

              <small>
                Reserved for invoices
              </small>
            </article>
          </section>

          <section className="panel business-admin-intro">
            <span className="eyebrow">
              Business foundation
            </span>

            <h2>
              One business record, reused everywhere
            </h2>

            <p>
              Business identity and contacts stay attached to this SME Space so later invoices, accounting, tax and payroll use the same source of truth.
            </p>

            <div className="button-row">
              <button
                type="button"
                className="button primary"
                onClick={
                  () => setView('profile')
                }
              >
                Business Profile
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={
                  () => setView('contacts')
                }
              >
                Manage Contacts
              </button>

              <Link
                className="button secondary"
                to={
                  '/spaces/'
                  + space.id
                  + '/business/invoices'
                }
              >
                Invoices
              </Link>
            </div>
          </section>
        </>
      )}

      {view === 'profile' && (
        <BusinessProfileEditor
          key={
            profile
              ? profile.id
                + String(
                    profile.updatedAt
                      ?.toMillis?.()
                    || '',
                  )
              : 'new'
          }
          space={space}
          profile={profile}
          busy={busy}
          onSave={
            async (input) => {
              setBusy(true);
              setError('');

              try {
                await saveBusinessProfile(
                  space.id,
                  input,
                );

                setFeedback(
                  'Business profile saved.',
                );

                await load();
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
          }
        />
      )}

      {view === 'contacts' && (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">
                  Customers & vendors
                </span>

                <h2>
                  {showArchived
                    ? 'Archived contacts'
                    : 'Business contacts'}
                </h2>

                <p>
                  Keep customer and vendor details reusable instead of typing them again for every business record.
                </p>
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={
                    () =>
                      setShowArchived(
                        (value) => !value,
                      )
                  }
                >
                  {showArchived
                    ? 'Active'
                    : 'Archived'}
                </button>

                {!showArchived && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={
                      openNewContact
                    }
                  >
                    Add Contact
                  </button>
                )}
              </div>
            </div>

            {!showArchived && editor && (
              <form
                className="form-grid business-contact-editor"
                onSubmit={saveContact}
              >
                <label>
                  Type
                  <select
                    value={contactForm.kind}
                    onChange={
                      (event) =>
                        setContactForm(
                          (current) => ({
                            ...current,
                            kind:
                              event.target.value as BusinessContactInput['kind'],
                          }),
                        )
                    }
                  >
                    <option value="customer">
                      Customer
                    </option>

                    <option value="vendor">
                      Vendor
                    </option>

                    <option value="both">
                      Customer & vendor
                    </option>
                  </select>
                </label>

                <label>
                  Name
                  <input
                    required
                    maxLength={120}
                    value={contactForm.name}
                    onChange={
                      (event) =>
                        setContactForm(
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
                  Phone
                  <input
                    maxLength={80}
                    value={contactForm.phone}
                    onChange={
                      (event) =>
                        setContactForm(
                          (current) => ({
                            ...current,
                            phone:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    maxLength={160}
                    value={contactForm.email}
                    onChange={
                      (event) =>
                        setContactForm(
                          (current) => ({
                            ...current,
                            email:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label className="span-2">
                  Address
                  <textarea
                    maxLength={500}
                    value={contactForm.address}
                    onChange={
                      (event) =>
                        setContactForm(
                          (current) => ({
                            ...current,
                            address:
                              event.target.value,
                          }),
                        )
                    }
                  />
                </label>

                <label className="span-2">
                  Notes
                  <textarea
                    maxLength={1000}
                    value={contactForm.notes}
                    onChange={
                      (event) =>
                        setContactForm(
                          (current) => ({
                            ...current,
                            notes:
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
                      : 'Save Contact'}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={
                      () => setEditor(null)
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {visibleContacts.length === 0 ? (
              <div className="mini-empty">
                <h3>
                  {showArchived
                    ? 'No archived contacts'
                    : 'No business contacts yet'}
                </h3>

                <p>
                  {showArchived
                    ? 'Archived customer and vendor records will appear here.'
                    : 'Add your first customer or vendor.'}
                </p>

                {!showArchived && !editor && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={openNewContact}
                  >
                    Add Contact
                  </button>
                )}
              </div>
            ) : (
              <div className="business-contact-list">
                {visibleContacts.map(
                  (item) => (
                    <article
                      className="business-contact-card"
                      key={item.id}
                    >
                      <div>
                        <div className="business-contact-meta">
                          <span>
                            {item.displayId}
                          </span>

                          <span>
                            {item.kind === 'both'
                              ? 'customer & vendor'
                              : item.kind}
                          </span>
                        </div>

                        <h3>
                          {item.name}
                        </h3>

                        <p>
                          {[
                            item.phone,
                            item.email,
                            item.address,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                            || 'No contact details saved'}
                        </p>
                      </div>

                      <div className="button-row">
                        {!item.archivedAt && (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={
                              () =>
                                openContact(item)
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          type="button"
                          className={
                            item.archivedAt
                              ? 'button primary'
                              : 'text-button danger'
                          }
                          disabled={busy}
                          onClick={
                            () =>
                              void changeArchive(
                                item,
                                !item.archivedAt,
                              )
                          }
                        >
                          {item.archivedAt
                            ? 'Restore'
                            : 'Archive'}
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function BusinessProfileEditor({
  space,
  profile,
  busy,
  onSave,
}: {
  space: Space;
  profile: BusinessProfile | null;
  busy: boolean;
  onSave:
    (
      input: BusinessProfileInput,
    ) => Promise<void>;
}) {
  const [form, setForm] =
    useState<BusinessProfileInput>(
      () =>
        profileInput(
          space,
          profile,
        ),
    );

  const submit = (
    event: FormEvent,
  ) => {
    event.preventDefault();
    void onSave(form);
  };

  return (
    <section className="panel">
      <span className="eyebrow">
        Business identity
      </span>

      <h2>
        Business Profile
      </h2>

      <p>
        The same profile will be used by the business modules attached to this SME Space.
      </p>

      <form
        className="form-grid"
        onSubmit={submit}
      >
        <label>
          Business name
          <input
            required
            maxLength={160}
            value={form.businessName}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    businessName:
                      event.target.value,
                  }),
                )
            }
          />
        </label>

        <label>
          Business type
          <select
            value={form.industry}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    industry:
                      event.target.value as BusinessIndustry,
                  }),
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

        <label>
          Registration number
          <input
            maxLength={100}
            value={form.registrationNumber}
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

        <label>
          Phone
          <input
            maxLength={80}
            value={form.phone}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    phone:
                      event.target.value,
                  }),
                )
            }
          />
        </label>

        <label>
          Email
          <input
            type="email"
            maxLength={160}
            value={form.email}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    email:
                      event.target.value,
                  }),
                )
            }
          />
        </label>

        <label>
          Fiscal year starts
          <select
            value={form.fiscalYearStartMonth}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    fiscalYearStartMonth:
                      Number(
                        event.target.value,
                      ),
                  }),
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
              (month, index) => (
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
            required
            maxLength={12}
            value={form.invoicePrefix}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    invoicePrefix:
                      event.target.value
                        .replace(
                          /[^a-zA-Z0-9-]/g,
                          '',
                        )
                        .toUpperCase(),
                  }),
                )
            }
          />
        </label>

        <label className="span-2">
          Address
          <textarea
            maxLength={800}
            value={form.address}
            onChange={
              (event) =>
                setForm(
                  (current) => ({
                    ...current,
                    address:
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
              : 'Save Business Profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
