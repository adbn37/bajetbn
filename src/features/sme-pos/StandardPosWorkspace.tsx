import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import { SmePosBarcodeInventoryPanel } from '../../components/SmePosBarcodeInventoryPanel';
import { SmePosBarcodeCheckoutScanner } from '../../components/SmePosBarcodeCheckoutScanner';
import { SmePosBarcodeLabelDialog } from '../../components/SmePosBarcodeLabelDialog';
import { SmePosBarcodeReturnScanner } from '../../components/SmePosBarcodeReturnScanner';
import { SmePosItemPhoto, SmePosItemPhotoField } from '../../components/SmePosItemPhoto';
import { SmePosPaymentSplitEditor, createSmePosPaymentDraft, paymentDraftTotalMinor, paymentDraftsToInput, type SmePosPaymentDraft } from '../../components/SmePosPaymentSplitEditor';
import { SmePosCreateReservationModal, SmePosReservationsPanel } from '../../components/SmePosReservations';
import {
  checkoutStandardPos,
  deleteSmePosCustomer,
  deleteSmePosProductPermanently,
  deleteSmePosItemPhoto,
  getSmePosStaffWorkspace,
  listSmePosCustomers,
  listSmePosPaymentAccounts,
  listSmePosProducts,
  listSmePosReservations,
  listSmePosSales,
  receiveSmePosProductStock,
  registerExistingSmePosProduct,
  returnSmePosSale,
  deleteSmePosSalePermanently,
  voidSmePosSale,  saveSmePosCustomer,
  saveSmePosProduct,
  setSmePosProductArchived,
  updateSmePosProductStock,
  uploadSmePosItemPhoto,
} from '../../repositories/smePosRepository';
import type {
  SmePosCustomer,
  SmePosListingCondition,
  SmePosPaymentAccount,
  SmePosProduct,
  SmePosReservation,
  SmePosRole,
  SmePosSale,
  SmePosSettings,
  Space,
} from '../../types/models';
import { getErrorMessage } from '../../utils/errors';
import { formatMoney, toMinorUnits } from '../../utils/money';

interface Props {
  space: Space;
  settings: SmePosSettings;
  role: SmePosRole;
  onChanged: () => Promise<void> | void;
}

type WorkspaceTab = 'products' | 'customers' | 'register' | 'bookings' | 'sales';
type ProductStockMode = 'physical' | 'unlimited';
type ConfirmPayload =
  | { kind: 'product'; id: string; action?: 'archive' | 'delete' }
  | { kind: 'customer'; id: string };

interface ReturnFormState {
  sale: SmePosSale;
  quantities: Record<string, number>;
  returnDate: string;
  reason: string;
}


interface VoidSaleFormState {
  sale: SmePosSale;
  voidDate: string;
  reason: string;
}

interface DeleteSaleFormState {
  sale: SmePosSale;
  reason: string;
  confirmation: string;
}
interface StandardQuickCartItem {
  clientId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
}

const conditionLabels: Record<SmePosListingCondition, string> = {
  new: 'New',
  sealed: 'Sealed',
  open_box: 'Open box',
  used: 'Used',
  other: 'Other',
};



const tabLabels: Record<WorkspaceTab, string> = {
  products: 'Products',
  customers: 'Customers',
  register: 'Open Register',
  bookings: 'Bookings',
  sales: 'Sales & reports',
};

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function tabsForRole(role: SmePosRole): WorkspaceTab[] {
  if (role === 'owner' || role === 'manager') return ['register', 'products', 'customers', 'bookings', 'sales'];
  if (role === 'cashier') return ['register', 'customers', 'bookings', 'sales'];
  if (role === 'stock_staff') return ['products'];
  if (role === 'viewer') return ['products', 'customers'];
  return [];
}

function initialTab(role: SmePosRole): WorkspaceTab {
  if (role === 'stock_staff' || role === 'viewer') return 'products';
  return 'register';
}

export function StandardPosWorkspace({ space, settings, role, onChanged }: Props) {
  const availableTabs = useMemo(() => tabsForRole(role), [role]);
  const [tab, setTab] = useState<WorkspaceTab>(() => initialTab(role));
  const [products, setProducts] = useState<SmePosProduct[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sales, setSales] = useState<SmePosSale[]>([]);
  const [reservations, setReservations] = useState<SmePosReservation[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<SmePosPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productForm, setProductForm] = useState<SmePosProduct | 'new' | null>(null);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [productStockMode, setProductStockMode] = useState<ProductStockMode>('physical');
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null);
  const [removeProductPhoto, setRemoveProductPhoto] = useState(false);
  const [manualProductForm, setManualProductForm] = useState(false);
  const [manualProductPhotoFile, setManualProductPhotoFile] = useState<File | null>(null);
  const [manualProductCondition, setManualProductCondition] = useState<SmePosListingCondition>('new');
  const [stockForm, setStockForm] = useState<SmePosProduct | null>(null);
  const [receiveForm, setReceiveForm] = useState<SmePosProduct | null>(null);
  const [stocktakeForm, setStocktakeForm] = useState<SmePosProduct | null>(null);
  const [labelItems, setLabelItems] = useState<SmePosProduct[] | null>(null);
  const [customerForm, setCustomerForm] = useState<SmePosCustomer | 'new' | null>(null);
  const [receipt, setReceipt] = useState<SmePosSale | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnFormState | null>(null);
  const [voidForm, setVoidForm] = useState<VoidSaleFormState | null>(null);
  const [deleteSaleForm, setDeleteSaleForm] = useState<DeleteSaleFormState | null>(null);  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [quickItems, setQuickItems] = useState<StandardQuickCartItem[]>([]);
  const [quickAddForm, setQuickAddForm] = useState(false);
  const [bookingForm, setBookingForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [paymentRows, setPaymentRows] = useState<SmePosPaymentDraft[]>([createSmePosPaymentDraft(settings.defaultPaymentAccountId || '', 0)]);
  const [discount, setDiscount] = useState('0.00');
  const [saleDate, setSaleDate] = useState(today());
  const [checkoutNote, setCheckoutNote] = useState('');

  const canManageProducts = ['owner', 'manager'].includes(role);
  const canManageStock = ['owner', 'manager', 'stock_staff'].includes(role);
  const canManageCustomers = ['owner', 'manager', 'cashier'].includes(role);
  const canDeleteCustomers = role === 'owner';
  const canRegisterExistingStock = ['owner', 'manager', 'cashier'].includes(role);
  const canCheckout = ['owner', 'manager', 'cashier'].includes(role);
  const canManageReturns = role === 'owner' || role === 'manager';
  const canVoidSales = role === 'owner';
  const canDeleteSales = role === 'owner';  const canViewReports = ['owner', 'manager'].includes(role);
  const canViewSales = ['owner', 'manager', 'cashier'].includes(role);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (role === 'cashier' || role === 'viewer') {
        const [workspace, nextPaymentAccounts] = await Promise.all([
          getSmePosStaffWorkspace(space.id),
          role === 'cashier' ? listSmePosPaymentAccounts(space.id) : Promise.resolve([]),
        ]);
        setProducts(workspace.products);
        setCustomers(workspace.customers);
        setSales(workspace.sales);
        setPaymentAccounts(nextPaymentAccounts);
      } else if (role === 'stock_staff') {
        const workspace = await getSmePosStaffWorkspace(space.id);
        setProducts(workspace.products);
        setCustomers([]);
        setSales([]);
        setPaymentAccounts([]);
      } else {
        const [nextProducts, nextCustomers, nextSales, nextPaymentAccounts] = await Promise.all([
          listSmePosProducts(space.id),
          listSmePosCustomers(space.id),
          listSmePosSales(space.id),
          listSmePosPaymentAccounts(space.id),
        ]);
        setProducts(nextProducts);
        setCustomers(nextCustomers);
        setSales(nextSales);
        setPaymentAccounts(nextPaymentAccounts);
      }
      if (['owner', 'manager', 'cashier'].includes(role)) setReservations(await listSmePosReservations(space.id));
      else setReservations([]);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [space.id, role]);
  useEffect(() => {
    if (!availableTabs.includes(tab)) setTab(initialTab(role));
  }, [availableTabs, role, tab]);
  useEffect(() => {
    if (!settings.defaultPaymentAccountId) return;
    setPaymentRows((current) => current.map((row, index) => index === 0 && !row.accountId ? { ...row, accountId: settings.defaultPaymentAccountId || '' } : row));
  }, [settings.defaultPaymentAccountId]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((item) => !term || [item.name, item.category, item.sku, item.barcode].some((value) => value?.toLowerCase().includes(term)));
  }, [products, search]);

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return product ? { product, quantity } : null;
  }).filter((item): item is { product: SmePosProduct; quantity: number } => Boolean(item)), [cart, products]);

  const quickSubtotalMinor = quickItems.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.product.sellingPriceMinor * item.quantity, 0) + quickSubtotalMinor;
  let discountMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  useEffect(() => {
    setPaymentRows((current) => current.length === 1 ? [{ ...current[0], amount: (totalMinor / 100).toFixed(2) }] : current);
  }, [totalMinor]);
  const monthPrefix = today().slice(0, 7);
  const todaySales = sales.filter((item) => item.saleDate === today() && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthSales = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthProfit = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.profitMinor, 0);
  const lowStock = products.filter((item) => item.trackStock && Math.max(0, item.quantityOnHand - (item.reservedQuantity || 0)) <= item.lowStockLevel).length;

  function requireOnline() {
    if (navigator.onLine) return true;
    setError('Connect to the internet to change shop records or complete checkout.');
    return false;
  }

  function openProductForm(value: SmePosProduct | 'new', barcode = '') {
    setProductStockMode(value === 'new' || value.trackStock ? 'physical' : 'unlimited');
    setNewProductBarcode(value === 'new' ? barcode : '');
    setProductPhotoFile(null);
    setRemoveProductPhoto(false);
    setProductForm(value);
  }

  function openManualProductForm() {
    setManualProductPhotoFile(null);
    setManualProductCondition('new');
    setManualProductForm(true);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const trackStock = String(form.get('itemType') || 'physical') === 'physical';
    const existingPhotoPath = productForm === 'new' ? null : productForm.photoPath || null;
    let uploadedPhotoPath: string | null = null;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (productPhotoFile) uploadedPhotoPath = (await uploadSmePosItemPhoto(space.id, productPhotoFile)).photoPath;
      const photoPath = uploadedPhotoPath || (removeProductPhoto ? null : existingPhotoPath);
      await saveSmePosProduct({
        spaceId: space.id,
        productId: productForm === 'new' ? undefined : productForm.id,
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        barcode: String(form.get('barcode') || ''),
        photoPath,
        note: String(form.get('note') || ''),
        condition: String(form.get('condition') || 'new') as SmePosListingCondition,
        conditionNote: String(form.get('conditionNote') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        costPriceMinor: role === 'cashier' ? null : String(form.get('costPrice') || '').trim() ? toMinorUnits(String(form.get('costPrice'))) : null,
        trackStock,
        quantityOnHand: trackStock ? Number(form.get('quantity') || 0) : 0,
        lowStockLevel: trackStock ? Number(form.get('lowStock') || 0) : 0,
      });
      if (existingPhotoPath && existingPhotoPath !== photoPath) void deleteSmePosItemPhoto(existingPhotoPath).catch(() => undefined);
      setProductForm(null); setProductPhotoFile(null); setRemoveProductPhoto(false); setNewProductBarcode('');
      setSuccess(productForm === 'new' ? 'Product added.' : 'Product updated.');
      await load(); await onChanged();
    } catch (nextError) {
      if (uploadedPhotoPath) void deleteSmePosItemPhoto(uploadedPhotoPath).catch(() => undefined);
      setError(getErrorMessage(nextError));
    } finally { setBusy(false); }
  }

  async function registerExistingProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualProductForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    let uploadedPhotoPath: string | null = null;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (manualProductPhotoFile) uploadedPhotoPath = (await uploadSmePosItemPhoto(space.id, manualProductPhotoFile)).photoPath;
      await registerExistingSmePosProduct({
        spaceId: space.id,
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        barcode: String(form.get('barcode') || ''),
        photoPath: uploadedPhotoPath,
        note: String(form.get('note') || ''),
        condition: manualProductCondition,
        conditionNote: String(form.get('conditionNote') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        costPriceMinor: role === 'cashier' ? null : String(form.get('costPrice') || '').trim() ? toMinorUnits(String(form.get('costPrice'))) : null,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setManualProductForm(false); setManualProductPhotoFile(null);
      setSuccess('Existing stock registered and added to Inventory.');
      await load(); await onChanged();
    } catch (nextError) {
      if (uploadedPhotoPath) void deleteSmePosItemPhoto(uploadedPhotoPath).catch(() => undefined);
      setError(getErrorMessage(nextError));
    } finally { setBusy(false); }
  }

  async function saveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateSmePosProductStock({
        spaceId: space.id,
        productId: stockForm.id,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setStockForm(null);
      setSuccess('Stock updated.');
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function receiveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receiveForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const quantityReceived = Math.floor(Number(form.get('quantityReceived') || 0));
    if (quantityReceived < 1) { setError('Enter at least one received unit.'); return; }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await receiveSmePosProductStock({
        spaceId: space.id,
        productId: receiveForm.id,
        quantityReceived,
        note: String(form.get('note') || ''),
      });
      const name = receiveForm.name;
      setReceiveForm(null);
      setSuccess(`Received ${quantityReceived} unit(s) of ${name}. New stock: ${result.data.quantityOnHand}.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function saveStocktake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stocktakeForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const countedQuantity = Math.floor(Number(form.get('countedQuantity') || 0));
    if (countedQuantity < 0 || countedQuantity > 999999) { setError('Enter a physical count from 0 to 999999.'); return; }
    const previousQuantity = stocktakeForm.quantityOnHand;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateSmePosProductStock({
        spaceId: space.id,
        productId: stocktakeForm.id,
        quantityOnHand: countedQuantity,
        lowStockLevel: stocktakeForm.lowStockLevel,
        stocktake: true,
        note: String(form.get('note') || ''),
      });
      const difference = countedQuantity - previousQuantity;
      const name = stocktakeForm.name;
      setStocktakeForm(null);
      setSuccess(`Stocktake saved for ${name}. Difference: ${difference >= 0 ? '+' : ''}${difference}.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await saveSmePosCustomer({
        spaceId: space.id,
        customerId: customerForm === 'new' ? undefined : customerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
      });
      setCustomerForm(null);
      setSuccess(customerForm === 'new' ? 'Customer added.' : 'Customer updated.');
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function archiveConfirmed() {
    if (!confirm || !requireOnline()) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (confirm.payload.kind === 'product') {
        if (confirm.payload.action === 'delete') {
          const result = await deleteSmePosProductPermanently(
            space.id,
            confirm.payload.id,
          );

          if (result.data.photoPath) {
            await deleteSmePosItemPhoto(result.data.photoPath).catch(() => undefined);
          }

          setSuccess('Product permanently deleted.');
        } else {
          await setSmePosProductArchived(
            space.id,
            confirm.payload.id,
            true,
          );

          setSuccess('Product moved to archived records.');
        }
      } else {
        const result = await deleteSmePosCustomer(space.id, confirm.payload.id);
        setSuccess(result.data.preservedHistory ? 'Customer deleted. Historical sales and receipts were preserved.' : 'Customer deleted.');
      }
      setConfirm(null);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function availableQuantity(product: SmePosProduct) {
    return product.trackStock ? Math.max(0, product.quantityOnHand - (product.reservedQuantity || 0)) : product.quantityOnHand;
  }

  function addToCart(product: SmePosProduct) {
    const available = availableQuantity(product);
    if (product.trackStock && available < 1) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setError('');
    setCart((current) => {
      const next = (current[product.id] || 0) + 1;
      if (product.trackStock && next > available) return current;
      return { ...current, [product.id]: next };
    });
  }

  function changeQuantity(product: SmePosProduct, value: number) {
    const next = Math.max(0, Math.floor(value));
    setCart((current) => {
      const result = { ...current };
      if (next === 0) delete result[product.id];
      else result[product.id] = product.trackStock ? Math.min(next, availableQuantity(product)) : next;
      return result;
    });
  }

  function addQuickItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const name = String(data.get('name') || '').trim();
      const quantity = Math.max(1, Math.floor(Number(data.get('quantity')) || 1));
      const unitPriceMinor = toMinorUnits(String(data.get('price') || '0'));
      if (!name || unitPriceMinor <= 0) throw new Error('Enter an item name and selling price.');
      setQuickItems((current) => [...current, { clientId: crypto.randomUUID(), name, quantity, unitPriceMinor }]);
      setQuickAddForm(false);
      setSuccess(`${name} added to this sale only.`);
      setError('');
    } catch (nextError) { setError(getErrorMessage(nextError)); }
  }

  function changeQuickQuantity(clientId: string, value: number) {
    const next = Math.max(0, Math.floor(value));
    setQuickItems((current) => next === 0 ? current.filter((item) => item.clientId !== clientId) : current.map((item) => item.clientId === clientId ? { ...item, quantity: next } : item));
  }

  async function completeCheckout(event: FormEvent) {
    event.preventDefault();
    if (!requireOnline()) return;
    if (!cartLines.length && !quickItems.length) { setError('Add at least one product or Quick Add item to the sale.'); return; }
    const unavailable = cartLines.find(({ product, quantity }) => product.trackStock && availableQuantity(product) < quantity);
    if (unavailable) { setError(`${unavailable.product.name} is out of stock or no longer has enough quantity.`); return; }
    if (paymentRows.some((row) => !row.accountId)) { setError('Choose an account for each payment.'); return; }
    if (paymentDraftTotalMinor(paymentRows) !== totalMinor) { setError('Split payments must add up exactly to the sale total.'); return; }
    if (discountMinor >= subtotalMinor) { setError('Discount must be less than the subtotal.'); return; }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await checkoutStandardPos({
        spaceId: space.id,
        items: cartLines.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        quickItems,
        customerId: customerId || null,
        payments: paymentDraftsToInput(paymentRows),
        discountMinor,
        saleDate,
        note: checkoutNote,
      });
      await load();
      await onChanged();
      const nextSales = role === 'cashier' ? (await getSmePosStaffWorkspace(space.id)).sales : await listSmePosSales(space.id);
      setSales(nextSales);
      setReceipt(nextSales.find((item) => item.id === result.data.saleId) || nextSales[0] || null);
      setCart({});
      setQuickItems([]);
      setCustomerId('');
      setDiscount('0.00');
      setCheckoutNote('');
      setPaymentRows([createSmePosPaymentDraft(settings.defaultPaymentAccountId || '', 0)]);
      setSuccess(`Sale completed. Receipt ${result.data.receiptNumber} is ready.`);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      await load();
    } finally {
      setBusy(false);
    }
  }


  function openReturnForm(sale: SmePosSale) {
    const quantities = Object.fromEntries(sale.items.map((item) => [item.productId, 0]));
    setReceipt(null);
    setReturnForm({ sale, quantities, returnDate: today(), reason: '' });
    setError('');
    setSuccess('');
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnForm || !requireOnline()) return;
    const items = returnForm.sale.items
      .map((item) => ({ itemId: item.productId, quantity: Math.floor(returnForm.quantities[item.productId] || 0) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      setError('Choose at least one item quantity to return.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await returnSmePosSale({
        spaceId: space.id,
        saleId: returnForm.sale.id,
        items,
        returnDate: returnForm.returnDate,
        reason: returnForm.reason,
      });
      setReturnForm(null);
      setSuccess(`Return recorded. ${formatMoney(result.data.refundMinor, returnForm.sale.currency)} was refunded from the original payment account.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }


  function openVoidForm(sale: SmePosSale) {
    setReceipt(null);
    setReturnForm(null);
    setVoidForm({
      sale,
      voidDate: today(),
      reason: '',
    });
    setError('');
    setSuccess('');
  }

  async function submitVoidSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!voidForm || !canVoidSales || !requireOnline()) return;

    const reason = voidForm.reason.trim();

    if (!reason) {
      setError('Enter a reason for voiding this sale.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const sale = voidForm.sale;

      const result = await voidSmePosSale({
        spaceId: space.id,
        saleId: sale.id,
        voidDate: voidForm.voidDate,
        reason,
      });

      setVoidForm(null);

      setSuccess(
        `Sale ${sale.receiptNumber} voided. ${formatMoney(result.data.voidedMinor, sale.currency)} was reversed.`,
      );

      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function openPermanentDeleteForm(
    sale: SmePosSale,
  ) {
    if (!canDeleteSales) return;

    setDeleteSaleForm({
      sale,
      reason: '',
      confirmation: '',
    });

    setError('');
    setSuccess('');
  }

  async function submitPermanentDelete(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !deleteSaleForm
      || !canDeleteSales
      || !requireOnline()
    ) {
      return;
    }

    const reason =
      deleteSaleForm.reason.trim();

    if (!reason) {
      setError(
        'Enter a reason for permanently deleting this sale.',
      );
      return;
    }

    if (
      deleteSaleForm.confirmation.trim()
        .toUpperCase() !== 'DELETE'
    ) {
      setError(
        'Type DELETE to confirm permanent deletion.',
      );
      return;
    }

    const sale = deleteSaleForm.sale;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const alreadyFinanciallyReversed =
        sale.status === 'voided'
        || sale.status === 'refunded'
        || sale.returnedMinor >= sale.totalMinor;

      if (!alreadyFinanciallyReversed) {
        await voidSmePosSale({
          spaceId: space.id,
          saleId: sale.id,
          voidDate: today(),
          reason:
            `Permanent deletion requested: ${reason}`,
        });
      }

      await deleteSmePosSalePermanently({
        spaceId: space.id,
        saleId: sale.id,
        reason,
        confirmation: 'DELETE',
      });

      setDeleteSaleForm(null);
      setReceipt(null);

      setSuccess(
        `Sale ${sale.receiptNumber} permanently deleted.`,
      );

      await load();
      await onChanged();
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  if (role === 'seller') {
    return <section className="panel"><span className="eyebrow">Seller access</span><h2>Marketplace seller workspace</h2><p>Seller listings, balances, and payouts are added in the Marketplace Consignment POS phase.</p></section>;
  }

  return <section className="sme-standard-pos-workspace">
    <div className="pos-workspace-heading">
      <div><span className="eyebrow">Shop tools</span><h2>{role === 'cashier' ? 'Register' : 'Point of sale'}</h2><p>{role === 'cashier' ? 'Search products, take payment, and issue the receipt.' : 'Use the tools available for your assigned POS role.'}</p></div>
      {canManageProducts && <Link className="button secondary" to={`/spaces/${space.id}/pos/archived`}>Archived POS records</Link>}
    </div>

    {settings.status !== 'active' && <div className="notice warning">The POS is {settings.status === 'paused' ? 'paused' : 'still in setup'}. Products and customers can be prepared, but checkout is blocked.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-workspace-tabs" role="tablist" aria-label="POS tools">
      {availableTabs.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setError(''); setSuccess(''); setSearch(''); }}>{item === 'sales' && role === 'cashier' ? 'My recent sales' : tabLabels[item]}</button>)}
    </div>

    {loading ? <div className="loading-panel">Loading shop records…</div> : <>
      {tab === 'products' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Products and stock</h3><p>{products.length} active product{products.length === 1 ? '' : 's'}</p></div><div className="button-row">{canManageStock && <button className="button secondary" type="button" disabled={!products.some((item) => item.barcode)} onClick={() => setLabelItems(products)}>Print barcode labels</button>}{canManageProducts && <button className="button primary" type="button" onClick={() => openProductForm('new')}>Add product</button>}</div></div>
        <SmePosBarcodeInventoryPanel
          itemLabel="product"
          items={products}
          canCreate={canManageProducts}
          onCreate={canManageProducts ? (barcode) => openProductForm('new', barcode) : undefined}
          onOpen={canManageProducts ? (product) => openProductForm(product) : undefined}
          onReceive={canManageStock ? setReceiveForm : undefined}
          onStocktake={canManageStock ? setStocktakeForm : undefined}
          onPrintLabel={canManageStock ? (product) => setLabelItems([product]) : undefined}
        />
        <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, category, SKU or barcode" />
        <div className="sme-pos-product-grid">{filteredProducts.map((product) => {
          const available = availableQuantity(product);
          const outOfStock = product.trackStock && available < 1;
          const low = product.trackStock && available > 0 && available <= product.lowStockLevel;
          return <article className={`sme-pos-product-card ${outOfStock ? 'out-of-stock' : ''}`} key={product.id}>
            {product.photoPath && <SmePosItemPhoto photoPath={product.photoPath} name={product.name} />}
            <div><span className="type-badge">{product.category || 'Product'}</span><h3>{product.name}</h3><small>{product.sku || product.displayId}</small>{product.barcode && <small>Barcode · {product.barcode}</small>}</div>
            <strong>{formatMoney(product.sellingPriceMinor, product.currency)}</strong>
            <p className={outOfStock ? 'stock-danger' : low ? 'stock-warning' : ''}>{product.trackStock ? outOfStock ? `${product.reservedQuantity || 0 ? 'Fully reserved' : 'Out of stock'}` : `${available} available${product.reservedQuantity ? ` · ${product.reservedQuantity} reserved` : ''}${low ? ' · Low stock' : ''}` : 'Service or unlimited item'}</p>
            {canManageProducts && <div className="button-row"><button className="button secondary small" type="button" onClick={() => openProductForm(product)}>Edit</button>{product.trackStock && <button className="button primary small" type="button" onClick={() => setReceiveForm(product)}>Receive stock</button>}{product.trackStock && <button className="button secondary small" type="button" onClick={() => setStocktakeForm(product)}>Count stock</button>}{product.barcode && <button className="button secondary small" type="button" onClick={() => setLabelItems([product])}>Label</button>}<button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'product', id: product.id }, title: 'Archive this product?', description: 'It will leave the active product list but its sales history will stay.', note: 'You can restore it from Archived POS records.', confirmLabel: 'Archive product' })}>Archive</button>{role === 'owner' && <button className="button ghost danger small" type="button" onClick={() => setConfirm({ payload: { kind: 'product', id: product.id, action: 'delete' }, title: 'Delete this product permanently?', description: 'This permanently removes the inventory product. This cannot be undone.', note: 'If this product has sales, bookings or other protected history, BajetBN will stop the deletion and ask you to archive it instead.', confirmLabel: 'Delete permanently', tone: 'danger' })}>Delete permanently</button>}</div>}
            {!canManageProducts && canManageStock && product.trackStock && <div className="button-row"><button className="button primary small" type="button" onClick={() => setReceiveForm(product)}>Receive stock</button><button className="button secondary small" type="button" onClick={() => setStocktakeForm(product)}>Count stock</button><button className="button secondary small" type="button" onClick={() => setStockForm(product)}>Update stock</button>{product.barcode && <button className="button secondary small" type="button" onClick={() => setLabelItems([product])}>Label</button>}</div>}
          </article>;
        })}</div>
        {!filteredProducts.length && <div className="empty-inline">No active products found.</div>}
      </div>}

      {tab === 'customers' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Customers</h3><p>Optional customer details for receipts and repeat visits.</p></div>{canManageCustomers && <button className="button primary" type="button" onClick={() => setCustomerForm('new')}>Add customer</button>}</div>
        <div className="sme-pos-customer-list">{customers.map((customer) => <div className="sme-pos-customer-row" key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</small></div><span>{customer.visitCount || 0} sale{customer.visitCount === 1 ? '' : 's'}</span>{canManageCustomers && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setCustomerForm(customer)}>Edit</button>{canDeleteCustomers && <button className="button ghost danger small" type="button" onClick={() => setConfirm({ payload: { kind: 'customer', id: customer.id }, title: 'Delete this customer?', description: 'The customer will be removed from active and archived customer lists.', note: 'If sales or receipt history exists, BajetBN keeps those historical records but removes the customer profile from active use.', confirmLabel: 'Delete customer' })}>Delete</button>}</div>}</div>)}</div>
        {!customers.length && <div className="empty-inline">No customers yet. The register can still use Walk-in customer.</div>}
      </div>}

      {tab === 'register' && <form className="sme-pos-checkout-layout" onSubmit={completeCheckout}>
        <section className="panel sme-pos-checkout-products">
          <div className="panel-heading"><div><span className="eyebrow">Register</span><h3>Choose products</h3><p>Out-of-stock or reserved physical products cannot be added.</p></div><div className="button-row"><button className="button ghost" type="button" onClick={() => setQuickAddForm(true)}>+ Quick Add</button>{canRegisterExistingStock && <button className="button secondary" type="button" onClick={openManualProductForm}>+ Register item</button>}</div></div>
          <SmePosBarcodeCheckoutScanner
            itemLabel="product"
            items={products.map((product) => ({ ...product, quantityOnHand: product.trackStock ? availableQuantity(product) : product.quantityOnHand }))}
            cartQuantities={cart}
            disabled={!canCheckout || settings.status !== 'active' || busy}
            onAdd={addToCart}
          />
          <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, category, SKU or barcode" />
          <div className="sme-pos-checkout-product-grid">{filteredProducts.map((product) => {
            const available = availableQuantity(product);
            const outOfStock = product.trackStock && available < 1;
            return <button type="button" key={product.id} disabled={outOfStock} className={outOfStock ? 'out-of-stock' : ''} onClick={() => addToCart(product)}>{product.photoPath && <SmePosItemPhoto photoPath={product.photoPath} name={product.name} className="register-thumb" />}<strong>{product.name}</strong><span>{formatMoney(product.sellingPriceMinor, product.currency)}</span><small>{product.trackStock ? outOfStock ? 'Out of stock' : `${available} available${product.reservedQuantity ? ` · ${product.reservedQuantity} reserved` : ''}` : 'Service or unlimited item'}</small></button>;
          })}</div>
          {!filteredProducts.length && <div className="empty-inline">No products found.</div>}
        </section>
        <section className="panel sme-pos-cart">
          <div className="panel-heading"><div><span className="eyebrow">Current sale</span><h3>Cart</h3><p>{cartLines.reduce((sum, item) => sum + item.quantity, 0) + quickItems.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></div>{(cartLines.length > 0 || quickItems.length > 0) && <button className="button ghost small" type="button" onClick={() => { setCart({}); setQuickItems([]); }}>Clear cart</button>}</div>
          <div className="sme-pos-cart-lines">{cartLines.map(({ product, quantity }) => <div key={product.id}><div><strong>{product.name}</strong><small>{formatMoney(product.sellingPriceMinor, product.currency)} each</small></div><input type="number" min="0" max={product.trackStock ? availableQuantity(product) : 9999} value={quantity} onChange={(event) => changeQuantity(product, Number(event.target.value))} aria-label={`${product.name} quantity`} /><strong>{formatMoney(product.sellingPriceMinor * quantity, product.currency)}</strong></div>)}{quickItems.map((item) => <div key={item.clientId}><div><strong>{item.name}</strong><small>Quick Add · this sale only</small></div><input type="number" min="0" max="9999" value={item.quantity} onChange={(event) => changeQuickQuantity(item.clientId, Number(event.target.value))} aria-label={`${item.name} quantity`} /><strong>{formatMoney(item.unitPriceMinor * item.quantity, settings.currency)}</strong></div>)}</div>
          {!cartLines.length && !quickItems.length && <div className="empty-inline">Tap a product or use Quick Add to begin the sale.</div>}
          <div className="form-stack compact">
            <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <SmePosPaymentSplitEditor accounts={paymentAccounts} currency={settings.currency} totalMinor={totalMinor} rows={paymentRows} onChange={setPaymentRows} disabled={busy} />
            <label>Sale date<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label>
            <label>Discount (BND)<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
            <label>Note<textarea rows={2} value={checkoutNote} onChange={(event) => setCheckoutNote(event.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Total <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
          <div className="pos-checkout-actions">{cartLines.length > 0 && <button className="button secondary" type="button" disabled={busy || quickItems.length > 0 || !customerId} onClick={() => setBookingForm(true)}>Reserve / take deposit</button>}<button className="button primary pos-complete-sale" type="submit" disabled={busy || !canCheckout || settings.status !== 'active' || (!cartLines.length && !quickItems.length)}>{busy ? 'Completing sale…' : settings.status !== 'active' ? 'POS is not active' : canCheckout ? `Complete sale · ${formatMoney(totalMinor, settings.currency)}` : 'Checkout access required'}</button></div>{quickItems.length > 0 && <small>Quick Add items are sale-only and cannot be reserved. Remove them to create a booking.</small>}{cartLines.length > 0 && !customerId && <small>Choose a saved customer to reserve this cart.</small>}
        </section>
      </form>}

      {tab === 'bookings' && canCheckout && <SmePosReservationsPanel space={space} settings={settings} role={role} reservations={reservations} paymentAccounts={paymentAccounts} onRefresh={async () => { await load(); await onChanged(); }} />}

      {tab === 'sales' && canViewSales && <div className="sme-pos-sales-section">
        {canViewReports && <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Sales today</span><strong>{formatMoney(todaySales, settings.currency)}</strong><small>{today()}</small></article><article className="summary-card"><span>Sales this month</span><strong>{formatMoney(monthSales, settings.currency)}</strong><small>{monthPrefix}</small></article><article className="summary-card"><span>Estimated profit</span><strong>{formatMoney(monthProfit, settings.currency)}</strong><small>Owner and manager only</small></article><article className="summary-card"><span>Low stock</span><strong>{lowStock}</strong><small>At or below alert level</small></article></div>}
        {canManageReturns && <SmePosBarcodeReturnScanner itemLabel="product" items={products} sales={sales} getSaleItemId={(item) => item.productId} onSelectSale={openReturnForm} />}
        <section className="panel"><div className="panel-heading"><div><h3>{role === 'cashier' ? 'My recent sales' : 'Recent sales'}</h3><p>{role === 'cashier' ? 'Only sales completed using your account are shown.' : 'Open a sale to view or print its receipt.'}</p></div></div><div className="sme-pos-sales-list">{sales.map((sale) => <button type="button" key={sale.id} onClick={() => setReceipt(sale)}><div><strong>{sale.receiptNumber}</strong><small>{sale.saleDate} · {sale.customerName || 'Walk-in customer'} · {sale.itemCount} item(s)</small></div><span className="status-badge posted">{sale.status}</span><strong>{formatMoney(sale.totalMinor - sale.returnedMinor, sale.currency)}</strong></button>)}</div>{!sales.length && <div className="empty-inline">No POS sales available.</div>}</section>
      </div>}
    </>}

    {quickAddForm && <Modal title="Quick Add · this sale only" onClose={() => setQuickAddForm(false)}><form className="form-stack" onSubmit={addQuickItem}><div className="notice">Use this for a one-off sale. The item is added to this cart only and is not saved in Inventory.</div><label>Item name<input name="name" maxLength={100} required autoFocus /></label><div className="form-grid"><label>Selling price (BND)<input name="price" inputMode="decimal" required /></label><label>Quantity<input name="quantity" type="number" min="1" max="9999" defaultValue="1" required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setQuickAddForm(false)}>Cancel</button><button className="button primary" type="submit">Add to sale</button></div></form></Modal>}

    {bookingForm && <SmePosCreateReservationModal space={space} settings={settings} sourceMode="standard" items={cartLines.map(({ product, quantity }) => ({ itemId: product.id, name: product.name, quantity, lineTotalMinor: product.sellingPriceMinor * quantity }))} customers={customers} paymentAccounts={paymentAccounts} initialCustomerId={customerId} initialDiscountMinor={discountMinor} onClose={() => setBookingForm(false)} onSaved={async () => { setCart({}); setDiscount('0.00'); setCustomerId(''); setPaymentRows([createSmePosPaymentDraft(settings.defaultPaymentAccountId || '', 0)]); await load(); await onChanged(); setSuccess('Booking created. Reserved stock is now protected from other checkout sales.'); }} />}

    {manualProductForm && <Modal title="Register existing stock" onClose={() => !busy && setManualProductForm(false)}>
      <form className="form-stack" onSubmit={registerExistingProduct}>
        <div className="notice">For items already physically in the shop. This does not create a purchase record. Barcode is optional.</div>
        <SmePosItemPhotoField currentPhotoPath={null} file={manualProductPhotoFile} removeExisting={false} onFileChange={setManualProductPhotoFile} onRemoveExisting={() => undefined} disabled={busy} />
        <div className="form-grid">
          <label>Item name<input name="name" maxLength={100} required autoFocus /></label>
          <label>Category<input name="category" maxLength={60} /></label>
          <label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" required /></label>
          {role !== 'cashier' && <label>Cost price (BND)<input name="costPrice" inputMode="decimal" placeholder="Optional · owner/manager only" /></label>}
          <label>Quantity on hand<input name="quantity" type="number" min="0" max="999999" defaultValue={1} required /></label>
          <label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={1} required /></label>
          <label>SKU (optional)<input name="sku" maxLength={50} /></label>
          <label>Barcode (optional)<input name="barcode" maxLength={240} autoComplete="off" /></label>
          <label>Condition<select value={manualProductCondition} onChange={(event) => setManualProductCondition(event.target.value as SmePosListingCondition)}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Condition details<input name="conditionNote" maxLength={120} placeholder="Optional" /></label>
        </div>
        <label>Note<textarea name="note" rows={2} maxLength={300} placeholder="Optional" /></label>
        <small>Source is recorded as Existing stock / Manual registration with the staff member and time.</small>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setManualProductForm(false)} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register item'}</button></div>
      </form>
    </Modal>}

    {productForm && <Modal title={productForm === 'new' ? 'Add product' : 'Edit product'} onClose={() => !busy && setProductForm(null)}>
      <form className="form-stack" onSubmit={saveProduct}>
        <SmePosItemPhotoField
          currentPhotoPath={productForm === 'new' ? null : productForm.photoPath}
          file={productPhotoFile}
          removeExisting={removeProductPhoto}
          onFileChange={setProductPhotoFile}
          onRemoveExisting={setRemoveProductPhoto}
          disabled={busy}
        />
        <div className="form-grid">
          <label>Product name<input name="name" defaultValue={productForm === 'new' ? '' : productForm.name} maxLength={100} required /></label>
          <label>Category<input name="category" defaultValue={productForm === 'new' ? '' : productForm.category || ''} maxLength={60} placeholder="Example: Food, electronics" /></label>
          <label>SKU (optional)<input name="sku" defaultValue={productForm === 'new' ? '' : productForm.sku || ''} maxLength={50} /></label>
          <label>Barcode (optional)<input name="barcode" defaultValue={productForm === 'new' ? newProductBarcode : productForm.barcode || ''} maxLength={240} autoComplete="off" /></label>
          <label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" defaultValue={productForm === 'new' ? '' : (productForm.sellingPriceMinor / 100).toFixed(2)} required /></label>
          <label>Cost price (BND)<input name="costPrice" inputMode="decimal" defaultValue={productForm === 'new' || productForm.costPriceMinor == null ? '' : (productForm.costPriceMinor / 100).toFixed(2)} placeholder="Optional · owner/manager only" /></label>
        </div>
        <fieldset className="pos-item-type-fieldset">
          <legend>Item type</legend>
          <label className={`pos-item-type-option ${productStockMode === 'physical' ? 'selected' : ''}`}><input type="radio" name="itemType" value="physical" checked={productStockMode === 'physical'} onChange={() => setProductStockMode('physical')} /><span><strong>Physical product</strong><small>Track available quantity and stop sales when stock reaches zero.</small></span></label>
          <label className={`pos-item-type-option ${productStockMode === 'unlimited' ? 'selected' : ''}`}><input type="radio" name="itemType" value="unlimited" checked={productStockMode === 'unlimited'} onChange={() => setProductStockMode('unlimited')} /><span><strong>Service or unlimited item</strong><small>No stock quantity is reduced. Use this only for services or items that do not run out.</small></span></label>
        </fieldset>
        {productStockMode === 'physical' && <div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 0 : productForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 2 : productForm.lowStockLevel} required /></label></div>}
        <div className="form-grid"><label>Condition<select name="condition" defaultValue={productForm === 'new' ? 'new' : productForm.condition || 'new'}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Condition details<input name="conditionNote" defaultValue={productForm === 'new' ? '' : productForm.conditionNote || ''} maxLength={120} placeholder="Optional" /></label></div>
        <label>Note<textarea name="note" rows={2} defaultValue={productForm === 'new' ? '' : productForm.note || ''} maxLength={300} /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setProductForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
      </form>
    </Modal>}

    {receiveForm && <Modal title={`Receive stock · ${receiveForm.name}`} onClose={() => !busy && setReceiveForm(null)}><form className="form-stack" onSubmit={receiveStock}><div className="notice">Current stock: <strong>{receiveForm.quantityOnHand}</strong>. Scanning did not change this number.</div><label>Quantity received<input name="quantityReceived" type="number" min="1" max={Math.max(1, 999999 - receiveForm.quantityOnHand)} defaultValue={1} required autoFocus /></label><label>Receiving note<textarea name="note" rows={2} maxLength={300} placeholder="Optional supplier, delivery or reference" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setReceiveForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Receiving…' : 'Confirm received stock'}</button></div></form></Modal>}

    {stockForm && <Modal title={`Update stock · ${stockForm.name}`} onClose={() => !busy && setStockForm(null)}><form className="form-stack" onSubmit={saveStock}><div className="notice">Stock staff can change available quantity and the low-stock alert. Prices and cost remain owner or manager controlled.</div><div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={stockForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={stockForm.lowStockLevel} required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStockForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save stock'}</button></div></form></Modal>}

    {stocktakeForm && <Modal title={`Count stock · ${stocktakeForm.name}`} onClose={() => !busy && setStocktakeForm(null)}><form className="form-stack" onSubmit={saveStocktake}><div className="notice">System quantity: <strong>{stocktakeForm.quantityOnHand}</strong>. Enter the physical count. Nothing changes until you confirm.</div><label>Physical count<input name="countedQuantity" type="number" min="0" max="999999" defaultValue={stocktakeForm.quantityOnHand} required autoFocus /></label><label>Count note<textarea name="note" rows={2} maxLength={300} placeholder="Optional reason, shelf, counter or reference" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStocktakeForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving count…' : 'Confirm physical count'}</button></div></form></Modal>}

    {labelItems && <SmePosBarcodeLabelDialog itemLabel="product" items={labelItems} shopName={settings.shopName || settings.receiptName || space.name} onClose={() => setLabelItems(null)} />}

    {customerForm && <Modal title={customerForm === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => !busy && setCustomerForm(null)}><form className="form-stack" onSubmit={saveCustomer}><label>Customer name<input name="name" defaultValue={customerForm === 'new' ? '' : customerForm.name} maxLength={100} required /></label><div className="form-grid"><label>Phone<input name="phone" defaultValue={customerForm === 'new' ? '' : customerForm.phone || ''} maxLength={30} /></label><label>Email<input name="email" type="email" defaultValue={customerForm === 'new' ? '' : customerForm.email || ''} maxLength={120} /></label></div><label>Note<textarea name="note" rows={3} defaultValue={customerForm === 'new' ? '' : customerForm.note || ''} maxLength={300} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCustomerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></div></form></Modal>}

    {receipt && <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={() => setReceipt(null)}>
      <div className="sme-pos-receipt">
        <header><strong>{receipt.receiptName}</strong><span>{receipt.saleDate}</span><small>{receipt.customerName || 'Walk-in customer'}</small></header>
        {receipt.status === 'voided' && <div className="notice warning"><strong>Voided sale</strong><br />{receipt.voidDate && <span>{receipt.voidDate}</span>}{receipt.voidReason && <span> · {receipt.voidReason}</span>}</div>}
        {receipt.items.map((item) => <div className="sme-pos-receipt-line" key={item.productId}>
          <span>{item.quantity} × {item.productName}{item.returnedQuantity > 0 ? ` · ${item.returnedQuantity} returned` : ''}</span>
          <strong>{formatMoney(item.lineTotalMinor, receipt.currency)}</strong>
        </div>)}
        <div className="sme-pos-receipt-totals">
          <span>Original total <strong>{formatMoney(receipt.totalMinor, receipt.currency)}</strong></span>
          {receipt.returnedMinor > 0 && <span>Refunded <strong>-{formatMoney(receipt.returnedMinor, receipt.currency)}</strong></span>}
          <span>Net sale <strong>{formatMoney(receipt.totalMinor - receipt.returnedMinor, receipt.currency)}</strong></span>
        </div>
        <p>{receipt.receiptFooter}</p>
        <div className="sme-pos-receipt-payments">{(receipt.payments?.length ? receipt.payments : [{ accountId: receipt.paymentAccountId, accountName: receipt.paymentAccountName, paymentMethod: receipt.paymentMethod, amountMinor: receipt.totalMinor, returnedMinor: receipt.returnedMinor }]).map((payment, index) => <small key={`${payment.accountId}-${index}`}>{receipt.payments?.length ? 'Payment' : 'Paid into'} · {payment.accountName} · {payment.paymentMethod || 'payment'} · {formatMoney(payment.amountMinor, receipt.currency)}</small>)}</div>
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={() => window.print()}>Print</button>
        {canManageReturns && !['refunded', 'voided'].includes(receipt.status) && <button className="button secondary" type="button" onClick={() => openReturnForm(receipt)}>Return items</button>}
        {canVoidSales && !['refunded', 'voided'].includes(receipt.status) && receipt.totalMinor > receipt.returnedMinor && <button className="button ghost danger" type="button" onClick={() => openVoidForm(receipt)}>Void sale</button>}
        {canDeleteSales && <button className="button ghost danger" type="button" onClick={() => openPermanentDeleteForm(receipt)}>Delete permanently</button>}
        <button className="button primary" type="button" onClick={() => setReceipt(null)}>Done</button>
      </div>
    </Modal>}

    {deleteSaleForm && <Modal
      title={`Delete permanently · ${deleteSaleForm.sale.receiptNumber}`}
      onClose={() => !busy && setDeleteSaleForm(null)}
    >
      <form
        className="form-stack"
        onSubmit={submitPermanentDelete}
      >
        <div className="notice warning">
          <strong>
            Permanent deletion cannot be undone.
          </strong>
          <br />
          If the sale is still active, BajetBN first performs
          the normal audited financial reversal. After that,
          the POS sale/receipt is permanently removed.
        </div>

        <p>
          Stock, customer totals, payments and seller balances
          are reversed safely before an active sale can be deleted.
        </p>

        <label>
          Deletion reason
          <textarea
            rows={3}
            maxLength={500}
            value={deleteSaleForm.reason}
            onChange={(event) =>
              setDeleteSaleForm(
                (current) =>
                  current
                    ? {
                        ...current,
                        reason: event.target.value,
                      }
                    : current,
              )
            }
            placeholder="Example: Duplicate or invalid sale record"
            required
          />
        </label>

        <label>
          Type DELETE to confirm
          <input
            value={deleteSaleForm.confirmation}
            onChange={(event) =>
              setDeleteSaleForm(
                (current) =>
                  current
                    ? {
                        ...current,
                        confirmation: event.target.value,
                      }
                    : current,
              )
            }
            autoComplete="off"
            required
          />
        </label>

        <div className="modal-actions">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() =>
              setDeleteSaleForm(null)
            }
          >
            Cancel
          </button>

          <button
            className="button danger"
            type="submit"
            disabled={
              busy
              || !deleteSaleForm.reason.trim()
              || deleteSaleForm.confirmation
                .trim()
                .toUpperCase() !== 'DELETE'
            }
          >
            {busy
              ? 'Deleting sale…'
              : 'Delete permanently'}
          </button>
        </div>
      </form>
    </Modal>}

    {voidForm && <Modal title={`Void sale · ${voidForm.sale.receiptNumber}`} onClose={() => !busy && setVoidForm(null)}>
      <form className="form-stack" onSubmit={submitVoidSale}>
        <div className="notice warning">
          <strong>This reverses the remaining sale.</strong><br />
          Payment, stock and customer totals will be reversed. The original receipt stays in BajetBN as a voided audit record.
        </div>

        {voidForm.sale.returnedMinor > 0 && <div className="notice">
          This receipt already has {formatMoney(voidForm.sale.returnedMinor, voidForm.sale.currency)} returned. Only the remaining {formatMoney(voidForm.sale.totalMinor - voidForm.sale.returnedMinor, voidForm.sale.currency)} will be reversed.
        </div>}

        <label>
          Void date
          <input
            type="date"
            value={voidForm.voidDate}
            onChange={(event) => setVoidForm((current) => current ? { ...current, voidDate: event.target.value } : current)}
            required
          />
        </label>

        <label>
          Reason for voiding
          <textarea
            rows={3}
            value={voidForm.reason}
            onChange={(event) => setVoidForm((current) => current ? { ...current, reason: event.target.value } : current)}
            maxLength={500}
            placeholder="Example: Duplicate checkout, wrong payment, cashier mistake"
            required
            autoFocus
          />
        </label>

        <div className="modal-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={() => setVoidForm(null)}>Cancel</button>
          <button className="button danger" type="submit" disabled={busy || !voidForm.reason.trim()}>
            {busy ? 'Voiding sale…' : 'Void sale and reverse'}
          </button>
        </div>
      </form>
    </Modal>}
    {returnForm && <Modal title={`Return items · ${returnForm.sale.receiptNumber}`} onClose={() => !busy && setReturnForm(null)}>
      <form className="form-stack" onSubmit={submitReturn}>
        <div className="notice">Refunds are posted as Money Out across the original payment account(s). Quick Add lines do not create or restore inventory stock.</div>
        <div className="sme-pos-cart-lines">
          {returnForm.sale.items.map((item) => {
            const remaining = Math.max(0, item.quantity - item.returnedQuantity);
            return <div key={item.productId}>
              <div><strong>{item.productName}</strong><small>{remaining} returnable of {item.quantity} sold</small></div>
              <input
                type="number"
                min="0"
                max={remaining}
                value={returnForm.quantities[item.productId] || 0}
                onChange={(event) => setReturnForm((current) => current ? {
                  ...current,
                  quantities: { ...current.quantities, [item.productId]: Math.min(remaining, Math.max(0, Number(event.target.value) || 0)) },
                } : current)}
                aria-label={`${item.productName} return quantity`}
              />
            </div>;
          })}
        </div>
        <label>Return date<input type="date" value={returnForm.returnDate} onChange={(event) => setReturnForm((current) => current ? { ...current, returnDate: event.target.value } : current)} required /></label>
        <label>Reason or note<textarea rows={3} value={returnForm.reason} onChange={(event) => setReturnForm((current) => current ? { ...current, reason: event.target.value } : current)} maxLength={500} placeholder="Optional" /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setReturnForm(null)} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Recording return…' : 'Confirm return and refund'}</button></div>
      </form>
    </Modal>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void archiveConfirmed()} />}
  </section>;
}
