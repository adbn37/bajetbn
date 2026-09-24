import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Modal } from '../../components/Modal';
import {
  ADBN_TECH_ADMIN_EMAIL,
  createAdbnTechSupplierPurchase,
  getAdbnTechConnectedEmail,
  loadAdbnTechInventoryReadOnly,
  loadAdbnTechSuppliersReadOnly,
  type AdbnTechInventoryProductMirror,
  type AdbnTechNewSupplierInput,
  type AdbnTechSupplierMirror,
  type AdbnTechSupplierPurchaseLineInput,
} from '../../repositories/adbnTechIntegrationRepository';
import {
  postTransactionWithIdempotencyKey,
} from '../../repositories/transactionRepository';
import type {
  Account,
  PaymentMethodCode,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/money';

type SupplierMode =
  | 'search'
  | 'existing'
  | 'new';

interface NewSupplierDraft {
  name: string;
  vendorType: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  marketplace: string;
  marketplaceLink: string;
  paymentTerms: string;
  address: string;
  notes: string;
}

type LineMode =
  | 'search'
  | 'existing'
  | 'new';

interface PurchaseLineDraft {
  id: string;
  mode: LineMode;
  search: string;
  linkedProductId: string;
  category: string;
  sku: string;
  barcode: string;
  brand: string;
  model: string;
  description: string;
  condition: string;
  quantity: string;
  unitPrice: string;
  sellingPrice: string;
  minimumStock: string;
}

const vendorTypes = [
  'Registered Supplier',
  'Regular / Fixed Vendor',
  'Marketplace Seller',
  'Personal / Individual Seller',
] as const;

function emptySupplierDraft(
  name = '',
): NewSupplierDraft {
  return {
    name,
    vendorType:
      'Registered Supplier',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    marketplace: '',
    marketplaceLink: '',
    paymentTerms: '',
    address: '',
    notes: '',
  };
}

const paymentMethods: Array<{
  value: PaymentMethodCode;
  label: string;
}> = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'e_wallet', label: 'E-wallet' },
  { value: 'qr_payment', label: 'QR payment' },
  { value: 'bank_deposit', label: 'Bank deposit' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

function newLine(): PurchaseLineDraft {
  return {
    id:
      'purchase-line-'
      + crypto.randomUUID(),
    mode: 'search',
    search: '',
    linkedProductId: '',
    category: 'CPU',
    sku: '',
    barcode: '',
    brand: '',
    model: '',
    description: '',
    condition: 'New',
    quantity: '1',
    unitPrice: '',
    sellingPrice: '',
    minimumStock: '1',
  };
}

function decimal(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function bnd(value: number) {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency: 'BND',
    },
  ).format(value || 0);
}

function normalized(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function supplierSearchText(
  supplier: AdbnTechSupplierMirror,
) {
  return [
    supplier.name,
    supplier.vendorType,
    supplier.contactPerson,
    supplier.phone,
    supplier.whatsapp,
    supplier.email,
    supplier.marketplace,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function supplierDuplicate(
  supplier: AdbnTechSupplierMirror,
  candidate: NewSupplierDraft,
) {
  const supplierName =
    normalized(supplier.name);
  const candidateName =
    normalized(candidate.name);

  const supplierEmail =
    normalized(supplier.email);
  const candidateEmail =
    normalized(candidate.email);

  const supplierPhone =
    normalized(
      supplier.phone
      || supplier.whatsapp,
    );
  const candidatePhone =
    normalized(
      candidate.phone
      || candidate.whatsapp,
    );

  if (
    supplierEmail
    && candidateEmail
    && supplierEmail
      === candidateEmail
  ) {
    return true;
  }

  if (
    supplierPhone
    && candidatePhone
    && supplierPhone
      === candidatePhone
  ) {
    return true;
  }

  return Boolean(
    supplierName
    && candidateName
    && supplierName
      === candidateName
  );
}

function productSearchText(
  item: AdbnTechInventoryProductMirror,
) {
  return [
    item.sku,
    item.barcode,
    item.category,
    item.brand,
    item.model,
    item.description,
    item.condition,
    item.supplier,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function strongDuplicate(
  product: AdbnTechInventoryProductMirror,
  line: PurchaseLineDraft,
) {
  const productSku =
    normalized(product.sku);
  const lineSku =
    normalized(line.sku);

  if (
    productSku
    && lineSku
    && productSku === lineSku
  ) {
    return true;
  }

  const productBarcode =
    normalized(product.barcode);
  const lineBarcode =
    normalized(line.barcode);

  if (
    productBarcode
    && lineBarcode
    && productBarcode === lineBarcode
  ) {
    return true;
  }

  return Boolean(
    normalized(product.category)
    && normalized(product.brand)
    && normalized(product.model)
    && normalized(line.category)
    && normalized(line.brand)
    && normalized(line.model)
    && normalized(product.category)
      === normalized(line.category)
    && normalized(product.brand)
      === normalized(line.brand)
    && normalized(product.model)
      === normalized(line.model)
  );
}

function paymentMethodForAdbn(
  value: PaymentMethodCode,
) {
  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export function AdbnTechSupplierPurchaseModal({
  space,
  accounts,
  online,
  onClose,
  onComplete,
}: {
  space: Space;
  accounts: Account[];
  online: boolean;
  onClose: () => void;
  onComplete: (
    message: string,
  ) => void | Promise<void>;
}) {
  const [products, setProducts] =
    useState<
      AdbnTechInventoryProductMirror[]
    >([]);

  const [suppliers, setSuppliers] =
    useState<
      AdbnTechSupplierMirror[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    supplierMode,
    setSupplierMode,
  ] =
    useState<SupplierMode>(
      'search',
    );

  const [
    supplierSearch,
    setSupplierSearch,
  ] =
    useState('');

  const [
    selectedSupplierId,
    setSelectedSupplierId,
  ] =
    useState('');

  const [
    newSupplier,
    setNewSupplier,
  ] =
    useState<NewSupplierDraft>(
      emptySupplierDraft(),
    );

  const [purchaseDate, setPurchaseDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const [reference, setReference] =
    useState('');

  const [note, setNote] =
    useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodCode>(
      'bank_transfer',
    );

  const [accountId, setAccountId] =
    useState('');

  const [deliveryCost, setDeliveryCost] =
    useState('');

  const [otherCost, setOtherCost] =
    useState('');

  const [lines, setLines] =
    useState<PurchaseLineDraft[]>([
      newLine(),
    ]);

  const [requestId] =
    useState(
      () =>
        'adbn_purchase_'
        + crypto
          .randomUUID()
          .replace(/-/g, ''),
    );

  const [
    postedTransactionId,
    setPostedTransactionId,
  ] = useState('');

  const mappings =
    space
      .externalIntegrationAccountMappings
    || {};

  const mappedAccounts =
    useMemo(
      () =>
        accounts
          .map((account) => {
            const mapping =
              Object.entries(
                mappings,
              ).find(
                (
                  [, bajetAccountId],
                ) =>
                  bajetAccountId
                  === account.id,
              );

            return {
              account,
              adbnAccountId:
                mapping?.[0] || '',
            };
          })
          .filter(
            (item) =>
              Boolean(
                item.adbnAccountId,
              ),
          ),
      [accounts, mappings],
    );

  const selectedMapping =
    mappedAccounts.find(
      (item) =>
        item.account.id === accountId,
    );

  const selectedSupplier =
    suppliers.find(
      (supplier) =>
        supplier.id
        === selectedSupplierId,
    );

  const supplierMatches =
    useMemo(
      () => {
        const term =
          supplierSearch
            .trim()
            .toLowerCase();

        if (term.length < 2) {
          return [];
        }

        return suppliers
          .filter(
            (supplier) =>
              supplierSearchText(
                supplier,
              ).includes(term),
          )
          .slice(0, 8);
      },
      [
        supplierSearch,
        suppliers,
      ],
    );

  const supplierDisplayName =
    supplierMode === 'existing'
      ? selectedSupplier?.name || ''
      : supplierMode === 'new'
        ? newSupplier.name.trim()
        : '';

  useEffect(() => {
    if (
      !accountId
      && mappedAccounts.length > 0
    ) {
      setAccountId(
        mappedAccounts[0]
          .account.id,
      );
    }
  }, [
    accountId,
    mappedAccounts,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        if (
          getAdbnTechConnectedEmail()
          !== ADBN_TECH_ADMIN_EMAIL
        ) {
          throw new Error(
            'Connect the ADBN TECH admin account under Business Setup first.',
          );
        }

        const [
          inventorySnapshot,
          supplierSnapshot,
        ] =
          await Promise.all([
            loadAdbnTechInventoryReadOnly(),
            loadAdbnTechSuppliersReadOnly(),
          ]);

        if (!cancelled) {
          setProducts(
            inventorySnapshot.products,
          );
          setSuppliers(
            supplierSnapshot.suppliers,
          );
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              nextError,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal =
    useMemo(
      () =>
        roundMoney(
          lines.reduce(
            (sum, line) =>
              sum
              + (
                decimal(
                  line.quantity,
                )
                * decimal(
                  line.unitPrice,
                )
              ),
            0,
          ),
        ),
      [lines],
    );

  const total =
    roundMoney(
      subtotal
      + decimal(deliveryCost)
      + decimal(otherCost),
    );

  function useExistingSupplier(
    supplier: AdbnTechSupplierMirror,
  ) {
    setSelectedSupplierId(
      supplier.id,
    );
    setSupplierSearch(
      supplier.name,
    );
    setSupplierMode(
      'existing',
    );
    setNewSupplier(
      emptySupplierDraft(),
    );
    setError('');
  }

  function startNewSupplier() {
    if (
      supplierSearch
        .trim()
        .length < 2
    ) {
      setError(
        'Search ADBN suppliers first before creating a new supplier.',
      );
      return;
    }

    setSelectedSupplierId('');
    setNewSupplier(
      emptySupplierDraft(
        supplierSearch.trim(),
      ),
    );
    setSupplierMode('new');
    setError('');
  }

  function resetSupplierSearch() {
    setSelectedSupplierId('');
    setSupplierMode('search');
    setNewSupplier(
      emptySupplierDraft(),
    );
    setError('');
  }

  function updateNewSupplier(
    updates:
      Partial<NewSupplierDraft>,
  ) {
    setNewSupplier(
      (current) => ({
        ...current,
        ...updates,
      }),
    );
  }

  function updateLine(
    id: string,
    updates:
      Partial<PurchaseLineDraft>,
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  ...updates,
                }
              : line,
        ),
    );
  }

  function matches(
    line:
      PurchaseLineDraft,
  ) {
    const term =
      line.search
        .trim()
        .toLowerCase();

    if (
      term.length < 2
    ) {
      return [];
    }

    return products
      .filter(
        (product) =>
          productSearchText(
            product,
          ).includes(term),
      )
      .slice(0, 8);
  }

  function useExisting(
    lineId: string,
    product:
      AdbnTechInventoryProductMirror,
  ) {
    updateLine(
      lineId,
      {
        mode: 'existing',
        linkedProductId:
          product.id,
        category:
          product.category
          || 'Other',
        sku:
          product.sku,
        barcode:
          product.barcode,
        brand:
          product.brand,
        model:
          product.model,
        description:
          product.description,
        condition:
          product.condition
          || 'New',
        sellingPrice:
          product.sellingPrice
            ? String(
                product.sellingPrice,
              )
            : '',
        minimumStock:
          String(
            product.minimumStock
            || 1,
          ),
      },
    );
  }

  function createNew(
    line:
      PurchaseLineDraft,
  ) {
    if (
      line.search
        .trim()
        .length < 2
    ) {
      setError(
        'Search ADBN inventory first before creating a new item.',
      );
      return;
    }

    setError('');

    updateLine(
      line.id,
      {
        mode: 'new',
        linkedProductId: '',
      },
    );
  }

  function resetSearch(
    lineId: string,
  ) {
    updateLine(
      lineId,
      {
        mode: 'search',
        linkedProductId: '',
      },
    );
  }

  function removeLine(
    lineId: string,
  ) {
    if (
      lines.length <= 1
    ) {
      return;
    }

    setLines(
      (current) =>
        current.filter(
          (line) =>
            line.id !== lineId,
        ),
    );
  }

  function validate() {
    if (!online) {
      throw new Error(
        'Connect to the internet before creating an ADBN TECH supplier purchase.',
      );
    }

    if (
      getAdbnTechConnectedEmail()
      !== ADBN_TECH_ADMIN_EMAIL
    ) {
      throw new Error(
        'Connect the ADBN TECH admin account first.',
      );
    }

    if (
      supplierMode === 'search'
    ) {
      throw new Error(
        'Search and choose an existing ADBN supplier, or create a new supplier.',
      );
    }

    if (
      supplierMode === 'existing'
      && !selectedSupplier
    ) {
      throw new Error(
        'Choose an existing ADBN supplier.',
      );
    }

    if (
      supplierMode === 'new'
    ) {
      if (
        !newSupplier.name
          .trim()
      ) {
        throw new Error(
          'Supplier name is required.',
        );
      }

      const duplicate =
        suppliers.find(
          (supplier) =>
            supplierDuplicate(
              supplier,
              newSupplier,
            ),
        );

      if (duplicate) {
        throw new Error(
          `Supplier already exists: ${duplicate.name} `
          + `(ADBN supplier ${duplicate.id}). Use the existing supplier instead.`,
        );
      }
    }

    if (
      !selectedMapping
    ) {
      throw new Error(
        'Choose a BajetBN Business account that is mapped to an ADBN TECH bank or cash account.',
      );
    }

    if (
      total <= 0
    ) {
      throw new Error(
        'Purchase total must be greater than BND 0.00.',
      );
    }

    for (
      let index = 0;
      index < lines.length;
      index += 1
    ) {
      const line =
        lines[index];

      if (
        line.mode === 'search'
      ) {
        throw new Error(
          `Search and choose an existing item or Create New for Item ${index + 1}.`,
        );
      }

      if (
        decimal(
          line.quantity,
        ) <= 0
      ) {
        throw new Error(
          `Enter a valid quantity for Item ${index + 1}.`,
        );
      }

      if (
        decimal(
          line.unitPrice,
        ) < 0
      ) {
        throw new Error(
          `Enter a valid unit cost for Item ${index + 1}.`,
        );
      }

      if (
        line.mode === 'existing'
        && !line.linkedProductId
      ) {
        throw new Error(
          `Choose the existing ADBN inventory item for Item ${index + 1}.`,
        );
      }

      if (
        line.mode === 'new'
      ) {
        if (
          !line.brand.trim()
          || !line.model.trim()
        ) {
          throw new Error(
            `Brand and model are required for new Item ${index + 1}.`,
          );
        }

        const duplicate =
          products.find(
            (product) =>
              strongDuplicate(
                product,
                line,
              ),
          );

        if (duplicate) {
          throw new Error(
            `Possible duplicate found for Item ${index + 1}: `
            + `${duplicate.brand} ${duplicate.model} `
            + `(ADBN product ${duplicate.id}). Use the existing item instead.`,
          );
        }
      }
    }
  }

  function payloadItems():
    AdbnTechSupplierPurchaseLineInput[] {
    return lines.map(
      (line) => ({
        linkedProductId:
          line.mode
            === 'existing'
            ? line.linkedProductId
            : '',
        category:
          line.category,
        sku:
          line.sku,
        barcode:
          line.barcode,
        brand:
          line.brand,
        model:
          line.model,
        description:
          line.description,
        condition:
          line.condition,
        quantity:
          Math.max(
            1,
            Math.floor(
              decimal(
                line.quantity,
              ),
            ),
          ),
        unitPrice:
          roundMoney(
            decimal(
              line.unitPrice,
            ),
          ),
        sellingPrice:
          roundMoney(
            decimal(
              line.sellingPrice,
            ),
          ),
        minimumStock:
          Math.max(
            0,
            Math.floor(
              decimal(
                line.minimumStock,
              ),
            ),
          ),
      }),
    );
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      validate();

      let transactionId =
        postedTransactionId;

      if (!transactionId) {
        const outcome =
          await postTransactionWithIdempotencyKey(
            {
              type: 'expense',
              accountId,
              spaceId:
                space.id,
              amountMinor:
                Math.round(
                  total * 100,
                ),
              currency:
                space.currency,
              transactionDate:
                purchaseDate,
              categoryId:
                'expense-supplier',
              category:
                'Supplier purchase',
              categoryIcon:
                'cart',
              categoryColor:
                'rose',
              categoryScope:
                'business',
              counterparty:
                supplierDisplayName,
              note:
                [
                  reference.trim()
                    ? 'Reference '
                      + reference.trim()
                    : '',
                  note.trim(),
                  'ADBN purchase request '
                    + requestId,
                ]
                  .filter(Boolean)
                  .join(' | '),
              labels: [
                'adbn_tech',
                'adbn_purchase',
                'adbn_buy_'
                  + requestId.slice(-12),
              ],
              paymentMethod,
              paymentMethodLabel:
                paymentMethod
                  === 'other'
                  ? 'Other'
                  : undefined,
            },
            requestId,
          );

        if (
          outcome.mode
          !== 'posted'
          || !outcome.transactionId
        ) {
          throw new Error(
            'The Money Out must be posted before ADBN TECH can create the purchase.',
          );
        }

        transactionId =
          outcome.transactionId;

        setPostedTransactionId(
          transactionId,
        );
      }

      const result =
        await createAdbnTechSupplierPurchase(
          {
            requestId,
            bajetBnTransactionId:
              transactionId,
            bajetBnAmount:
              total,
            purchaseDate,
            supplierId:
              supplierMode
                === 'existing'
                ? selectedSupplierId
                : '',
            newSupplier:
              supplierMode
                === 'new'
                ? ({
                    ...newSupplier,
                    name:
                      newSupplier.name
                        .trim(),
                    phone:
                      (
                        newSupplier.phone
                        || newSupplier.whatsapp
                      ).trim(),
                    whatsapp:
                      (
                        newSupplier.whatsapp
                        || newSupplier.phone
                      ).trim(),
                    status:
                      'Active',
                  } satisfies AdbnTechNewSupplierInput)
                : undefined,
            sellerName:
              supplierDisplayName,
            sellerType:
              supplierMode
                === 'existing'
                ? selectedSupplier?.vendorType
                  || 'Registered Supplier'
                : newSupplier.vendorType,
            supplierReference:
              reference.trim(),
            paymentMethod:
              paymentMethodForAdbn(
                paymentMethod,
              ),
            bankAccountId:
              selectedMapping
                ?.adbnAccountId
              || '',
            note:
              note.trim(),
            deliveryCost:
              roundMoney(
                decimal(
                  deliveryCost,
                ),
              ),
            otherCost:
              roundMoney(
                decimal(
                  otherCost,
                ),
              ),
            items:
              payloadItems(),
          },
        );

      await onComplete(
        `Supplier purchase ${result.purchaseNo} created in ADBN TECH and linked to BajetBN Money Out. Stock has not changed yet.`,
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

  function close() {
    if (busy) {
      return;
    }

    if (
      postedTransactionId
    ) {
      setError(
        'The BajetBN Money Out is already posted. Finish or retry the ADBN TECH purchase link before closing this form.',
      );
      return;
    }

    onClose();
  }

  return (
    <Modal
      title="Supplier purchase + ADBN inventory"
      onClose={close}
    >
      <form
        className="transaction-form"
        onSubmit={submit}
        data-adbn-tech-supplier-purchase-builder
      >
        <div className="info-banner">
          <strong>
            Search ADBN supplier and inventory first
          </strong>
          <span>
            Existing suppliers keep the same ADBN supplier ID, and existing PC parts keep the same ADBN product ID.
            New suppliers and products are allowed only after searching, with duplicate checks again on the ADBN server.
          </span>
        </div>

        {postedTransactionId && (
          <div className="notice warning">
            <strong>
              Money Out already saved
            </strong>
            <span>
              Retry will only finish the ADBN purchase link. It will not create another Money Out.
            </span>
          </div>
        )}

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-panel">
            Loading ADBN TECH suppliers and inventory…
          </div>
        ) : (
          <>
            <section
              className="panel"
              data-adbn-tech-supplier-picker
            >
              <strong>
                Supplier
              </strong>

              {supplierMode
                === 'search'
                && (
                  <>
                    <label>
                      Search ADBN suppliers
                      <input
                        value={supplierSearch}
                        onChange={(event) =>
                          setSupplierSearch(
                            event.target.value,
                          )
                        }
                        placeholder="Supplier name, contact, phone, email, marketplace…"
                        autoComplete="off"
                      />
                    </label>

                    {supplierSearch
                      .trim()
                      .length < 2 ? (
                      <small className="muted">
                        Type at least 2 characters before creating a new supplier.
                      </small>
                    ) : (
                      <>
                        {supplierMatches.length > 0 ? (
                          <div className="transaction-inline-file-list">
                            {supplierMatches.map(
                              (supplier) => (
                                <div
                                  className="transaction-inline-file-row"
                                  key={supplier.id}
                                >
                                  <div>
                                    <strong>
                                      {supplier.name}
                                    </strong>
                                    <small>
                                      {supplier.vendorType}
                                      {supplier.phone
                                        ? ` · ${supplier.phone}`
                                        : ''}
                                      {supplier.email
                                        ? ` · ${supplier.email}`
                                        : ''}
                                      {' · ID '}
                                      {supplier.id}
                                    </small>
                                  </div>

                                  <button
                                    type="button"
                                    className="button secondary compact"
                                    onClick={() =>
                                      useExistingSupplier(
                                        supplier,
                                      )
                                    }
                                  >
                                    Use supplier
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="notice">
                            No matching ADBN supplier found.
                          </div>
                        )}

                        <button
                          type="button"
                          className="button secondary"
                          onClick={
                            startNewSupplier
                          }
                        >
                          + Create new supplier
                        </button>
                      </>
                    )}
                  </>
                )}

              {supplierMode
                === 'existing'
                && selectedSupplier
                && (
                  <>
                    <div className="info-banner">
                      <strong>
                        Existing ADBN supplier linked
                      </strong>
                      <span>
                        {selectedSupplier.name}
                        {' · '}
                        {selectedSupplier.vendorType}
                        {' · ID '}
                        {selectedSupplier.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={
                        resetSupplierSearch
                      }
                    >
                      Search another supplier
                    </button>
                  </>
                )}

              {supplierMode
                === 'new'
                && (
                  <>
                    <div className="notice warning">
                      This will create a new supplier in ADBN TECH when the purchase is saved.
                      ADBN will re-check name, phone/WhatsApp and email for duplicates.
                    </div>

                    {(() => {
                      const duplicate =
                        suppliers.find(
                          (supplier) =>
                            supplierDuplicate(
                              supplier,
                              newSupplier,
                            ),
                        );

                      return duplicate ? (
                        <div className="notice error">
                          Possible duplicate: {duplicate.name}
                          {' · '}
                          {duplicate.vendorType}
                          {' · ID '}
                          {duplicate.id}. Use the existing supplier instead.
                        </div>
                      ) : null;
                    })()}

                    <div className="form-grid">
                      <label>
                        Supplier name
                        <input
                          value={newSupplier.name}
                          onChange={(event) =>
                            updateNewSupplier({
                              name:
                                event.target.value,
                            })
                          }
                          required
                        />
                      </label>

                      <label>
                        Vendor type
                        <select
                          value={newSupplier.vendorType}
                          onChange={(event) =>
                            updateNewSupplier({
                              vendorType:
                                event.target.value,
                            })
                          }
                        >
                          {vendorTypes.map(
                            (value) => (
                              <option
                                key={value}
                                value={value}
                              >
                                {value}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        Contact person
                        <input
                          value={newSupplier.contactPerson}
                          onChange={(event) =>
                            updateNewSupplier({
                              contactPerson:
                                event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Phone / WhatsApp
                        <input
                          value={newSupplier.phone}
                          onChange={(event) =>
                            updateNewSupplier({
                              phone:
                                event.target.value,
                              whatsapp:
                                event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Email
                        <input
                          type="email"
                          value={newSupplier.email}
                          onChange={(event) =>
                            updateNewSupplier({
                              email:
                                event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Marketplace
                        <input
                          value={newSupplier.marketplace}
                          onChange={(event) =>
                            updateNewSupplier({
                              marketplace:
                                event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Marketplace / profile link
                        <input
                          value={newSupplier.marketplaceLink}
                          onChange={(event) =>
                            updateNewSupplier({
                              marketplaceLink:
                                event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Payment terms
                        <input
                          value={newSupplier.paymentTerms}
                          onChange={(event) =>
                            updateNewSupplier({
                              paymentTerms:
                                event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label>
                      Address
                      <textarea
                        value={newSupplier.address}
                        onChange={(event) =>
                          updateNewSupplier({
                            address:
                              event.target.value,
                          })
                        }
                        rows={2}
                      />
                    </label>

                    <label>
                      Supplier notes
                      <textarea
                        value={newSupplier.notes}
                        onChange={(event) =>
                          updateNewSupplier({
                            notes:
                              event.target.value,
                          })
                        }
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="button secondary compact"
                      onClick={
                        resetSupplierSearch
                      }
                    >
                      Back to supplier search
                    </button>
                  </>
                )}
            </section>

            <div className="form-grid">
              <label>
                Purchase date
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(event) =>
                    setPurchaseDate(
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label>
                Paid from
                <select
                  value={accountId}
                  onChange={(event) =>
                    setAccountId(
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">
                    Choose mapped Business account
                  </option>

                  {mappedAccounts.map(
                    ({
                      account,
                      adbnAccountId,
                    }) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                        {' · ADBN '}
                        {adbnAccountId}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value as PaymentMethodCode,
                    )
                  }
                >
                  {paymentMethods.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Supplier reference / receipt no.
                <input
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target.value,
                    )
                  }
                  maxLength={180}
                />
              </label>
            </div>

            {mappedAccounts.length === 0 && (
              <div className="notice warning">
                No BajetBN Business account is mapped to an ADBN TECH bank/cash account.
                Set the account mapping under Payments before creating this purchase.
              </div>
            )}

            <h3>
              Purchase items
            </h3>

            {lines.map(
              (
                line,
                index,
              ) => {
                const selected =
                  products.find(
                    (product) =>
                      product.id
                      === line.linkedProductId,
                  );

                const lineMatches =
                  matches(line);

                const duplicate =
                  line.mode
                    === 'new'
                    ? products.find(
                        (product) =>
                          strongDuplicate(
                            product,
                            line,
                          ),
                      )
                    : undefined;

                return (
                  <section
                    className="panel"
                    key={line.id}
                  >
                    <div className="header-actions">
                      <strong>
                        Item {index + 1}
                      </strong>

                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="button secondary compact"
                          onClick={() =>
                            removeLine(
                              line.id,
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {line.mode
                      === 'search'
                      && (
                        <>
                          <label>
                            Search existing ADBN item
                            <input
                              value={line.search}
                              onChange={(event) =>
                                updateLine(
                                  line.id,
                                  {
                                    search:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              placeholder="SKU, barcode, brand, model, category…"
                              autoFocus={
                                index === 0
                              }
                            />
                          </label>

                          {line.search
                            .trim()
                            .length < 2 ? (
                            <small className="muted">
                              Type at least 2 characters before creating a new item.
                            </small>
                          ) : (
                            <>
                              {lineMatches.length > 0 ? (
                                <div className="transaction-inline-file-list">
                                  {lineMatches.map(
                                    (product) => (
                                      <div
                                        className="transaction-inline-file-row"
                                        key={product.id}
                                      >
                                        <div>
                                          <strong>
                                            {[
                                              product.brand,
                                              product.model,
                                            ]
                                              .filter(Boolean)
                                              .join(' ')
                                              || product.sku}
                                          </strong>
                                          <small>
                                            {product.category || 'Other'}
                                            {' · '}
                                            {product.sku || 'No SKU'}
                                            {' · Stock '}
                                            {product.stock}
                                            {' · Available '}
                                            {product.availableStock}
                                            {' · ID '}
                                            {product.id}
                                          </small>
                                        </div>

                                        <button
                                          type="button"
                                          className="button secondary compact"
                                          onClick={() =>
                                            useExisting(
                                              line.id,
                                              product,
                                            )
                                          }
                                        >
                                          Use this item
                                        </button>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <div className="notice">
                                  No matching ADBN inventory item found for this search.
                                </div>
                              )}

                              <button
                                type="button"
                                className="button secondary"
                                onClick={() =>
                                  createNew(
                                    line,
                                  )
                                }
                              >
                                Create new inventory item
                              </button>
                            </>
                          )}
                        </>
                      )}

                    {line.mode
                      === 'existing'
                      && selected
                      && (
                        <>
                          <div className="info-banner">
                            <strong>
                              Existing ADBN item linked
                            </strong>
                            <span>
                              {[
                                selected.brand,
                                selected.model,
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              {' · '}
                              {selected.category || 'Other'}
                              {' · ID '}
                              {selected.id}
                              {' · Stock '}
                              {selected.stock}
                              {' · Available '}
                              {selected.availableStock}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="button secondary compact"
                            onClick={() =>
                              resetSearch(
                                line.id,
                              )
                            }
                          >
                            Search another item
                          </button>
                        </>
                      )}

                    {line.mode
                      === 'new'
                      && (
                        <>
                          <div className="notice warning">
                            New ADBN inventory item. The ADBN server will run the duplicate check again before accepting the purchase.
                          </div>

                          {duplicate && (
                            <div className="notice error">
                              Possible duplicate: {duplicate.brand} {duplicate.model} · {duplicate.category} · ID {duplicate.id}.
                              Use the existing item instead.
                            </div>
                          )}

                          <div className="form-grid">
                            <label>
                              Category
                              <input
                                value={line.category}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      category:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                required
                              />
                            </label>

                            <label>
                              Brand
                              <input
                                value={line.brand}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      brand:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                required
                              />
                            </label>

                            <label>
                              Model
                              <input
                                value={line.model}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      model:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                required
                              />
                            </label>

                            <label>
                              SKU
                              <input
                                value={line.sku}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      sku:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />
                            </label>

                            <label>
                              Barcode
                              <input
                                value={line.barcode}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      barcode:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />
                            </label>

                            <label>
                              Condition
                              <select
                                value={line.condition}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      condition:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              >
                                <option value="New">
                                  New
                                </option>
                                <option value="Used">
                                  Used
                                </option>
                                <option value="Refurbished">
                                  Refurbished
                                </option>
                                <option value="Open Box">
                                  Open Box
                                </option>
                              </select>
                            </label>

                            <label>
                              Selling price
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.sellingPrice}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      sellingPrice:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />
                            </label>

                            <label>
                              Minimum stock
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={line.minimumStock}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      minimumStock:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />
                            </label>
                          </div>

                          <label>
                            Description
                            <input
                              value={line.description}
                              onChange={(event) =>
                                updateLine(
                                  line.id,
                                  {
                                    description:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            />
                          </label>

                          <button
                            type="button"
                            className="button secondary compact"
                            onClick={() =>
                              resetSearch(
                                line.id,
                              )
                            }
                          >
                            Back to inventory search
                          </button>
                        </>
                      )}

                    {line.mode
                      !== 'search'
                      && (
                        <div className="form-grid">
                          <label>
                            Quantity
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(
                                  line.id,
                                  {
                                    quantity:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              required
                            />
                          </label>

                          <label>
                            Unit cost (BND)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(event) =>
                                updateLine(
                                  line.id,
                                  {
                                    unitPrice:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              required
                            />
                          </label>

                          <div>
                            <span>
                              Line total
                            </span>
                            <strong>
                              {bnd(
                                roundMoney(
                                  decimal(
                                    line.quantity,
                                  )
                                  * decimal(
                                    line.unitPrice,
                                  ),
                                ),
                              )}
                            </strong>
                          </div>
                        </div>
                      )}
                  </section>
                );
              },
            )}

            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setLines(
                  (current) => [
                    ...current,
                    newLine(),
                  ],
                )
              }
            >
              + Add another PC part
            </button>

            <div className="form-grid">
              <label>
                Delivery / shipping
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryCost}
                  onChange={(event) =>
                    setDeliveryCost(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Other purchase cost
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherCost}
                  onChange={(event) =>
                    setOtherCost(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value,
                  )
                }
                rows={3}
              />
            </label>

            <dl className="detail-list">
              <div>
                <dt>
                  Items subtotal
                </dt>
                <dd>
                  {bnd(subtotal)}
                </dd>
              </div>

              <div>
                <dt>
                  Delivery / shipping
                </dt>
                <dd>
                  {bnd(
                    decimal(
                      deliveryCost,
                    ),
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Other cost
                </dt>
                <dd>
                  {bnd(
                    decimal(
                      otherCost,
                    ),
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Money Out total
                </dt>
                <dd>
                  <strong>
                    {bnd(total)}
                  </strong>
                </dd>
              </div>
            </dl>

            <div className="notice">
              Saving creates one BajetBN Money Out and a paid ADBN supplier purchase.
              Inventory stock does not increase until the parts are explicitly received.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={
                  busy
                  || Boolean(
                    postedTransactionId,
                  )
                }
                onClick={close}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button primary"
                disabled={
                  busy
                  || !online
                  || loading
                  || mappedAccounts.length
                    === 0
                  || total <= 0
                }
              >
                {busy
                  ? postedTransactionId
                    ? 'Linking ADBN purchase…'
                    : 'Saving Money Out…'
                  : postedTransactionId
                    ? 'Retry ADBN purchase link'
                    : `Save supplier purchase · ${formatMoney(
                        Math.round(
                          total * 100,
                        ),
                        space.currency,
                      )}`}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
