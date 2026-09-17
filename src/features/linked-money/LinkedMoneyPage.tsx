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
  listPersonalAccounts,
} from '../../repositories/accountRepository';

import {
  listLinkedMoneyOffers,
  respondLinkedMoneyOffer,
} from '../../repositories/linkedMoneyRepository';

import {
  listSpaces,
} from '../../repositories/spaceRepository';

import type {
  Account,
  LinkedMoneyOffer,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

import {
  formatMoney,
} from '../../utils/money';

function offerKindLabel(
  offer: LinkedMoneyOffer,
) {
  return offer.kind === 'salary'
    ? 'Salary'
    : 'Seller payout';
}

export function LinkedMoneyPage() {
  const {
    user,
  } = useAuth();

  const [
    offers,
    setOffers,
  ] = useState<LinkedMoneyOffer[]>(
    [],
  );

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>(
    [],
  );

  const [
    personalSpace,
    setPersonalSpace,
  ] = useState<Space | null>(
    null,
  );

  const [
    selectedAccounts,
    setSelectedAccounts,
  ] = useState<
    Record<string, string>
  >(
    {},
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busyId,
    setBusyId,
  ] = useState('');

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
        if (!user) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const [
            nextOffers,
            nextAccounts,
            nextSpaces,
          ] =
            await Promise.all([
              listLinkedMoneyOffers(),
              listPersonalAccounts(
                user.uid,
              ),
              listSpaces(
                user.uid,
              ),
            ]);

          const nextPersonalSpace =
            nextSpaces.find(
              (space) =>
                space.type
                  === 'personal'
                && !space.archivedAt,
            ) || null;

          setOffers(
            nextOffers,
          );

          setAccounts(
            nextAccounts.filter(
              (account) =>
                !account.archivedAt
                && !account.closedAt,
            ),
          );

          setPersonalSpace(
            nextPersonalSpace,
          );

          setSelectedAccounts(
            (current) => {
              const next = {
                ...current,
              };

              nextOffers.forEach(
                (offer) => {
                  if (
                    offer.status
                      !== 'pending'
                    || next[offer.id]
                  ) {
                    return;
                  }

                  next[offer.id] =
                    nextAccounts.find(
                      (account) =>
                        !account.archivedAt
                        && !account.closedAt
                        && account.currency
                          === offer.currency,
                    )?.id
                    || '';
                },
              );

              return next;
            },
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
        user,
      ],
    );

  useEffect(
    () => {
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) {
          void load();
        }
      });

      return () => {
        cancelled = true;
      };
    },
    [
      load,
    ],
  );

  const pendingCount =
    useMemo(
      () =>
        offers.filter(
          (offer) =>
            offer.status
              === 'pending',
        ).length,
      [
        offers,
      ],
    );

  async function accept(
    offer: LinkedMoneyOffer,
  ) {
    if (!personalSpace) {
      setError(
        'Your Personal Space is unavailable.',
      );
      return;
    }

    const accountId =
      selectedAccounts[
        offer.id
      ]
      || '';

    if (!accountId) {
      setError(
        'Choose a Personal account for this payment.',
      );
      return;
    }

    setBusyId(
      offer.id,
    );
    setError('');
    setFeedback('');

    try {
      await respondLinkedMoneyOffer({
        offerId:
          offer.id,
        decision:
          'accept',
        accountId,
        personalSpaceId:
          personalSpace.id,
      });

      setFeedback(
        'Payment added to your Personal Money activity.',
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
      setBusyId('');
    }
  }

  async function decline(
    offer: LinkedMoneyOffer,
  ) {
    setBusyId(
      offer.id,
    );
    setError('');
    setFeedback('');

    try {
      await respondLinkedMoneyOffer({
        offerId:
          offer.id,
        decision:
          'decline',
      });

      setFeedback(
        'Payment link declined. The Business payment itself was not changed.',
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
      setBusyId('');
    }
  }

  return (
    <main
      className="page"
      data-linked-money-page
    >
      <PageHeader
        eyebrow="Linked money"
        title="Payments sent to you"
        description="A Business can tell BajetBN that it paid you. You choose whether to add that payment to your Personal Money records."
        action={
          <Link
            className="button secondary"
            to="/transactions"
          >
            Personal Money
          </Link>
        }
      />

      <div className="info-banner">
        <strong>
          BajetBN does not move the bank money.
        </strong>
        <span>
          This only links a Business payment to your Personal records. Joining or linking is optional.
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
          Loading linked payments...
        </div>
      ) : offers.length === 0 ? (
        <div className="mini-empty">
          <h3>No linked payments</h3>
          <p>
            Salary or Marketplace payouts will appear here only when the Business has linked your existing BajetBN account.
          </p>
        </div>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card featured">
              <span>Waiting for you</span>
              <strong>{pendingCount}</strong>
              <small>Choose whether to add these to Personal Money.</small>
            </article>

            <article className="summary-card">
              <span>Total linked records</span>
              <strong>{offers.length}</strong>
              <small>Pending, accepted and declined.</small>
            </article>
          </section>

          <div className="business-contact-list">
            {offers.map(
              (offer) => {
                const compatibleAccounts =
                  accounts.filter(
                    (account) =>
                      account.currency
                        === offer.currency,
                  );

                return (
                  <article
                    className="business-contact-card"
                    key={offer.id}
                  >
                    <div>
                      <small>
                        {offerKindLabel(offer)}
                        {' · '}
                        {offer.transactionDate}
                      </small>

                      <h3>
                        {offer.sourceSpaceName}
                      </h3>

                      <strong>
                        {formatMoney(
                          offer.amountMinor,
                          offer.currency,
                        )}
                      </strong>

                      <p>
                        For {offer.recipientName}
                      </p>

                      <span className="status-pill">
                        {offer.status}
                      </span>
                    </div>

                    {offer.status === 'pending' && (
                      <div className="business-contact-actions">
                        {personalSpace
                          && compatibleAccounts.length > 0 ? (
                            <label>
                              Personal account
                              <select
                                value={
                                  selectedAccounts[
                                    offer.id
                                  ]
                                  || ''
                                }
                                onChange={
                                  (event) =>
                                    setSelectedAccounts(
                                      (current) => ({
                                        ...current,
                                        [offer.id]:
                                          event.target.value,
                                      }),
                                    )
                                }
                              >
                                {compatibleAccounts.map(
                                  (account) => (
                                    <option
                                      key={account.id}
                                      value={account.id}
                                    >
                                      {account.name}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                          ) : (
                            <p>
                              Create an active Personal account using {offer.currency} before accepting.
                            </p>
                          )}

                        <div className="modal-actions">
                          <button
                            type="button"
                            className="button secondary"
                            disabled={
                              busyId === offer.id
                            }
                            onClick={
                              () =>
                                void decline(
                                  offer,
                                )
                            }
                          >
                            Don't add
                          </button>

                          <button
                            type="button"
                            className="button primary"
                            disabled={
                              busyId === offer.id
                              || !personalSpace
                              || compatibleAccounts.length
                                === 0
                              || !selectedAccounts[
                                offer.id
                              ]
                            }
                            onClick={
                              () =>
                                void accept(
                                  offer,
                                )
                            }
                          >
                            Add to Personal Money
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </div>
        </>
      )}
    </main>
  );
}
