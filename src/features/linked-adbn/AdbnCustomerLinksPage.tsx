import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
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
  getErrorMessage,
} from '../../utils/errors';

function needsDedicatedAdbnSpace(
  link: AdbnCustomerLink,
) {
  return (
    link.status === 'accepted'
    && (
      !link.targetSpaceId
      || link.targetSpaceType !== 'custom'
      || link.targetSpaceProvider !== 'adbn_tech'
    )
  );
}

export function AdbnCustomerLinksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [links, setLinks] =
    useState<AdbnCustomerLink[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState('');

  const [error, setError] =
    useState('');

  const [feedback, setFeedback] =
    useState('');

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
          let nextLinks =
            await listMyAdbnCustomerLinks();

          const legacyAccepted =
            nextLinks.filter(
              needsDedicatedAdbnSpace,
            );

          if (legacyAccepted.length > 0) {
            await Promise.all(
              legacyAccepted.map(
                (link) =>
                  respondAdbnCustomerLinkInvitation({
                    linkId: link.id,
                    decision: 'accept',
                  }),
              ),
            );

            nextLinks =
              await listMyAdbnCustomerLinks();
          }

          setLinks(nextLinks);
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
    setBusyId(link.id);
    setError('');
    setFeedback('');

    try {
      if (decision === 'accept') {
        const result =
          await respondAdbnCustomerLinkInvitation({
            linkId: link.id,
            decision: 'accept',
          });

        setFeedback(
          result.spaceCreated
            ? 'ADBN TECH link accepted. Your private ADBN TECH Space was created.'
            : 'ADBN TECH link accepted. Your private ADBN TECH Space is ready.',
        );

        await load();

        if (result.targetSpaceId) {
          navigate(
            '/spaces/'
            + result.targetSpaceId
            + '/adbn',
          );
        }
      } else {
        await respondAdbnCustomerLinkInvitation({
          linkId: link.id,
          decision: 'decline',
        });

        setFeedback(
          'ADBN TECH customer link declined.',
        );

        await load();
      }
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
        description="Accept an ADBN TECH invitation to create your private ADBN TECH Space for future invoices, monthly payments and reminders."
        action={
          <Link
            className="button secondary"
            to="/spaces"
          >
            My Spaces
          </Link>
        }
      />

      <div className="info-banner">
        <strong>
          Your Personal money stays private.
        </strong>
        <span>
          ADBN TECH gets its own dedicated BajetBN Space. Your Personal, Household and other Spaces, bank accounts, balances and transactions are not shared with ADBN TECH.
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
                          ADBN TECH Space
                        </strong>
                      </p>
                    )}
                </div>

                {link.status
                  === 'pending'
                  && (
                    <div
                      className="business-contact-actions"
                      data-adbn-dedicated-space-accept
                    >
                      <p>
                        Accepting creates a private ADBN TECH Space automatically. No Personal or Household Space is used.
                      </p>

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
                            ? 'Creating ADBN Space…'
                            : 'Accept & create ADBN Space'}
                        </button>
                      </div>
                    </div>
                  )}

                {link.status
                  === 'accepted'
                  && link.targetSpaceId
                  && (
                    <div className="business-contact-actions">
                      <Link
                        className="button primary"
                        to={
                          '/spaces/'
                          + link.targetSpaceId
                          + '/adbn'
                        }
                      >
                        Open ADBN TECH
                      </Link>
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
