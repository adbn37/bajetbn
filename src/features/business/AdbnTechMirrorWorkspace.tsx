import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
} from '../../components/Modal';
import {
  ADBN_TECH_ADMIN_EMAIL,
  connectAdbnTechReadOnly,
  getAdbnTechConnectedEmail,
  loadAdbnTechBankAccountsReadOnly,
  loadAdbnTechPaymentsReadOnly,
  loadAdbnTechReadOnlySnapshot,
  recordAdbnTechPayment,
  type AdbnTechBankAccountMirror,
  type AdbnTechCustomerMirror,
  type AdbnTechInvoiceMirror,
  type AdbnTechPaymentMirror,
  type AdbnTechReadOnlySnapshot,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  createAdbnCustomerLinkInvitation,
  listAdbnCustomerLinksForBusiness,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';
import {
  getSpace,
  markAdbnTechIntegrationConnected,
} from '../../repositories/spaceRepository';
import {
  syncAdbnTechPaymentToBajetBn,
} from '../../repositories/adbnTechPaymentSyncRepository';
import {
  syncAdbnCustomerBillingToBajetBn,
} from '../../repositories/adbnCustomerBillingSyncRepository';

type MirrorView = 'customers' | 'invoices';

function bnd(value: number) {
  return new Intl.NumberFormat('en-BN', {
    style: 'currency',
    currency: 'BND',
  }).format(value || 0);
}

function simpleDate(value: string) {
  if (!value) return '—';
  const parsed = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-BN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(parsed);
}

function todayIso() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function currentMonthPrefix() {
  return todayIso()
    .slice(0, 7);
}

function invoicePaymentState(
  invoice: {
    total: number;
    paid: number;
    balance: number;
  },
) {
  if (
    invoice.total > 0
    && invoice.balance <= 0
  ) {
    return 'paid';
  }

  if (
    invoice.paid > 0
    && invoice.balance > 0
  ) {
    return 'partial';
  }

  if (invoice.balance > 0) {
    return 'unpaid';
  }

  return 'paid';
}

function invoiceDueDate(
  invoice: {
    nextDueDate: string;
    dueDate: string;
  },
) {
  return (
    invoice.nextDueDate
    || invoice.dueDate
  );
}

function paymentRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID
    === 'function'
  ) {
    return globalThis.crypto
      .randomUUID()
      .replace(/-/g, '');
  }

  return (
    Date.now().toString(36)
    + Math.random()
      .toString(36)
      .slice(2, 18)
  );
}

function bankAccountLabel(
  account: AdbnTechBankAccountMirror,
) {
  return (
    account.accountName
    || account.bankName
    || account.accountType
    || account.id
  );
}

function suggestedPaymentAmount(
  invoice: AdbnTechInvoiceMirror,
) {
  if (invoice.monthlyAmount > 0) {
    return Math.min(
      invoice.monthlyAmount,
      invoice.balance,
    );
  }

  return invoice.balance;
}

function bajetBnAdbnCustomerLinkUrl() {
  const path = '/adbn-links';

  if (
    import.meta.env.VITE_APP_ENV
      === 'staging'
  ) {
    return (
      'https://bajetbn-staging.pages.dev'
      + path
    );
  }

  if (
    typeof window !== 'undefined'
    && window.location.origin
  ) {
    return (
      window.location.origin
      + path
    );
  }

  return path;
}

function whatsappNumber(
  value: string,
) {
  const digits =
    value.replace(/\D/g, '');

  if (!digits) return '';

  if (
    digits.startsWith('00')
  ) {
    return digits.slice(2);
  }

  if (digits.length === 7) {
    return '673' + digits;
  }

  return digits;
}

function bajetBnAdbnCustomerSpaceUrl(
  link: AdbnCustomerLink | undefined,
) {
  if (
    link?.status !== 'accepted'
    || !link.targetSpaceId
  ) {
    return bajetBnAdbnCustomerLinkUrl();
  }

  const path =
    '/spaces/'
    + encodeURIComponent(
      link.targetSpaceId,
    )
    + '/adbn';

  if (
    import.meta.env.VITE_APP_ENV
      === 'staging'
  ) {
    return (
      'https://bajetbn-staging.pages.dev'
      + path
    );
  }

  if (
    typeof window !== 'undefined'
    && window.location.origin
  ) {
    return (
      window.location.origin
      + path
    );
  }

  return path;
}

function openAdbnCustomerWhatsappInvite(
  customer: AdbnTechCustomerMirror,
  link: AdbnCustomerLink | undefined,
) {
  const number =
    whatsappNumber(
      customer.whatsapp
      || customer.phone
      || '',
    );

  if (!number) {
    return;
  }

  const customerLabel =
    customer.name
    || customer.customerNo
    || 'customer';

  const email =
    link?.targetEmail
    || customer.email
    || '';

  const customerRef =
    customer.customerNo
      ? ' (' + customer.customerNo + ')'
      : '';

  let message: string[];

  if (
    link?.status === 'accepted'
  ) {
    message = [
      'Assalamualaikum '
        + customerLabel
        + '.',
      '',
      'Your ADBN TECH customer account'
        + customerRef
        + ' is connected to BajetBN.',
      '',
      'Open your ADBN TECH customer Space:',
      bajetBnAdbnCustomerSpaceUrl(
        link,
      ),
      '',
      email
        ? 'Please sign in using ' + email + '.'
        : 'Please sign in using your registered BajetBN email.',
      '',
      'You can view your synced ADBN TECH bills, instalments, payment history and due reminders there.',
    ];
  } else if (
    link?.status === 'pending'
  ) {
    message = [
      'Assalamualaikum '
        + customerLabel
        + '.',
      '',
      'ADBN TECH has invited you to connect your customer account'
        + customerRef
        + ' with BajetBN.',
      '',
      'Open your secure invitation:',
      bajetBnAdbnCustomerLinkUrl(),
      '',
      email
        ? 'Please sign in using ' + email + ' and accept the link.'
        : 'Please sign in using the email registered with ADBN TECH and accept the link.',
      '',
      'After acceptance, BajetBN will create your private ADBN TECH customer Space.',
    ];
  } else if (
    link?.status === 'declined'
  ) {
    message = [
      'Assalamualaikum '
        + customerLabel
        + '.',
      '',
      'ADBN TECH uses BajetBN for its customer portal'
        + customerRef
        + '.',
      '',
      'Open BajetBN:',
      bajetBnAdbnCustomerLinkUrl(),
      '',
      email
        ? 'Please sign in using ' + email + '.'
        : 'Please sign in using your registered email.',
      '',
      'If you would like to reconnect your ADBN TECH account, ADBN TECH can issue a new customer-link invitation.',
    ];
  } else {
    message = [
      'Assalamualaikum '
        + customerLabel
        + '.',
      '',
      'ADBN TECH uses BajetBN for its customer portal'
        + customerRef
        + '.',
      '',
      'Open BajetBN:',
      bajetBnAdbnCustomerLinkUrl(),
      '',
      email
        ? 'Please register or sign in using ' + email + '.'
        : 'Please register or sign in using your email address.',
      '',
      'ADBN TECH can then send your secure customer-link invitation for bills, instalments, payment history and due reminders.',
    ];
  }

  window.open(
    'https://wa.me/'
      + number
      + '?text='
      + encodeURIComponent(
        message.join('\n'),
      ),
    '_blank',
    'noopener,noreferrer',
  );
}

export function AdbnTechMirrorWorkspace({
  spaceId,
  view,
  onFinancialSync,
}: {
  spaceId: string;
  view: MirrorView;
  onFinancialSync?: () => void | Promise<void>;
}) {
  const [snapshot, setSnapshot] =
    useState<AdbnTechReadOnlySnapshot | null>(null);
  const [connectedEmail, setConnectedEmail] =
    useState(() => getAdbnTechConnectedEmail());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const [
    invoiceStatusFilter,
    setInvoiceStatusFilter,
  ] = useState('');

  const [
    invoicePaymentFilter,
    setInvoicePaymentFilter,
  ] = useState('');

  const [
    invoiceSaleTypeFilter,
    setInvoiceSaleTypeFilter,
  ] = useState('');

  const [
    invoiceDateFilter,
    setInvoiceDateFilter,
  ] = useState('');

  const [selectedInvoiceId, setSelectedInvoiceId] =
    useState('');

  const [
    recordPaymentInvoiceId,
    setRecordPaymentInvoiceId,
  ] = useState('');

  const [
    paymentBankAccounts,
    setPaymentBankAccounts,
  ] = useState<AdbnTechBankAccountMirror[]>([]);

  const [
    paymentRequest,
    setPaymentRequest,
  ] = useState('');

  const [
    paymentForm,
    setPaymentForm,
  ] = useState({
    amount: '',
    paymentDate: todayIso(),
    method: 'Bank Transfer',
    bankAccountId: '',
    reference: '',
    note: '',
  });

  const [
    recordPaymentBusy,
    setRecordPaymentBusy,
  ] = useState(false);

  const [
    paymentMessage,
    setPaymentMessage,
  ] = useState('');

  const [
    paymentWarning,
    setPaymentWarning,
  ] = useState('');

  const [
    customerLinks,
    setCustomerLinks,
  ] = useState<AdbnCustomerLink[]>([]);

  const [
    linkCustomer,
    setLinkCustomer,
  ] = useState<
    AdbnTechCustomerMirror | null
  >(null);

  const [
    linkEmail,
    setLinkEmail,
  ] = useState('');

  const [
    customerLinkBusy,
    setCustomerLinkBusy,
  ] = useState(false);

  const [
    customerLinkMessage,
    setCustomerLinkMessage,
  ] = useState('');

  const [
    billingSyncBusyCustomerId,
    setBillingSyncBusyCustomerId,
  ] = useState('');

  const [
    billingSyncMessage,
    setBillingSyncMessage,
  ] = useState('');

  const load = useCallback(async () => {
    if (getAdbnTechConnectedEmail() !== ADBN_TECH_ADMIN_EMAIL) {
      setSnapshot(null);
      setConnectedEmail('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        next,
        nextCustomerLinks,
      ] =
        await Promise.all([
          loadAdbnTechReadOnlySnapshot(),
          view === 'customers'
            ? listAdbnCustomerLinksForBusiness(
                spaceId,
              )
            : Promise.resolve(
                [] as AdbnCustomerLink[],
              ),
        ]);

      setSnapshot(next);
      setCustomerLinks(nextCustomerLinks);
      setConnectedEmail(next.connectedEmail);
      await markAdbnTechIntegrationConnected(spaceId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'ADBN TECH data could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setLoading(true);
    setError('');

    try {
      const email = await connectAdbnTechReadOnly();
      setConnectedEmail(email);
      await markAdbnTechIntegrationConnected(spaceId);
      await load();
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

  const customerLinkByAdbnId =
    useMemo(
      () =>
        new Map(
          customerLinks.map(
            (link) => [
              link.adbnCustomerId,
              link,
            ],
          ),
        ),
      [customerLinks],
    );

  const openCustomerLink =
    (
      customer: AdbnTechCustomerMirror,
    ) => {
      setLinkCustomer(customer);
      setLinkEmail(
        customer.email
          .trim()
          .toLowerCase(),
      );
      setCustomerLinkMessage('');
      setError('');
    };

  const submitCustomerLink =
    async () => {
      if (
        !linkCustomer
        || customerLinkBusy
      ) {
        return;
      }

      if (!linkEmail.trim()) {
        setError(
          'Enter the customer BajetBN email address.',
        );
        return;
      }

      setCustomerLinkBusy(true);
      setCustomerLinkMessage('');
      setError('');

      try {
        const result =
          await createAdbnCustomerLinkInvitation({
            businessSpaceId: spaceId,
            adbnCustomerId: linkCustomer.id,
            customerNo:
              linkCustomer.customerNo,
            customerName:
              linkCustomer.name
              || linkCustomer.customerNo
              || 'ADBN customer',
            targetEmail: linkEmail,
          });

        setCustomerLinkMessage(
          (
            result.recipientRegistered
              ? 'BajetBN customer-link invitation sent to '
              : 'Customer link prepared for '
          )
          + result.targetEmail
          + (
            result.recipientRegistered
              ? '.'
              : '. The customer will see it after signing in with that verified email.'
          ),
        );

        setLinkCustomer(null);
        setLinkEmail('');

        const nextLinks =
          await listAdbnCustomerLinksForBusiness(
            spaceId,
          );

        setCustomerLinks(nextLinks);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Customer link invitation could not be created.',
        );
      } finally {
        setCustomerLinkBusy(false);
      }
    };

  const syncCustomerBilling =
    async (
      customer: AdbnTechCustomerMirror,
      link: AdbnCustomerLink,
    ) => {
      if (
        !snapshot
        || link.status !== 'accepted'
        || billingSyncBusyCustomerId
      ) {
        return;
      }

      setBillingSyncBusyCustomerId(customer.id);
      setBillingSyncMessage('');
      setError('');

      try {
        const paymentSnapshot =
          await loadAdbnTechPaymentsReadOnly();

        const invoices =
          snapshot.invoices.filter(
            (invoice) =>
              invoice.customerId === customer.id
              || (
                !invoice.customerId
                && customer.customerNo
                && invoice.customerNo === customer.customerNo
              ),
          );

        const invoiceIds =
          new Set(
            invoices.map(
              (invoice) => invoice.id,
            ),
          );

        const payments =
          paymentSnapshot.payments.filter(
            (payment) =>
              payment.customerId === customer.id
              || invoiceIds.has(payment.invoiceId),
          );

        const result =
          await syncAdbnCustomerBillingToBajetBn({
            businessSpaceId: spaceId,
            adbnCustomerId: customer.id,
            invoices,
            payments,
          });

        setBillingSyncMessage(
          'Synced '
          + result.commitmentsSynced
          + ' billing record'
          + (result.commitmentsSynced === 1 ? '' : 's')
          + ' and '
          + result.paymentsSynced
          + ' payment'
          + (result.paymentsSynced === 1 ? '' : 's')
          + ' for '
          + (customer.name || customer.customerNo || 'customer')
          + '.',
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN customer billing could not be synced.',
        );
      } finally {
        setBillingSyncBusyCustomerId('');
      }
    };

  const normalizedQuery = query.trim().toLowerCase();

  const customers = useMemo(() => {
    const rows = snapshot?.customers || [];
    if (!normalizedQuery) return rows;
    return rows.filter((item) =>
      [
        item.customerNo,
        item.name,
        item.email,
        item.phone,
        item.whatsapp,
        item.status,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, snapshot]);

  const invoiceStatuses =
    useMemo(
      () =>
        Array.from(
          new Set(
            (snapshot?.invoices || [])
              .map(
                (item) =>
                  item.status.trim(),
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [snapshot],
    );

  const invoiceSaleTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            (snapshot?.invoices || [])
              .map(
                (item) =>
                  item.saleType.trim(),
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [snapshot],
    );

  const invoices = useMemo(() => {
    const rows =
      snapshot?.invoices || [];

    const today =
      todayIso();

    const month =
      currentMonthPrefix();

    return rows.filter((item) => {
      const matchesSearch =
        !normalizedQuery
        || [
          item.invoiceNo,
          item.customerNo,
          item.customerName,
          item.customerEmail,
          item.saleType,
          item.status,
          item.title,
        ].some(
          (value) =>
            value
              .toLowerCase()
              .includes(
                normalizedQuery,
              ),
        );

      const matchesStatus =
        !invoiceStatusFilter
        || item.status
          === invoiceStatusFilter;

      const paymentState =
        invoicePaymentState(item);

      const matchesPayment =
        !invoicePaymentFilter
        || (
          invoicePaymentFilter
          === 'outstanding'
            ? item.balance > 0
            : paymentState
              === invoicePaymentFilter
        );

      const matchesSaleType =
        !invoiceSaleTypeFilter
        || item.saleType
          === invoiceSaleTypeFilter;

      const dueDate =
        invoiceDueDate(item);

      const matchesDate =
        !invoiceDateFilter
        || (
          invoiceDateFilter === 'today'
            ? item.invoiceDate
              .startsWith(today)
            : invoiceDateFilter === 'month'
              ? item.invoiceDate
                .startsWith(month)
              : invoiceDateFilter === 'overdue'
                ? Boolean(
                    dueDate
                    && dueDate < today
                    && item.balance > 0
                  )
                : true
        );

      return (
        matchesSearch
        && matchesStatus
        && matchesPayment
        && matchesSaleType
        && matchesDate
      );
    });
  }, [
    invoiceDateFilter,
    invoicePaymentFilter,
    invoiceSaleTypeFilter,
    invoiceStatusFilter,
    normalizedQuery,
    snapshot,
  ]);

  const visibleInvoiceOutstanding =
    useMemo(
      () =>
        invoices.reduce(
          (sum, item) =>
            sum
            + Math.max(
              0,
              item.balance,
            ),
          0,
        ),
      [invoices],
    );

  const selectedInvoice = useMemo(
    () =>
      snapshot?.invoices.find(
        (item) => item.id === selectedInvoiceId,
      ) || null,
    [selectedInvoiceId, snapshot],
  );

  const recordPaymentInvoice =
    useMemo(
      () =>
        snapshot?.invoices.find(
          (item) =>
            item.id
            === recordPaymentInvoiceId,
        ) || null,
      [
        recordPaymentInvoiceId,
        snapshot,
      ],
    );

  const openRecordPayment =
    async (
      invoice: AdbnTechInvoiceMirror,
    ) => {
      if (invoice.balance <= 0) return;

      setSelectedInvoiceId(invoice.id);
      setRecordPaymentInvoiceId(invoice.id);
      setPaymentRequest(paymentRequestId());
      setPaymentMessage('');
      setPaymentWarning('');
      setError('');
      setRecordPaymentBusy(true);

      try {
        const bankAccounts =
          paymentBankAccounts.length
            ? paymentBankAccounts
            : await loadAdbnTechBankAccountsReadOnly();

        setPaymentBankAccounts(bankAccounts);

        const activeAccounts =
          bankAccounts.filter(
            (account) =>
              account.isActive,
          );

        const defaultAccount =
          activeAccounts.find(
            (account) =>
              [
                account.accountName,
                account.bankName,
                account.accountType,
              ]
                .join(' ')
                .toLowerCase()
                .includes('cash'),
          )
          || activeAccounts[0]
          || null;

        const amount =
          suggestedPaymentAmount(invoice);

        const accountText =
          defaultAccount
            ? [
                defaultAccount.accountName,
                defaultAccount.bankName,
                defaultAccount.accountType,
              ]
                .join(' ')
                .toLowerCase()
            : '';

        setPaymentForm({
          amount:
            amount > 0
              ? amount.toFixed(2)
              : '',
          paymentDate: todayIso(),
          method:
            accountText.includes('cash')
              ? 'Cash'
              : 'Bank Transfer',
          bankAccountId:
            defaultAccount?.id
            || '',
          reference: '',
          note: '',
        });
      } catch (nextError) {
        setRecordPaymentInvoiceId('');
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH receiving accounts could not be loaded.',
        );
      } finally {
        setRecordPaymentBusy(false);
      }
    };

  const submitRecordPayment =
    async () => {
      const invoice =
        recordPaymentInvoice;

      if (
        !invoice
        || recordPaymentBusy
      ) {
        return;
      }

      const amount =
        Number(paymentForm.amount);

      if (
        !Number.isFinite(amount)
        || amount <= 0
      ) {
        setError(
          'Enter a payment amount greater than zero.',
        );
        return;
      }

      if (
        amount
        > invoice.balance + 0.001
      ) {
        setError(
          'Payment cannot exceed the current ADBN TECH invoice balance of '
          + bnd(invoice.balance)
          + '.',
        );
        return;
      }

      if (
        !paymentForm.bankAccountId
      ) {
        setError(
          'Choose the ADBN TECH receiving account.',
        );
        return;
      }

      const selectedAccount =
        paymentBankAccounts.find(
          (account) =>
            account.id
            === paymentForm.bankAccountId,
        )
        || null;

      setRecordPaymentBusy(true);
      setPaymentMessage('');
      setPaymentWarning('');
      setError('');

      let result:
        Awaited<
          ReturnType<
            typeof recordAdbnTechPayment
          >
        >;

      try {
        result =
          await recordAdbnTechPayment({
            requestId:
              paymentRequest,
            invoiceId:
              invoice.id,
            amount,
            paymentDate:
              paymentForm.paymentDate,
            method:
              paymentForm.method,
            reference:
              paymentForm.reference,
            bankAccountId:
              paymentForm.bankAccountId,
            note:
              paymentForm.note,
          });
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'ADBN TECH payment could not be recorded.',
        );
        setRecordPaymentBusy(false);
        return;
      }

      const payment:
        AdbnTechPaymentMirror = {
          id: result.paymentId,
          paymentNo: result.receiptNo,
          invoiceId: result.invoiceId,
          invoiceNo:
            result.invoiceNo
            || invoice.invoiceNo,
          customerId:
            invoice.customerId,
          customerNo:
            invoice.customerNo,
          customerName:
            invoice.customerName,
          amount:
            result.amount,
          paymentDate:
            result.paymentDate,
          paymentMethod:
            result.method,
          reference:
            result.reference,
          status: 'Active',
          note:
            paymentForm.note,
          bankAccountId:
            result.bankAccountId,
          bankAccountName:
            result.bankAccountName
            || selectedAccount?.accountName
            || selectedAccount?.bankName
            || '',
          bankAccountType:
            selectedAccount?.accountType
            || '',
          createdAt:
            new Date().toISOString(),
        };

      const recordedMessage =
        (
          result.duplicatePrevented
            ? 'ADBN TECH confirmed existing receipt '
            : 'ADBN TECH recorded receipt '
        )
        + (
          result.receiptNo
          || result.paymentId
        )
        + ' for '
        + bnd(result.amount)
        + '.';

      let syncMessage = '';

      try {
        const currentSpace =
          await getSpace(spaceId);

        const mappedAccountId =
          currentSpace
            ?.externalIntegrationAccountMappings
            ?.[result.bankAccountId]
          || '';

        if (mappedAccountId) {
          const outcome =
            await syncAdbnTechPaymentToBajetBn({
              payment,
              spaceId,
              mappedAccountId,
            });

          if (
            outcome.mode === 'posted'
          ) {
            syncMessage =
              ' Synced to BajetBN Money activity.';

            if (onFinancialSync) {
              await onFinancialSync();
            }
          } else if (
            outcome.mode
            === 'pending_approval'
          ) {
            syncMessage =
              ' BajetBN posting is pending approval.';
          } else {
            syncMessage =
              ' BajetBN posting is queued.';
          }
        } else {
          setPaymentWarning(
            'The ADBN TECH payment is saved, but its receiving account is not mapped to a BajetBN Business account. Open Payments to map the account and sync the receipt.',
          );
        }
      } catch (syncError) {
        setPaymentWarning(
          'The ADBN TECH payment is saved, but BajetBN Money activity did not sync automatically: '
          + (
            syncError instanceof Error
              ? syncError.message
              : 'Sync needs review.'
          ),
        );
      }

      setPaymentMessage(
        recordedMessage
        + syncMessage,
      );

      setRecordPaymentInvoiceId('');
      setPaymentRequest('');

      try {
        await load();
      } finally {
        setRecordPaymentBusy(false);
      }
    };

  if (connectedEmail !== ADBN_TECH_ADMIN_EMAIL) {
    return (
      <section
        className="panel adbn-tech-mirror-connect-v115"
        data-adbn-tech-readonly-connect
      >
        <span className="eyebrow">ADBN TECH bridge</span>
        <h2>Connect the ADBN TECH admin account</h2>
        <p className="muted">
          BajetBN stays signed in as zardeerwandy@gmail.com. A separate Google popup connects only the ADBN TECH Firebase session.
        </p>
        <div className="adbn-tech-mirror-connect-actions-v115">
          <button
            type="button"
            className="button primary"
            disabled={loading}
            onClick={() => void connect()}
          >
            {loading ? 'Connecting…' : 'Connect ADBN TECH'}
          </button>
          <small>Choose {ADBN_TECH_ADMIN_EMAIL} in the Google account picker.</small>
        </div>
        {error && <div className="notice error">{error}</div>}
        <small className="muted">
          Slice 22 can only read ADBN TECH customers and invoices. It does not create, update or delete ADBN TECH records.
        </small>
      </section>
    );
  }

  return (
    <section
      className="business-workspace-embedded-v115 adbn-tech-mirror-v115"
      data-adbn-tech-readonly-workspace={view}
    >
      <div className="business-home-v115-section-heading">
        <div>
          <span>ADBN TECH · Read-only mirror</span>
          <h2>{view === 'customers' ? 'Customers' : 'Invoices'}</h2>
        </div>
      </div>

      <div className="adbn-tech-mirror-meta-v115">
        <span>Connected as <strong>{connectedEmail}</strong></span>
        <span>Customers <strong>{snapshot?.customers.length || 0}</strong></span>
        <span>Invoices <strong>{snapshot?.invoices.length || 0}</strong></span>
      </div>

      <label className="adbn-tech-mirror-search-v115">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            view === 'customers'
              ? 'Name, customer no., email, phone…'
              : 'Invoice no., customer, status…'
          }
        />
      </label>

      {view === 'invoices' && (
        <section
          className="panel"
          data-adbn-tech-invoice-filters
        >
          <div
            data-adbn-tech-invoice-quick-filters
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <button
              type="button"
              className={
                'button compact '
                + (
                  !invoiceStatusFilter
                  && !invoicePaymentFilter
                  && !invoiceSaleTypeFilter
                  && !invoiceDateFilter
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter('');
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              All
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoicePaymentFilter
                  === 'outstanding'
                  && !invoiceDateFilter
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter(
                  'outstanding',
                );
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              Outstanding
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoicePaymentFilter
                  === 'unpaid'
                  && !invoiceDateFilter
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter(
                  'unpaid',
                );
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              Unpaid
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoicePaymentFilter
                  === 'partial'
                  && !invoiceDateFilter
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter(
                  'partial',
                );
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              Partially paid
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoicePaymentFilter
                  === 'paid'
                  && !invoiceDateFilter
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter(
                  'paid',
                );
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              Paid
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoiceDateFilter
                  === 'overdue'
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter('');
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter(
                  'overdue',
                );
              }}
            >
              Overdue
            </button>

            <button
              type="button"
              className={
                'button compact '
                + (
                  invoiceDateFilter
                  === 'month'
                    ? 'primary'
                    : 'secondary'
                )
              }
              onClick={() => {
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter('');
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter(
                  'month',
                );
              }}
            >
              This Month
            </button>
          </div>

          <div className="business-report-filter-grid-v115">
            <label>
              Status
              <select
                value={invoiceStatusFilter}
                onChange={(event) =>
                  setInvoiceStatusFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All statuses
                </option>

                {invoiceStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Payment
              <select
                value={invoicePaymentFilter}
                onChange={(event) =>
                  setInvoicePaymentFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All payments
                </option>
                <option value="outstanding">
                  Outstanding
                </option>
                <option value="unpaid">
                  Unpaid
                </option>
                <option value="partial">
                  Partially paid
                </option>
                <option value="paid">
                  Paid
                </option>
              </select>
            </label>

            <label>
              Sale type
              <select
                value={invoiceSaleTypeFilter}
                onChange={(event) =>
                  setInvoiceSaleTypeFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All sale types
                </option>

                {invoiceSaleTypes.map(
                  (saleType) => (
                    <option
                      key={saleType}
                      value={saleType}
                    >
                      {saleType}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Date
              <select
                value={invoiceDateFilter}
                onChange={(event) =>
                  setInvoiceDateFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All dates
                </option>
                <option value="today">
                  Invoiced today
                </option>
                <option value="month">
                  This month
                </option>
                <option value="overdue">
                  Overdue
                </option>
              </select>
            </label>
          </div>

          <div className="adbn-tech-account-mapping-footer-v115">
            <div>
              <strong>
                Showing {invoices.length}
                {' of '}
                {snapshot?.invoices.length || 0}
              </strong>
              <span>
                {' · Outstanding '}
                {bnd(
                  visibleInvoiceOutstanding,
                )}
              </span>
            </div>

            <button
              type="button"
              className="button secondary compact"
              onClick={() => {
                setQuery('');
                setInvoiceStatusFilter('');
                setInvoicePaymentFilter('');
                setInvoiceSaleTypeFilter('');
                setInvoiceDateFilter('');
              }}
            >
              Clear filters
            </button>
          </div>
        </section>
      )}

      {error && <div className="notice error">{error}</div>}

      {customerLinkMessage && (
        <div
          className="notice success"
          data-adbn-customer-link-success
        >
          {customerLinkMessage}
        </div>
      )}

      {billingSyncMessage && (
        <div
          className="notice success"
          data-adbn-customer-billing-sync-success
        >
          {billingSyncMessage}
        </div>
      )}

      {linkCustomer && (
        <Modal
          title={
            'Link ADBN customer · '
            + (
              linkCustomer.name
              || linkCustomer.customerNo
              || linkCustomer.id
            )
          }
          onClose={() => {
            if (!customerLinkBusy) {
              setLinkCustomer(null);
              setLinkEmail('');
            }
          }}
        >
          <div
            className="form-stack"
            data-adbn-customer-link-modal
          >
            <div className="info-banner">
              <strong>
                Secure customer link only
              </strong>
              <span>
                The customer must sign in to BajetBN with this verified email and explicitly accept. ADBN TECH will not gain access to the customer's Personal accounts, balances, transactions or other private BajetBN records.
              </span>
            </div>

            <label>
              Customer BajetBN email
              <input
                type="email"
                value={linkEmail}
                onChange={(event) =>
                  setLinkEmail(
                    event.target.value,
                  )
                }
                placeholder="customer@example.com"
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={customerLinkBusy}
                onClick={() => {
                  setLinkCustomer(null);
                  setLinkEmail('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button primary"
                disabled={
                  customerLinkBusy
                  || !linkEmail.trim()
                }
                onClick={() =>
                  void submitCustomerLink()
                }
              >
                {customerLinkBusy
                  ? 'Sending…'
                  : 'Send secure link'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {paymentMessage && (
        <div
          className="notice success"
          data-adbn-tech-record-payment-success
        >
          {paymentMessage}
        </div>
      )}

      {paymentWarning && (
        <div
          className="notice"
          data-adbn-tech-record-payment-warning
        >
          {paymentWarning}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="loading-panel">Loading ADBN TECH…</div>
      ) : view === 'customers' ? (
        <div className="adbn-tech-table-wrap-v115">
          <table className="adbn-tech-table-v115">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Since</th>
                <th>BajetBN Link</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((item) => {
                const customerLink =
                  customerLinkByAdbnId.get(
                    item.id,
                  );

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || 'Unnamed customer'}</strong>
                      <small>{item.customerNo || item.id}</small>
                    </td>
                    <td>
                      <span>{item.phone || item.whatsapp || '—'}</span>
                      <small>{item.email || 'No email'}</small>
                    </td>
                    <td>{item.status || '—'}</td>
                    <td>{simpleDate(item.customerSince)}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          {customerLink?.status === 'accepted' ? (
                            <>
                              <strong>
                                Linked
                              </strong>
                              <small>
                                {customerLink.targetEmail}
                              </small>
                            </>
                          ) : customerLink?.status === 'pending' ? (
                            <>
                              <span>
                                Pending
                              </span>
                              <small>
                                {customerLink.targetEmail}
                              </small>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="button secondary compact"
                              data-adbn-customer-link-action
                              onClick={() =>
                                openCustomerLink(item)
                              }
                            >
                              {customerLink?.status === 'declined'
                                ? 'Invite again'
                                : 'Link customer'}
                            </button>
                          )}
                        </div>

                        {customerLink?.status === 'accepted' && (
                          <button
                            type="button"
                            className="button secondary compact"
                            data-adbn-customer-billing-sync
                            disabled={Boolean(billingSyncBusyCustomerId)}
                            onClick={() =>
                              void syncCustomerBilling(
                                item,
                                customerLink,
                              )
                            }
                          >
                            {billingSyncBusyCustomerId === item.id
                              ? 'Syncing…'
                              : 'Sync billing'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="button secondary compact"
                          data-adbn-customer-whatsapp-share
                          disabled={
                            !whatsappNumber(
                              item.whatsapp
                              || item.phone
                              || '',
                            )
                          }
                          title={
                            !whatsappNumber(
                              item.whatsapp
                              || item.phone
                              || '',
                            )
                              ? 'No WhatsApp or phone number is available for this customer'
                              : customerLink?.status === 'accepted'
                                ? 'Share the linked ADBN TECH customer Space on WhatsApp'
                                : customerLink?.status === 'pending'
                                  ? 'Share or resend the BajetBN invitation on WhatsApp'
                                  : customerLink?.status === 'declined'
                                    ? 'Share BajetBN reconnect instructions on WhatsApp'
                                    : 'Share BajetBN onboarding on WhatsApp'
                          }
                          onClick={() =>
                            openAdbnCustomerWhatsappInvite(
                              item,
                              customerLink,
                            )
                          }
                        >
                          <span aria-hidden="true">
                            💬
                          </span>
                          {' '}
                          WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!customers.length && (
                <tr>
                  <td colSpan={5} className="muted">No matching ADBN TECH customers.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {recordPaymentInvoice && (
            <section
              className="panel"
              data-adbn-tech-record-payment
            >
              <div className="business-home-v115-section-heading">
                <div>
                  <span>ADBN TECH · Secured write-back</span>
                  <h3>
                    Record Payment · {recordPaymentInvoice.invoiceNo || recordPaymentInvoice.id}
                  </h3>
                </div>

                <button
                  type="button"
                  className="button secondary"
                  disabled={recordPaymentBusy}
                  onClick={() => {
                    setRecordPaymentInvoiceId('');
                    setPaymentRequest('');
                  }}
                >
                  Cancel
                </button>
              </div>

              <p className="muted">
                This payment is written to ADBN TECH first. ADBN TECH remains the source of truth and issues the official receipt, updates the invoice/payment plan, bank ledger, instalments and next due date.
              </p>

              <div className="business-report-filter-grid-v115">
                <label>
                  Amount
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={recordPaymentInvoice.balance}
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          amount: event.target.value,
                        }),
                      )
                    }
                  />
                  <small>
                    Outstanding {bnd(recordPaymentInvoice.balance)}
                  </small>
                </label>

                <label>
                  Payment date
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          paymentDate: event.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  Method
                  <select
                    value={paymentForm.method}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          method: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="QR Payment">QR Payment</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Received into
                  <select
                    value={paymentForm.bankAccountId}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          bankAccountId: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      Select ADBN TECH account
                    </option>

                    {paymentBankAccounts
                      .filter((account) => account.isActive)
                      .map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {bankAccountLabel(account)}
                          {' · '}
                          {account.currency || 'BND'}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Reference
                  <input
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          reference: event.target.value,
                        }),
                      )
                    }
                    placeholder="Bank reference / optional"
                  />
                </label>

                <label>
                  Note
                  <input
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          note: event.target.value,
                        }),
                      )
                    }
                    placeholder="Optional payment note"
                  />
                </label>
              </div>

              {!paymentBankAccounts.some((account) => account.isActive) && (
                <div className="notice">
                  No active ADBN TECH receiving account is available. Add or reactivate an account in ADBN TECH before recording payment.
                </div>
              )}

              <div className="adbn-tech-account-mapping-footer-v115">
                <div>
                  <strong>
                    {recordPaymentInvoice.customerName || 'Customer'}
                  </strong>
                  <span>
                    {' · '}
                    {recordPaymentInvoice.monthlyAmount > 0
                      ? 'Monthly ' + bnd(recordPaymentInvoice.monthlyAmount)
                      : 'Invoice payment'}
                  </span>
                </div>

                <button
                  type="button"
                  className="button primary"
                  disabled={
                    recordPaymentBusy
                    || !paymentForm.bankAccountId
                    || !paymentForm.amount
                  }
                  onClick={() => void submitRecordPayment()}
                >
                  {recordPaymentBusy
                    ? 'Recording…'
                    : 'Record Payment'}
                </button>
              </div>
            </section>
          )}

          {selectedInvoice && (
            <section
              className="panel adbn-tech-invoice-detail-v115"
              data-adbn-tech-invoice-detail
            >
              <div className="adbn-tech-invoice-detail-heading-v115">
                <div>
                  <span className="eyebrow">ADBN TECH invoice detail</span>
                  <h3>{selectedInvoice.invoiceNo || selectedInvoice.id}</h3>
                  <p className="muted">
                    {selectedInvoice.title
                      || selectedInvoice.saleType
                      || 'ADBN TECH invoice'}
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {selectedInvoice.balance > 0 && (
                    <button
                      type="button"
                      className="button primary"
                      disabled={recordPaymentBusy}
                      onClick={() =>
                        void openRecordPayment(
                          selectedInvoice,
                        )
                      }
                    >
                      Record Payment
                    </button>
                  )}

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setSelectedInvoiceId('')}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="adbn-tech-invoice-detail-grid-v115">
                <div>
                  <span>Customer</span>
                  <strong>{selectedInvoice.customerName || '—'}</strong>
                  <small>
                    {selectedInvoice.customerNo
                      || selectedInvoice.customerEmail
                      || '—'}
                  </small>
                </div>
                <div>
                  <span>Contact</span>
                  <strong>{selectedInvoice.customerPhone || '—'}</strong>
                  <small>{selectedInvoice.customerEmail || 'No email'}</small>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{bnd(selectedInvoice.total)}</strong>
                  <small>Invoice amount</small>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{bnd(selectedInvoice.paid)}</strong>
                  <small>Recorded in ADBN TECH</small>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>{bnd(selectedInvoice.balance)}</strong>
                  <small>Outstanding</small>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedInvoice.status || '—'}</strong>
                  <small>
                    Fulfilment: {selectedInvoice.fulfilmentStatus || '—'}
                  </small>
                </div>
                <div>
                  <span>Invoice date</span>
                  <strong>{simpleDate(selectedInvoice.invoiceDate)}</strong>
                  <small>Created invoice date</small>
                </div>
                <div>
                  <span>Next due</span>
                  <strong>
                    {simpleDate(
                      selectedInvoice.nextDueDate
                      || selectedInvoice.dueDate,
                    )}
                  </strong>
                  <small>
                    Original due: {simpleDate(selectedInvoice.dueDate)}
                  </small>
                </div>
                <div>
                  <span>Payment plan</span>
                  <strong>
                    {selectedInvoice.monthlyAmount > 0
                      ? bnd(selectedInvoice.monthlyAmount) + ' / month'
                      : '—'}
                  </strong>
                  <small>
                    {selectedInvoice.termMonths > 0
                      ? selectedInvoice.termMonths + ' month term'
                      : 'No term recorded'}
                  </small>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{selectedInvoice.source || '—'}</strong>
                  <small>{selectedInvoice.saleType || 'Invoice'}</small>
                </div>
              </div>

              <small className="muted">
                ADBN TECH remains the source of truth. Edit and delete stay in ADBN TECH; Record Payment uses the secured ADBN TECH payment backend.
              </small>
            </section>
          )}

          <div className="adbn-tech-table-wrap-v115">
            <table className="adbn-tech-table-v115">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th aria-label="Invoice actions" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      selectedInvoiceId === item.id
                        ? 'is-selected'
                        : ''
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="adbn-tech-record-link-v115"
                        onClick={() => setSelectedInvoiceId(item.id)}
                      >
                        <strong>{item.invoiceNo || item.id}</strong>
                        <small>{item.saleType || item.title || 'Invoice'}</small>
                      </button>
                    </td>
                    <td>
                      <span>{item.customerName || '—'}</span>
                      <small>{item.customerNo || item.customerEmail || ''}</small>
                    </td>
                    <td>{bnd(item.total)}</td>
                    <td>{bnd(item.paid)}</td>
                    <td>{bnd(item.balance)}</td>
                    <td>{simpleDate(item.nextDueDate || item.dueDate)}</td>
                    <td>
                      <span>
                        {item.status || '—'}
                      </span>
                      <small>
                        {invoicePaymentState(item) === 'partial'
                          ? 'Partially paid'
                          : invoicePaymentState(item) === 'paid'
                            ? 'Paid'
                            : 'Unpaid'}
                      </small>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.4rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="button secondary adbn-tech-view-button-v115"
                          onClick={() => setSelectedInvoiceId(item.id)}
                        >
                          View
                        </button>

                        {item.balance > 0 && (
                          <button
                            type="button"
                            className="button primary compact"
                            disabled={recordPaymentBusy}
                            onClick={() =>
                              void openRecordPayment(
                                item,
                              )
                            }
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr>
                    <td colSpan={8} className="muted">No matching ADBN TECH invoices.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <small className="muted">
        Source of truth: ADBN TECH. Invoice filtering stays local to BajetBN. Record Payment uses the authenticated ADBN TECH callable and the resulting receipt uses the existing ADBN TECH → BajetBN account mapping for Money activity sync.
      </small>
    </section>
  );
}
