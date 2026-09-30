import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listAccountsForOwnerSpace,
} from '../../repositories/accountRepository';
import {
  ADBN_TECH_ADMIN_EMAIL,
  connectAdbnTechReadOnly,
  createAdbnTechPaymentReceiptShare,
  getAdbnTechConnectedEmail,
  loadAdbnTechPaymentsReadOnly,
  loadAdbnTechReadOnlySnapshot,
  type AdbnTechCustomerMirror,
  type AdbnTechPaymentMirror,
  type AdbnTechPaymentsReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
  setAdbnTechAccountMappings,
  setAdbnTechPaymentAutoSync,
} from '../../repositories/spaceRepository';
import {
  adbnPaymentCanPost,
  adbnPaymentPostingIssue,
  adbnPaymentSyncLabel,
  adbnPaymentTransactionMatches,
  autoSyncNewAdbnTechPaymentsToBajetBn,
  findPostedAdbnPaymentTransaction,
  findStalePostedAdbnPaymentTransactions,
  reconcileAdbnTechPaymentToBajetBn,
  syncAdbnTechPaymentToBajetBn,
} from '../../repositories/adbnTechPaymentSyncRepository';
import {
  listBusinessTransactionsForSpace,
} from '../../repositories/transactionRepository';
import {
  reverseStaleAdbnPaymentMoneyActivity,
} from '../../repositories/businessMoneyActivityRepository';
import {
  createAdbnCustomerLinkInvitation,
  listAdbnCustomerLinksForBusiness,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';
import type {
  Account,
  FinancialTransaction,
} from '../../types/models';

type PaymentViewFilter =
  | 'all'
  | 'attention'
  | 'ready'
  | 'synced'
  | 'changed'
  | 'blocked';

function bnd(value: number) {
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency: 'BND',
  }).format(value || 0);
}

function simpleDate(value: string) {
  if (!value) return '—';

  const parsed = new Date(
    value
    + (
      value.length === 10
        ? 'T00:00:00'
        : ''
    ),
  );

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    },
  ).format(parsed);
}

function whatsappNumber(
  value: string,
) {
  let digits =
    value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (
    digits.startsWith('00')
  ) {
    digits =
      digits.slice(2);
  }

  if (
    digits.startsWith('0')
  ) {
    digits =
      '673'
      + digits.slice(1);
  }

  if (
    digits.length <= 8
    && !digits.startsWith('673')
  ) {
    digits =
      '673'
      + digits;
  }

  return digits;
}

function accountLabel(
  account: {
    accountName: string;
    bankName: string;
    accountType: string;
    id: string;
  },
) {
  return (
    account.accountName
    || account.bankName
    || account.accountType
    || account.id
  );
}

function simpleDateTime(
  value: string,
) {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-BN',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(parsed);
}

export function AdbnTechPaymentsWorkspace({
  spaceId,
  onFinancialSync,
}: {
  spaceId: string;
  onFinancialSync?: () => void | Promise<void>;
}) {
  const { user } = useAuth();

  const [connectedEmail, setConnectedEmail] =
    useState(() => getAdbnTechConnectedEmail());

  const [snapshot, setSnapshot] =
    useState<AdbnTechPaymentsReadOnlySnapshot | null>(
      null,
    );

  const [bajetAccounts, setBajetAccounts] =
    useState<Account[]>([]);

  const [mappings, setMappings] =
    useState<Record<string, string>>({});

  const [savedMappings, setSavedMappings] =
    useState<Record<string, string>>({});

  const [spaceOwnerId, setSpaceOwnerId] =
    useState('');

  const [
    businessTransactions,
    setBusinessTransactions,
  ] = useState<FinancialTransaction[]>([]);

  const [
    customerLinks,
    setCustomerLinks,
  ] = useState<AdbnCustomerLink[]>([]);

  const [
    adbnCustomers,
    setAdbnCustomers,
  ] = useState<AdbnTechCustomerMirror[]>([]);

  const [
    receiptShareBusyPaymentId,
    setReceiptShareBusyPaymentId,
  ] = useState('');

  const [query, setQuery] =
    useState('');

  const [
    paymentViewFilter,
    setPaymentViewFilter,
  ] = useState<PaymentViewFilter>('all');

  const [loading, setLoading] =
    useState(false);

  const [mappingBusy, setMappingBusy] =
    useState(false);

  const [
    syncBusyPaymentId,
    setSyncBusyPaymentId,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [mappingMessage, setMappingMessage] =
    useState('');

  const [syncMessage, setSyncMessage] =
    useState('');

  const [
    autoSyncEnabled,
    setAutoSyncEnabled,
  ] = useState(false);

  const [
    autoSyncCutoffIso,
    setAutoSyncCutoffIso,
  ] = useState('');

  const [autoSyncBusy, setAutoSyncBusy] =
    useState(false);

  const [autoSyncMessage, setAutoSyncMessage] =
    useState('');

  const [
    staleReverseConfirmId,
    setStaleReverseConfirmId,
  ] = useState('');

  const [
    staleReverseBusyId,
    setStaleReverseBusyId,
  ] = useState('');

  const autoSyncRunRef =
    useRef('');

  const loadBajetBnSide = useCallback(
    async () => {
      if (!user?.uid) return;

      try {
        const [
          nextAccounts,
          nextSpace,
          nextTransactions,
          nextCustomerLinks,
        ] = await Promise.all([
          listAccountsForOwnerSpace(
            user.uid,
            spaceId,
          ),
          getSpace(spaceId),
          listBusinessTransactionsForSpace(
            spaceId,
          ),
          listAdbnCustomerLinksForBusiness(
            spaceId,
          ),
        ]);

        const nextMappings =
          nextSpace?.externalIntegrationAccountMappings
          || {};

        setBajetAccounts(nextAccounts);
        setMappings(nextMappings);
        setSavedMappings(nextMappings);
        setSpaceOwnerId(
          nextSpace?.ownerId || '',
        );
        setBusinessTransactions(
          nextTransactions,
        );
        setCustomerLinks(
          nextCustomerLinks,
        );

        setAutoSyncEnabled(
          nextSpace
            ?.externalIntegrationPaymentAutoSyncEnabled
          === true,
        );

        setAutoSyncCutoffIso(
          nextSpace
            ?.externalIntegrationPaymentAutoSyncCutoffIso
          || '',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'BajetBN account mapping could not be loaded.',
        );
      }
    },
    [spaceId, user?.uid],
  );

  const loadPayments = useCallback(
    async () => {
      if (
        getAdbnTechConnectedEmail()
        !== ADBN_TECH_ADMIN_EMAIL
      ) {
        setConnectedEmail('');
        setSnapshot(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [
          next,
          customerSnapshot,
        ] = await Promise.all([
          loadAdbnTechPaymentsReadOnly(),
          loadAdbnTechReadOnlySnapshot(),
        ]);

        setSnapshot(next);
        setAdbnCustomers(
          customerSnapshot.customers,
        );
        setConnectedEmail(
          next.connectedEmail,
        );

        await markAdbnTechIntegrationConnected(
          spaceId,
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payments could not be loaded.',
        );
      } finally {
        setLoading(false);
      }
    },
    [spaceId],
  );

  useEffect(() => {
    void loadBajetBnSide();
  }, [loadBajetBnSide]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const connect = async () => {
    setLoading(true);
    setError('');

    try {
      const email =
        await connectAdbnTechReadOnly();

      setConnectedEmail(email);

      await markAdbnTechIntegrationConnected(
        spaceId,
      );

      await loadPayments();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH connection failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMapping = (
    adbnAccountId: string,
    bajetAccountId: string,
  ) => {
    setMappingMessage('');

    setMappings((current) => ({
      ...current,
      [adbnAccountId]:
        bajetAccountId,
    }));
  };

  const saveMappings = async () => {
    setMappingBusy(true);
    setMappingMessage('');
    setError('');

    try {
      const cleanMappings =
        Object.fromEntries(
          Object.entries(mappings)
            .filter(
              ([, accountId]) =>
                Boolean(accountId),
            ),
        );

      await setAdbnTechAccountMappings(
        spaceId,
        cleanMappings,
      );

      setMappings(cleanMappings);
      setSavedMappings(cleanMappings);
      setMappingMessage(
        'ADBN TECH account mappings saved in BajetBN.',
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH account mappings could not be saved.',
      );
    } finally {
      setMappingBusy(false);
    }
  };

  const syncPaymentToBajetBn =
    async (
      payment: AdbnTechPaymentMirror,
    ) => {
      if (
        syncBusyPaymentId
        || !adbnPaymentCanPost(payment)
      ) {
        return;
      }

      const mappedAccountId =
        payment.bankAccountId
          ? savedMappings[
              payment.bankAccountId
            ]
          : '';

      if (!mappedAccountId) {
        setError(
          'Map this ADBN TECH receiving account to a BajetBN Business account first.',
        );
        return;
      }

      const syncLabel =
        adbnPaymentSyncLabel(
          payment.id,
        );

      const alreadySynced =
        businessTransactions.some(
          (item) =>
            (item.labels || [])
              .some(
                (label) =>
                  label.toLowerCase()
                  === syncLabel.toLowerCase(),
              ),
        );

      if (alreadySynced) {
        setSyncMessage(
          (payment.paymentNo || payment.id)
          + ' is already synced to BajetBN.',
        );
        return;
      }

      setSyncBusyPaymentId(
        payment.id,
      );
      setSyncMessage('');
      setError('');

      try {
        const outcome =
          await syncAdbnTechPaymentToBajetBn(
            {
              payment,
              spaceId,
              mappedAccountId,
            },
          );

        if (
          outcome.mode
          !== 'posted'
        ) {
          throw new Error(
            'The payment did not post immediately.',
          );
        }

        const nextTransactions =
          await listBusinessTransactionsForSpace(
            spaceId,
          );

        setBusinessTransactions(
          nextTransactions,
        );

        if (onFinancialSync) {
          await onFinancialSync();
        }

        setSyncMessage(
          (payment.paymentNo || payment.id)
          + ' synced to BajetBN Money activity.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment could not be synced.',
        );
      } finally {
        setSyncBusyPaymentId('');
      }
    };

  const reconcilePayment =
    async (
      payment: AdbnTechPaymentMirror,
      currentTransaction: FinancialTransaction,
    ) => {
      if (syncBusyPaymentId) {
        return;
      }

      const mappedAccountId =
        payment.bankAccountId
          ? savedMappings[
              payment.bankAccountId
            ]
          : '';

      if (
        !mappedAccountId
        || !payment.bankAccountId
        || !adbnPaymentCanPost(
          payment,
        )
      ) {
        setError(
          'Map the receiving account and make sure the ADBN TECH payment is valid before reconciling.',
        );
        return;
      }

      setSyncBusyPaymentId(
        payment.id,
      );
      setSyncMessage('');
      setError('');

      try {
        const reversalDate =
          new Intl.DateTimeFormat(
            'en-CA',
            {
              timeZone:
                'Asia/Brunei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            },
          ).format(
            new Date(),
          );

        const outcome =
          await reconcileAdbnTechPaymentToBajetBn(
            {
              payment,
              currentTransaction,
              spaceId,
              mappedAccountId,
              reversalDate,
            },
          );

        if (
          outcome.mode
          !== 'posted'
        ) {
          throw new Error(
            'The corrected payment did not post immediately.',
          );
        }

        const nextTransactions =
          await listBusinessTransactionsForSpace(
            spaceId,
          );

        setBusinessTransactions(
          nextTransactions,
        );

        if (onFinancialSync) {
          await onFinancialSync();
        }

        setSyncMessage(
          (payment.paymentNo || payment.id)
          + ' reconciled. The previous Money In was reversed and the corrected ADBN values were posted.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment change could not be reconciled.',
        );
      } finally {
        setSyncBusyPaymentId('');
      }
    };

  const reverseStalePaymentFromWorkspace =
    async (
      transaction: FinancialTransaction,
    ) => {
      if (
        !user?.uid
        || user.uid !== spaceOwnerId
      ) {
        setError(
          'Only the Business Space owner can reverse a stale ADBN TECH payment.',
        );
        return;
      }

      if (staleReverseBusyId) {
        return;
      }

      if (
        staleReverseConfirmId
        !== transaction.id
      ) {
        setStaleReverseConfirmId(
          transaction.id,
        );
        setSyncMessage('');
        setError('');
        return;
      }

      setStaleReverseBusyId(
        transaction.id,
      );
      setSyncMessage('');
      setError('');

      try {
        const reversalDate =
          new Intl.DateTimeFormat(
            'en-CA',
            {
              timeZone:
                'Asia/Brunei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            },
          ).format(
            new Date(),
          );

        await reverseStaleAdbnPaymentMoneyActivity({
          transactionId:
            transaction.id,
          transactionDate:
            reversalDate,
          reason:
            'ADBN TECH payment is missing from the current source snapshot; stale BajetBN Money In reversed manually after owner review.',
        });

        const nextTransactions =
          await listBusinessTransactionsForSpace(
            spaceId,
          );

        setBusinessTransactions(
          nextTransactions,
        );
        setStaleReverseConfirmId('');

        if (onFinancialSync) {
          await onFinancialSync();
        }

        setSyncMessage(
          'Stale ADBN TECH payment Money In reversed. History is preserved and the Business Account, ledger and reports were updated.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Stale ADBN TECH payment could not be reversed.',
        );
      } finally {
        setStaleReverseBusyId('');
      }
    };

  const openOfficialReceipt =
    async (
      payment: AdbnTechPaymentMirror,
    ) => {
      if (
        receiptShareBusyPaymentId
      ) {
        return;
      }

      const popup =
        window.open(
          '',
          '_blank',
        );

      setReceiptShareBusyPaymentId(
        payment.id,
      );
      setError('');

      try {
        const share =
          await createAdbnTechPaymentReceiptShare(
            payment.id,
          );

        if (popup) {
          popup.opener = null;
          popup.location.href =
            share.url;
          return;
        }

        window.location.assign(
          share.url,
        );
      } catch (nextError) {
        if (popup) {
          popup.close();
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Official ADBN TECH receipt could not be opened.',
        );
      } finally {
        setReceiptShareBusyPaymentId('');
      }
    };

  const shareOfficialReceiptToWhatsApp =
    async (
      payment: AdbnTechPaymentMirror,
    ) => {
      if (
        receiptShareBusyPaymentId
      ) {
        return;
      }

      const popup =
        window.open(
          '',
          '_blank',
        );

      setReceiptShareBusyPaymentId(
        payment.id,
      );
      setError('');

      try {
        const share =
          await createAdbnTechPaymentReceiptShare(
            payment.id,
          );

        const customerMatches =
          (item: {
            adbnCustomerId?: string;
            customerNo?: string;
          }) =>
            item.adbnCustomerId
              === payment.customerId
            || (
              Boolean(
                payment.customerNo,
              )
              && item.customerNo
                === payment.customerNo
            );

        let customerLink =
          customerLinks.find(
            customerMatches,
          )
          || null;

        const linked =
          customerLink?.status === 'accepted'
            && customerLink.targetSpaceId
              ? customerLink
              : null;

        const adbnCustomer =
          adbnCustomers.find(
            (item) =>
              item.id
                === payment.customerId
              || (
                Boolean(
                  payment.customerNo,
                )
                && item.customerNo
                  === payment.customerNo
              ),
          )
          || null;

        if (!linked) {
          if (
            !customerLink
            || customerLink.status
              === 'declined'
          ) {
            if (
              !adbnCustomer?.email
                ?.trim()
            ) {
              throw new Error(
                'Add the customer email in ADBN TECH before sharing the BajetBN onboarding link.',
              );
            }

            await createAdbnCustomerLinkInvitation({
              businessSpaceId:
                spaceId,
              adbnCustomerId:
                adbnCustomer.id,
              customerNo:
                adbnCustomer.customerNo,
              customerName:
                adbnCustomer.name
                || payment.customerName,
              targetEmail:
                adbnCustomer.email,
            });

            const nextLinks =
              await listAdbnCustomerLinksForBusiness(
                spaceId,
              );

            setCustomerLinks(
              nextLinks,
            );

            customerLink =
              nextLinks.find(
                customerMatches,
              )
              || null;
          }

          if (
            customerLink?.status
              !== 'pending'
          ) {
            throw new Error(
              'The BajetBN customer invitation could not be prepared.',
            );
          }
        }

        const bajetBnUrl =
          linked?.targetSpaceId
            ? (
                window.location.origin
                + '/spaces/'
                + encodeURIComponent(
                    linked.targetSpaceId,
                  )
                + '/adbn'
              )
            : (
                window.location.origin
                + '/register'
                + '?source=adbn-receipt'
                + '&returnTo='
                + encodeURIComponent(
                    '/adbn-links?source=adbn-receipt',
                  )
              );

        const receipt =
          share.receipt;

        const lines = [
          'Assalamualaikum'
            + (
              receipt.customerName
                ? ' '
                  + receipt.customerName
                : ''
            )
            + '.',
          '',
          'Payment received. Thank you.',
          '',
          'Amount: '
            + bnd(
              receipt.amount,
            ),
          'Receipt: '
            + (
              receipt.receiptNo
              || payment.paymentNo
              || payment.id
            ),
          receipt.invoiceNo
            ? 'Invoice: '
              + receipt.invoiceNo
            : '',
          receipt.date
            ? 'Payment date: '
              + simpleDate(
                receipt.date,
              )
            : '',
          'Remaining balance: '
            + bnd(
              receipt.remainingBalanceAfter,
            ),
          receipt.nextDueDateAfter
            ? 'Next payment due: '
              + simpleDate(
                receipt.nextDueDateAfter,
              )
            : '',
          '',
          'View or download your official ADBN TECH receipt:',
          share.url,
          '',
          linked?.targetSpaceId
            ? 'View your ADBN TECH payment history in BajetBN:'
            : 'Create or sign in to BajetBN, then accept your ADBN TECH customer link:',
          bajetBnUrl,
          '',
          'ADBN TECH',
        ].filter(
          (line, index, values) =>
            line !== ''
            || (
              index > 0
              && values[index - 1]
                !== ''
            ),
        );

        const number =
          whatsappNumber(
            share.customerPhone,
          );

        const target =
          'https://wa.me/'
          + number
          + '?text='
          + encodeURIComponent(
            lines.join('\n'),
          );

        if (popup) {
          popup.opener = null;
          popup.location.href =
            target;
          return;
        }

        window.location.assign(
          target,
        );
      } catch (nextError) {
        if (popup) {
          popup.close();
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'WhatsApp receipt could not be prepared.',
        );
      } finally {
        setReceiptShareBusyPaymentId('');
      }
    };

  const enableAutoSync =
    async () => {
      const cutoffIso =
        new Date()
          .toISOString();

      setAutoSyncBusy(true);
      setAutoSyncMessage('');
      setError('');

      try {
        await setAdbnTechPaymentAutoSync(
          spaceId,
          {
            enabled: true,
            cutoffIso,
          },
        );

        setAutoSyncEnabled(true);
        setAutoSyncCutoffIso(
          cutoffIso,
        );
        setAutoSyncMessage(
          'Auto-sync enabled. Only ADBN TECH payments created after this moment can post automatically.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment auto-sync could not be enabled.',
        );
      } finally {
        setAutoSyncBusy(false);
      }
    };

  const disableAutoSync =
    async () => {
      setAutoSyncBusy(true);
      setAutoSyncMessage('');
      setError('');

      try {
        await setAdbnTechPaymentAutoSync(
          spaceId,
          {
            enabled: false,
          },
        );

        setAutoSyncEnabled(false);
        setAutoSyncMessage(
          'Auto-sync is off. Manual Sync to BajetBN remains available.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment auto-sync could not be disabled.',
        );
      } finally {
        setAutoSyncBusy(false);
      }
    };

  const runFuturePaymentAutoSync =
    useCallback(
      async (
        payments:
          AdbnTechPaymentMirror[],
      ) => {
        if (
          !autoSyncEnabled
          || !autoSyncCutoffIso
        ) {
          return;
        }

        setAutoSyncBusy(true);
        setAutoSyncMessage('');

        try {
          const summary =
            await autoSyncNewAdbnTechPaymentsToBajetBn(
              {
                spaceId,
                mappings:
                  savedMappings,
                cutoffIso:
                  autoSyncCutoffIso,
                payments,
              },
            );

          setBusinessTransactions(
            summary.transactions,
          );

          if (
            summary.posted > 0
            && onFinancialSync
          ) {
            await onFinancialSync();
          }

          if (
            summary.connected
            && (
              summary.posted > 0
              || summary.failed > 0
              || summary.blocked > 0
            )
          ) {
            setAutoSyncMessage(
              summary.posted
              + ' new payment'
              + (
                summary.posted === 1
                  ? ''
                  : 's'
              )
              + ' auto-synced. '
              + summary.blocked
              + ' blocked. '
              + summary.failed
              + ' failed.'
            );
          }

          if (
            summary.firstError
          ) {
            setError(
              summary.firstError,
            );
          }
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'ADBN TECH payment auto-sync check failed.',
          );
        } finally {
          setAutoSyncBusy(false);
        }
      },
      [
        autoSyncCutoffIso,
        autoSyncEnabled,
        onFinancialSync,
        savedMappings,
        spaceId,
      ],
    );

  useEffect(
    () => {
      if (
        !snapshot
        || !autoSyncEnabled
        || !autoSyncCutoffIso
      ) {
        return;
      }

      const signature =
        snapshot.loadedAt
        + '|'
        + autoSyncCutoffIso
        + '|'
        + JSON.stringify(
          savedMappings,
        );

      if (
        autoSyncRunRef.current
        === signature
      ) {
        return;
      }

      autoSyncRunRef.current =
        signature;

      void runFuturePaymentAutoSync(
        snapshot.payments,
      );
    },
    [
      autoSyncCutoffIso,
      autoSyncEnabled,
      runFuturePaymentAutoSync,
      savedMappings,
      snapshot,
    ],
  );

  const normalizedQuery =
    query.trim().toLowerCase();

  const searchedPayments = useMemo(
    () => {
      const rows =
        snapshot?.payments || [];

      if (!normalizedQuery) {
        return rows;
      }

      return rows.filter((item) =>
        [
          item.paymentNo,
          item.invoiceNo,
          item.customerNo,
          item.customerName,
          item.paymentMethod,
          item.reference,
          item.status,
          item.note,
          item.bankAccountName,
          item.bankAccountType,
          item.bankAccountId,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      );
    },
    [normalizedQuery, snapshot],
  );

  const mappedCount = useMemo(
    () =>
      (snapshot?.bankAccounts || [])
        .filter((account) =>
          Boolean(
            savedMappings[account.id],
          ),
        )
        .length,
    [savedMappings, snapshot],
  );

  const bajetAccountIds =
    useMemo(
      () =>
        new Set(
          bajetAccounts.map(
            (account) =>
              account.id,
          ),
        ),
      [bajetAccounts],
    );

  const paymentFilterCounts =
    useMemo(
      () => {
        const counts = {
          all:
            snapshot?.payments.length
            || 0,
          attention: 0,
          ready: 0,
          synced: 0,
          changed: 0,
          blocked: 0,
        };

        for (
          const payment
          of snapshot?.payments || []
        ) {
          const currentTransaction =
            findPostedAdbnPaymentTransaction(
              payment.id,
              businessTransactions,
            );

          const mappedAccountId =
            payment.bankAccountId
              ? savedMappings[
                  payment.bankAccountId
                ]
              : '';

          const postingIssue =
            adbnPaymentPostingIssue(
              payment,
              mappedAccountId,
              mappedAccountId
                ? bajetAccountIds.has(
                    mappedAccountId,
                  )
                : true,
            );

          const changed =
            Boolean(
              currentTransaction,
            )
            && !adbnPaymentTransactionMatches(
              payment,
              currentTransaction as FinancialTransaction,
              spaceId,
              mappedAccountId,
            );

          const blocked =
            Boolean(
              postingIssue,
            );

          if (currentTransaction) {
            counts.synced += 1;
          }

          if (changed) {
            counts.changed += 1;
          }

          if (blocked) {
            counts.blocked += 1;
          }

          if (
            changed
            || blocked
          ) {
            counts.attention += 1;
          }

          if (
            !currentTransaction
            && !postingIssue
          ) {
            counts.ready += 1;
          }
        }

        return counts;
      },
      [
        bajetAccountIds,
        businessTransactions,
        savedMappings,
        snapshot,
        spaceId,
      ],
    );

  const payments =
    useMemo(
      () => {
        if (
          paymentViewFilter
          === 'all'
        ) {
          return searchedPayments;
        }

        return searchedPayments.filter(
          (payment) => {
            const currentTransaction =
              findPostedAdbnPaymentTransaction(
                payment.id,
                businessTransactions,
              );

            const mappedAccountId =
              payment.bankAccountId
                ? savedMappings[
                    payment.bankAccountId
                  ]
                : '';

            const postingIssue =
              adbnPaymentPostingIssue(
                payment,
                mappedAccountId,
                mappedAccountId
                  ? bajetAccountIds.has(
                      mappedAccountId,
                    )
                  : true,
              );

            const changed =
              Boolean(
                currentTransaction,
              )
              && !adbnPaymentTransactionMatches(
                payment,
                currentTransaction as FinancialTransaction,
                spaceId,
                mappedAccountId,
              );

            if (
              paymentViewFilter
              === 'attention'
            ) {
              return (
                changed
                || Boolean(
                  postingIssue,
                )
              );
            }

            if (
              paymentViewFilter
              === 'ready'
            ) {
              return (
                !currentTransaction
                && !postingIssue
              );
            }

            if (
              paymentViewFilter
              === 'synced'
            ) {
              return Boolean(
                currentTransaction,
              );
            }

            if (
              paymentViewFilter
              === 'changed'
            ) {
              return changed;
            }

            return Boolean(
              postingIssue,
            );
          },
        );
      },
      [
        bajetAccountIds,
        businessTransactions,
        paymentViewFilter,
        savedMappings,
        searchedPayments,
        spaceId,
      ],
    );

  const paymentIssueCounts =
    useMemo(
      () => {
        const counts = {
          total: 0,
          missingAccount: 0,
          unmappedAccount: 0,
          brokenMapping: 0,
          invalid: 0,
        };

        for (
          const payment
          of snapshot?.payments || []
        ) {
          const mappedAccountId =
            payment.bankAccountId
              ? savedMappings[
                  payment.bankAccountId
                ]
              : '';

          const issue =
            adbnPaymentPostingIssue(
              payment,
              mappedAccountId,
              mappedAccountId
                ? bajetAccountIds.has(
                    mappedAccountId,
                  )
                : true,
            );

          if (!issue) {
            continue;
          }

          counts.total += 1;

          if (
            issue.code
            === 'missing_adbn_account'
          ) {
            counts.missingAccount += 1;
          } else if (
            issue.code
            === 'unmapped_adbn_account'
          ) {
            counts.unmappedAccount += 1;
          } else if (
            issue.code
            === 'broken_bajet_mapping'
          ) {
            counts.brokenMapping += 1;
          } else {
            counts.invalid += 1;
          }
        }

        return counts;
      },
      [
        bajetAccountIds,
        savedMappings,
        snapshot,
      ],
    );

  const hasUnsavedMappings =
    JSON.stringify(mappings)
    !== JSON.stringify(savedMappings);

  const syncedLabels =
    useMemo(
      () =>
        new Set(
          businessTransactions
            .flatMap(
              (item) =>
                item.labels || [],
            )
            .map(
              (label) =>
                label.toLowerCase(),
            ),
        ),
      [businessTransactions],
    );

  const syncedPaymentCount =
    useMemo(
      () =>
        (snapshot?.payments || [])
          .filter(
            (payment) =>
              syncedLabels.has(
                adbnPaymentSyncLabel(
                  payment.id,
                ).toLowerCase(),
              ),
          )
          .length,
      [snapshot, syncedLabels],
    );

  const changedPaymentCount =
    useMemo(
      () =>
        (snapshot?.payments || [])
          .filter(
            (payment) => {
              const currentTransaction =
                findPostedAdbnPaymentTransaction(
                  payment.id,
                  businessTransactions,
                );

              if (!currentTransaction) {
                return false;
              }

              const mappedAccountId =
                payment.bankAccountId
                  ? savedMappings[
                      payment.bankAccountId
                    ]
                  : '';

              return !adbnPaymentTransactionMatches(
                payment,
                currentTransaction,
                spaceId,
                mappedAccountId,
              );
            },
          )
          .length,
      [
        businessTransactions,
        savedMappings,
        snapshot,
        spaceId,
      ],
    );

  const stalePaymentTransactions =
    useMemo(
      () =>
        findStalePostedAdbnPaymentTransactions(
          snapshot?.payments || [],
          businessTransactions,
        ),
      [
        businessTransactions,
        snapshot,
      ],
    );

  const bajetAccountById = useMemo(
    () =>
      new Map(
        bajetAccounts.map(
          (account) => [
            account.id,
            account,
          ],
        ),
      ),
    [bajetAccounts],
  );

  if (
    user?.email?.trim().toLowerCase()
    !== 'zardeerwandy@gmail.com'
  ) {
    return null;
  }

  if (
    connectedEmail
    !== ADBN_TECH_ADMIN_EMAIL
  ) {
    return (
      <section
        className="panel adbn-tech-mirror-connect-v115"
        data-adbn-tech-payments-connect
      >
        <span className="eyebrow">
          ADBN TECH read-only payments
        </span>

        <h2>
          Connect the ADBN TECH admin account
        </h2>

        <p className="muted">
          BajetBN stays signed in as zardeerwandy@gmail.com. The separate ADBN TECH Firebase session is used only to read bank accounts and payment records.
        </p>

        <div className="adbn-tech-mirror-connect-actions-v115">
          <button
            type="button"
            className="button primary"
            disabled={loading}
            onClick={() =>
              void connect()
            }
          >
            {loading
              ? 'Connecting…'
              : 'Connect ADBN TECH'}
          </button>

          <small>
            Choose {ADBN_TECH_ADMIN_EMAIL} in the Google account picker.
          </small>
        </div>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <small className="muted">
          Slice 23A reads ADBN TECH bankAccounts and payments only. It does not post, edit or delete ADBN TECH financial records.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-payments-workspace
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>
            ADBN TECH · Read-only mirror
          </span>
          <h2>Payments</h2>
        </div>

      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>
          Connected as{' '}
          <strong>{connectedEmail}</strong>
        </span>

        <span>
          ADBN accounts{' '}
          <strong>
            {snapshot?.bankAccounts.length || 0}
          </strong>
        </span>

        <span>
          Mapped{' '}
          <strong>
            {mappedCount}
            /
            {snapshot?.bankAccounts.length || 0}
          </strong>
        </span>

        <span>
          Payments{' '}
          <strong>
            {snapshot?.payments.length || 0}
          </strong>
        </span>

        <span>
          Synced{' '}
          <strong>
            {syncedPaymentCount}
          </strong>
        </span>

        <span>
          Changed{' '}
          <strong>
            {changedPaymentCount}
          </strong>
        </span>

        <span>
          Missing in ADBN{' '}
          <strong>
            {stalePaymentTransactions.length}
          </strong>
        </span>
      </div>

      <section
        className="panel adbn-tech-account-mapping-v115"
        data-adbn-tech-account-mapping
      >
        <div>
          <span className="eyebrow">
            Account-aware mapping
          </span>

          <h3>
            ADBN TECH account → BajetBN account
          </h3>

          <p className="muted">
            Map each ADBN TECH receiving account to the matching BajetBN Business account. Payments with an unmapped or missing ADBN account will stay blocked from future automatic posting.
          </p>
        </div>

        {!bajetAccounts.length ? (
          <div className="notice">
            No active BajetBN Business account is linked to this ADBN TECH Space yet. Create or link the corresponding BIBD, Baiduri, Cash or other Business account under Finance → Accounts first.
          </div>
        ) : (
          <>
            <div className="adbn-tech-account-mapping-list-v115">
              {(snapshot?.bankAccounts || [])
                .map((account) => (
                  <div
                    className="adbn-tech-account-mapping-row-v115"
                    key={account.id}
                  >
                    <div>
                      <strong>
                        {accountLabel(account)}
                      </strong>

                      <small>
                        {account.accountType || 'Account'}
                        {' · '}
                        {account.currency || 'BND'}
                        {!account.isActive
                          ? ' · Inactive'
                          : ''}
                      </small>

                      <small>
                        ADBN ID: {account.id}
                      </small>
                    </div>

                    <span
                      className="adbn-tech-account-mapping-arrow-v115"
                      aria-hidden="true"
                    >
                      →
                    </span>

                    <label>
                      BajetBN Business account
                      <select
                        value={
                          mappings[account.id]
                          || ''
                        }
                        onChange={(event) =>
                          changeMapping(
                            account.id,
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Mapping required
                        </option>

                        {bajetAccounts.map(
                          (bajetAccount) => (
                            <option
                              key={bajetAccount.id}
                              value={bajetAccount.id}
                            >
                              {bajetAccount.name}
                              {' · '}
                              {bajetAccount.currency}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                ))}
            </div>

            {!snapshot?.bankAccounts.length && (
              <div className="notice">
                No ADBN TECH bank accounts were returned. Payment records can still be reviewed, but automatic posting must remain disabled until receiving accounts are available.
              </div>
            )}

            <div
              className="adbn-tech-account-mapping-footer-v115"
              data-adbn-payment-block-summary
            >
              <div>
                <strong>
                  {paymentIssueCounts.total}
                </strong>
                <span>
                  {' '}
                  payment
                  {paymentIssueCounts.total === 1
                    ? ''
                    : 's'} need attention
                  {' · '}
                  {paymentIssueCounts.missingAccount}
                  {' '}
                  missing receiving account
                  {' · '}
                  {paymentIssueCounts.unmappedAccount}
                  {' '}
                  unmapped
                  {' · '}
                  {paymentIssueCounts.brokenMapping}
                  {' '}
                  broken mapping
                  {' · '}
                  {paymentIssueCounts.invalid}
                  {' '}
                  invalid / cancelled
                </span>
              </div>

              <button
                type="button"
                className="button primary"
                disabled={
                  mappingBusy
                  || !hasUnsavedMappings
                }
                onClick={() =>
                  void saveMappings()
                }
              >
                {mappingBusy
                  ? 'Saving…'
                  : 'Save mappings'}
              </button>
            </div>
          </>
        )}

        {mappingMessage && (
          <div className="notice success">
            {mappingMessage}
          </div>
        )}

        {syncMessage && (
          <div className="notice success">
            {syncMessage}
          </div>
        )}
      </section>

      <section
        className="panel adbn-tech-account-mapping-v115"
        data-adbn-tech-payment-auto-sync
      >
        <div>
          <span className="eyebrow">
            Future payments
          </span>

          <h3>
            Auto-sync new ADBN TECH payments
          </h3>

          <p className="muted">
            Existing receipts stay manual. When enabled, only ADBN TECH payments created after the activation time can post automatically into the mapped BajetBN Business account. If a synced source payment is edited later, BajetBN marks it Changed and requires an explicit Reconcile change action. Deleted or missing source payments are never reversed automatically.
          </p>
        </div>

        {autoSyncEnabled ? (
          <div className="adbn-tech-account-mapping-footer-v115">
            <div>
              <strong>
                Auto-sync on
              </strong>
              <span>
                {' · from '}
                {simpleDateTime(
                  autoSyncCutoffIso,
                )}
              </span>
            </div>

            <button
              type="button"
              className="button secondary"
              disabled={autoSyncBusy}
              onClick={() =>
                void disableAutoSync()
              }
            >
              {autoSyncBusy
                ? 'Updating...'
                : 'Turn off auto-sync'}
            </button>
          </div>
        ) : (
          <div className="adbn-tech-account-mapping-footer-v115">
            <div>
              <strong>
                Auto-sync off
              </strong>
              <span>
                {' '}
                Older payments will never be imported automatically.
              </span>
            </div>

            <button
              type="button"
              className="button primary"
              disabled={
                autoSyncBusy
                || !Object.keys(
                  savedMappings,
                ).length
              }
              onClick={() =>
                void enableAutoSync()
              }
            >
              {autoSyncBusy
                ? 'Enabling...'
                : 'Enable auto-sync from now'}
            </button>
          </div>
        )}

        {autoSyncMessage && (
          <div className="notice success">
            {autoSyncMessage}
          </div>
        )}
      </section>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search payments</span>

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Payment, invoice, customer, account, reference, status…"
        />
      </label>

      <div
        className="header-actions"
        data-adbn-payment-view-filters
      >
        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'all'
                ? 'primary'
                : 'secondary'
            }`
          }
          onClick={() =>
            setPaymentViewFilter(
              'all',
            )
          }
        >
          All ({paymentFilterCounts.all})
        </button>

        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'attention'
                ? 'primary'
                : 'secondary'
            }`
          }
          data-adbn-payment-filter-attention
          onClick={() =>
            setPaymentViewFilter(
              'attention',
            )
          }
        >
          Needs attention ({paymentFilterCounts.attention})
        </button>

        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'ready'
                ? 'primary'
                : 'secondary'
            }`
          }
          onClick={() =>
            setPaymentViewFilter(
              'ready',
            )
          }
        >
          Ready to sync ({paymentFilterCounts.ready})
        </button>

        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'synced'
                ? 'primary'
                : 'secondary'
            }`
          }
          onClick={() =>
            setPaymentViewFilter(
              'synced',
            )
          }
        >
          Synced ({paymentFilterCounts.synced})
        </button>

        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'changed'
                ? 'primary'
                : 'secondary'
            }`
          }
          onClick={() =>
            setPaymentViewFilter(
              'changed',
            )
          }
        >
          Changed ({paymentFilterCounts.changed})
        </button>

        <button
          type="button"
          className={
            `button compact ${
              paymentViewFilter === 'blocked'
                ? 'primary'
                : 'secondary'
            }`
          }
          data-adbn-payment-filter-blocked
          onClick={() =>
            setPaymentViewFilter(
              'blocked',
            )
          }
        >
          Blocked ({paymentFilterCounts.blocked})
        </button>
      </div>

      <small
        className="muted"
        data-adbn-payment-filter-summary
      >
        Showing {payments.length} of {snapshot?.payments.length || 0} source payments.
        {' '}
        Missing/deleted source payments stay in the separate review section below.
      </small>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="loading-panel">
          Loading ADBN TECH accounts and payments…
        </div>
      ) : (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Received Into</th>
                <th>BajetBN Mapping</th>
                <th>BajetBN Sync</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => {
                const mappedBajetAccount =
                  payment.bankAccountId
                    ? bajetAccountById.get(
                        savedMappings[
                          payment.bankAccountId
                        ],
                      )
                    : null;

                const currentTransaction =
                  findPostedAdbnPaymentTransaction(
                    payment.id,
                    businessTransactions,
                  );

                const paymentSynced =
                  Boolean(
                    currentTransaction,
                  );

                const mappedAccountId =
                  payment.bankAccountId
                    ? savedMappings[
                        payment.bankAccountId
                      ]
                    : '';

                const paymentChanged =
                  Boolean(
                    currentTransaction,
                  )
                  && !adbnPaymentTransactionMatches(
                    payment,
                    currentTransaction as FinancialTransaction,
                    spaceId,
                    mappedAccountId,
                  );

                const postingIssue =
                  adbnPaymentPostingIssue(
                    payment,
                    mappedAccountId,
                    mappedAccountId
                      ? bajetAccountIds.has(
                          mappedAccountId,
                        )
                      : true,
                  );

                const paymentReady =
                  !postingIssue
                  && Boolean(
                    mappedBajetAccount,
                  );

                const mappingIssue =
                  postingIssue?.code
                    === 'missing_adbn_account'
                  || postingIssue?.code
                    === 'unmapped_adbn_account'
                  || postingIssue?.code
                    === 'broken_bajet_mapping'
                    ? postingIssue
                    : null;

                return (
                  <tr key={payment.id}>
                    <td>
                      <strong>
                        {payment.paymentNo
                          || payment.id}
                      </strong>
                      <small>
                        Read-only
                      </small>
                    </td>

                    <td>
                      <strong>
                        {payment.invoiceNo
                          || payment.invoiceId
                          || '—'}
                      </strong>
                    </td>

                    <td>
                      <span>
                        {payment.customerName
                          || '—'}
                      </span>
                      <small>
                        {payment.customerNo
                          || payment.customerId
                          || ''}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {bnd(payment.amount)}
                      </strong>
                    </td>

                    <td>
                      {simpleDate(
                        payment.paymentDate,
                      )}
                    </td>

                    <td>
                      <span>
                        {payment.bankAccountName
                          || 'Unassigned'}
                      </span>
                      <small>
                        {payment.bankAccountType
                          || payment.bankAccountId
                          || 'No ADBN account ID'}
                      </small>
                    </td>

                    <td>
                      {mappingIssue ? (
                        <>
                          <strong className="adbn-tech-mapping-required-v115">
                            {mappingIssue.label}
                          </strong>
                          <small>
                            {mappingIssue.detail}
                          </small>
                        </>
                      ) : mappedBajetAccount ? (
                        <>
                          <strong>
                            {mappedBajetAccount.name}
                          </strong>
                          <small>
                            {mappedBajetAccount.currency}
                          </small>
                        </>
                      ) : (
                        <span className="adbn-tech-mapping-required-v115">
                          Mapping unavailable
                        </span>
                      )}
                    </td>

                    <td
                      data-adbn-payment-block-reason={
                        postingIssue?.code
                        || undefined
                      }
                    >
                      {paymentSynced && !paymentChanged ? (
                        <>
                          <strong>
                            Synced
                          </strong>
                          <small>
                            Money activity matches ADBN
                          </small>
                        </>
                      ) : paymentSynced
                      && paymentChanged
                      && paymentReady ? (
                        <button
                          type="button"
                          className="button secondary compact"
                          data-adbn-payment-reconcile
                          disabled={
                            Boolean(
                              syncBusyPaymentId,
                            )
                          }
                          onClick={() =>
                            void reconcilePayment(
                              payment,
                              currentTransaction as FinancialTransaction,
                            )
                          }
                        >
                          {syncBusyPaymentId
                            === payment.id
                            ? 'Reconciling...'
                            : 'Reconcile change'}
                        </button>
                      ) : paymentSynced
                      && paymentChanged ? (
                        <>
                          <strong>
                            Changed
                          </strong>
                          <small>
                            {postingIssue?.detail
                              || 'Source values changed and need review.'}
                          </small>
                        </>
                      ) : paymentReady ? (
                        <button
                          type="button"
                          className="button secondary compact"
                          disabled={
                            Boolean(
                              syncBusyPaymentId,
                            )
                          }
                          onClick={() =>
                            void syncPaymentToBajetBn(
                              payment,
                            )
                          }
                        >
                          {syncBusyPaymentId
                            === payment.id
                            ? 'Syncing...'
                            : 'Sync to BajetBN'}
                        </button>
                      ) : (
                        <>
                          <strong>
                            {postingIssue?.label
                              || 'Blocked'}
                          </strong>
                          <small>
                            {postingIssue?.detail
                              || 'Review this ADBN TECH payment before syncing.'}
                          </small>
                        </>
                      )}
                    </td>

                    <td>
                      <span>
                        {payment.status || '—'}
                      </span>
                      <small>
                        {payment.paymentMethod
                          || payment.reference
                          || ''}
                      </small>
                    </td>

                    <td>
                      {adbnPaymentCanPost(payment) ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.4rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            className="button secondary compact"
                            data-adbn-payment-official-receipt
                            disabled={Boolean(
                              receiptShareBusyPaymentId,
                            )}
                            onClick={() =>
                              void openOfficialReceipt(
                                payment,
                              )
                            }
                          >
                            {receiptShareBusyPaymentId
                              === payment.id
                              ? 'Preparing…'
                              : 'Receipt'}
                          </button>

                          <button
                            type="button"
                            className="button secondary compact"
                            data-adbn-payment-whatsapp-receipt
                            disabled={Boolean(
                              receiptShareBusyPaymentId,
                            )}
                            onClick={() =>
                              void shareOfficialReceiptToWhatsApp(
                                payment,
                              )
                            }
                          >
                            WhatsApp
                          </button>
                        </div>
                      ) : (
                        <span className="muted">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!payments.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="muted"
                  >
                    No ADBN TECH payments match the current search and status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {stalePaymentTransactions.length > 0 && (
        <section
          className="panel adbn-tech-account-mapping-v115"
          data-adbn-payment-stale-review
        >
          <div>
            <span className="eyebrow">
              Needs review
            </span>

            <h3>
              Missing ADBN TECH payments
            </h3>

            <p className="muted">
              These active BajetBN Money In records still carry an ADBN TECH payment sync marker, but their source payment is absent from the current ADBN payment snapshot. Detection alone never changes money. Confirm the source was deleted or cancelled before reversing a row.
            </p>
          </div>

          <div className="adbn-tech-table-wrap-v115">
            <table className="adbn-tech-table-v115">
              <thead>
                <tr>
                  <th>BajetBN record</th>
                  <th>Date</th>
                  <th>Customer / source</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {stalePaymentTransactions.map(
                  (transaction) => {
                    const account =
                      bajetAccountById.get(
                        transaction.accountId,
                      );

                    const confirming =
                      staleReverseConfirmId
                      === transaction.id;

                    const busy =
                      staleReverseBusyId
                      === transaction.id;

                    const ownerCanReverse =
                      Boolean(user?.uid)
                      && user?.uid
                        === spaceOwnerId;

                    return (
                      <tr
                        key={transaction.id}
                        data-adbn-payment-stale-row
                      >
                        <td>
                          <strong>
                            {transaction.note
                              || transaction.id}
                          </strong>
                          <small>
                            Missing source payment
                          </small>
                        </td>

                        <td>
                          {simpleDate(
                            transaction.transactionDate,
                          )}
                        </td>

                        <td>
                          <span>
                            {transaction.counterparty
                              || 'ADBN TECH customer'}
                          </span>
                          <small>
                            ADBN-managed Money In
                          </small>
                        </td>

                        <td>
                          <strong>
                            {bnd(
                              transaction.amountMinor
                              / 100,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span>
                            {account?.name
                              || transaction.accountId}
                          </span>
                          <small>
                            {account?.currency || ''}
                          </small>
                        </td>

                        <td>
                          {!ownerCanReverse ? (
                            <span className="muted">
                              Owner review required
                            </span>
                          ) : confirming ? (
                            <div className="header-actions">
                              <button
                                type="button"
                                className="button danger compact"
                                data-adbn-payment-stale-confirm
                                disabled={busy}
                                onClick={() =>
                                  void reverseStalePaymentFromWorkspace(
                                    transaction,
                                  )
                                }
                              >
                                {busy
                                  ? 'Reversing...'
                                  : 'Confirm reverse'}
                              </button>

                              <button
                                type="button"
                                className="button secondary compact"
                                disabled={busy}
                                onClick={() =>
                                  setStaleReverseConfirmId('')
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="button danger compact"
                              data-adbn-payment-stale-review-action
                              disabled={Boolean(staleReverseBusyId)}
                              onClick={() =>
                                void reverseStalePaymentFromWorkspace(
                                  transaction,
                                )
                              }
                            >
                              Reverse stale payment
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <small className="muted">
        Source of truth: ADBN TECH. Receipt and WhatsApp actions create or reuse ADBN TECH's customer-safe official receipt link; they do not create a second BajetBN receipt. Manual sync remains available for older receipts. Changed synced payments reconcile by preserving the previous Money In as reversed, then posting the current ADBN source values. Missing source payments are review-only until the Business Space owner explicitly reverses the stale Money In.
      </small>
    </section>
  );
}
