import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  useAuth,
} from '../../contexts/AuthContext';

import {
  listMyAdbnCustomerLinks,
  respondAdbnCustomerLinkInvitation,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';

import {
  listSpaces,
} from '../../repositories/spaceRepository';

import type {
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

export function AdbnCustomerLinksPage() {
  const { user } = useAuth();

  const [links, setLinks] =
    useState<AdbnCustomerLink[]>([]);

  const [spaces, setSpaces] =
    useState<Space[]>([]);

  const [
    selectedSpaces,
    setSelectedSpaces,
  ] = useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState('');

  const [error, setError] =
    useState('');

  const [feedback, setFeedback] =
    useState('');

  const eligibleSpaces =
    useMemo(
      () =>
        spaces.filter(
          (space) =>
            !space.archivedAt
            && space.ownerId
              === user?.uid
            && (
              space.type
                === 'personal'
              || space.type
                === 'household'
            ),
        ),
      [spaces, user],
    );

  const load =
    useCallback(
      async () => {
        if (!user) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const [
            nextLinks,
            nextSpaces,
          ] =
            await Promise.all([
              listMyAdbnCustomerLinks(),
              listSpaces(user.uid),
            ]);

          setLinks(nextLinks);
          setSpaces(nextSpaces);

          const eligible =
            nextSpaces.filter(
              (space) =>
                !space.archivedAt
                && space.ownerId
                  === user.uid
                && (
                  space.type
                    === 'personal'
                  || space.type
                    === 'household'
                ),
            );

          const preferred =
            eligible.find(
              (space) =>
                space.type
                  === 'personal',
            )
            || eligible[0]
            || null;

          setSelectedSpaces(
            (current) => {
              const next = {
                ...current,
              };

              nextLinks.forEach(
                (link) => {
                  if (
                    link.status
                      !== 'pending'
                    || next[link.id]
                  ) {
                    return;
                  }

                  next[link.id] =
                    preferred?.id
                    || '';
                },
              );

              return next;
            },
          );
        } catch (nextError) {
          setError(
            getErrorMessage(
              nextError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [user],
    );

  useEffect(
    () => {
      let cancelled = false;

      queueMicrotask(
        () => {
          if (!cancelled) {
            void load();
          }
        },
      );

      return () => {
        cancelled = true;
      };
    },
    [load],
  );

  async function respond(
    link: AdbnCustomerLink,
    decision:
      | 'accept'
      | 'decline',
  ) {
    const targetSpaceId =
      selectedSpaces[link.id]
      || '';

    if (
      decision === 'accept'
      && !targetSpaceId
    ) {
      setError(
        'Choose a Personal or Household Space first.',
      );
      return;
    }

    setBusyId(link.id);
    setError('');
    setFeedback('');

    try {
      if (decision === 'accept') {
        await respondAdbnCustomerLinkInvitation({
          linkId: link.id,
          decision: 'accept',
          targetSpaceId,
        });

        setFeedback(
          'ADBN TECH customer link accepted. No invoice or payment was copied yet.',
        );
      } else {
        await respondAdbnCustomerLinkInvitation({
          linkId: link.id,
          decision: 'decline',
        });

        setFeedback(
          'ADBN TECH customer link declined.',
        );
      }

      await load();
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
        ),
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <main
      className="page"
      data-adbn-customer-links-page
    >
      <PageHeader
        eyebrow="ADBN TECH"
        title="Customer links"
        description="Choose whether ADBN TECH can link your customer account to Bills & Instalments in one of your own Spaces."
        action={
          <Link
            className="button secondary"
            to="/bills"
          >
            Bills & Instalments
          </Link>
        }
      />

      <div className="info-banner">
        <strong>
          Your Personal money stays private.
        </strong>
        <span>
          ADBN TECH can only know that you accepted this customer link and which Personal or Household Space should receive future ADBN billing records. Your bank accounts, balances, transactions and other BajetBN records are not shared with ADBN TECH.
        </span>
      </div>

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

      {loading ? (
        <div className="loading-panel">
          Loading ADBN TECH customer links…
        </div>
      ) : links.length === 0 ? (
        <div className="mini-empty">
          <h3>
            No ADBN TECH customer links
          </h3>
          <p>
            A link will appear here only when ADBN TECH sends an invitation to your verified BajetBN email address.
          </p>
        </div>
      ) : (
        <div className="business-contact-list">
          {links.map(
            (link) => (
              <article
                className="business-contact-card"
                key={link.id}
                data-adbn-customer-link-card
              >
                <div>
                  <small>
                    {link.businessSpaceName
                      || 'ADBN TECH'}
                  </small>

                  <h3>
                    {link.customerName}
                  </h3>

                  <p>
                    Customer{' '}
                    {link.customerNo
                      || link.adbnCustomerId}
                  </p>

                  <span className="status-pill">
                    {link.status}
                  </span>

                  {link.status
                    === 'accepted'
                    && (
                      <p>
                        Linked to{' '}
                        <strong>
                          {link.targetSpaceName
                            || 'your selected Space'}
                        </strong>
                      </p>
                    )}
                </div>

                {link.status
                  === 'pending'
                  && (
                    <div className="business-contact-actions">
                      {eligibleSpaces.length > 0 ? (
                        <label>
                          Future ADBN bills should appear in
                          <select
                            value={
                              selectedSpaces[
                                link.id
                              ]
                              || ''
                            }
                            onChange={
                              (event) =>
                                setSelectedSpaces(
                                  (current) => ({
                                    ...current,
                                    [link.id]:
                                      event.target.value,
                                  }),
                                )
                            }
                          >
                            {eligibleSpaces.map(
                              (space) => (
                                <option
                                  key={space.id}
                                  value={space.id}
                                >
                                  {space.name}
                                  {' · '}
                                  {space.type
                                    === 'personal'
                                    ? 'Personal'
                                    : 'Household'}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      ) : (
                        <p>
                          You need an active Personal or Household Space that you own before accepting this link.
                        </p>
                      )}

                      <div className="modal-actions">
                        <button
                          type="button"
                          className="button secondary"
                          disabled={
                            busyId === link.id
                          }
                          onClick={
                            () =>
                              void respond(
                                link,
                                'decline',
                              )
                          }
                        >
                          Decline
                        </button>

                        <button
                          type="button"
                          className="button primary"
                          disabled={
                            busyId === link.id
                            || eligibleSpaces.length
                              === 0
                            || !selectedSpaces[
                              link.id
                            ]
                          }
                          onClick={
                            () =>
                              void respond(
                                link,
                                'accept',
                              )
                          }
                        >
                          {busyId === link.id
                            ? 'Saving…'
                            : 'Accept link'}
                        </button>
                      </div>
                    </div>
                  )}
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}
