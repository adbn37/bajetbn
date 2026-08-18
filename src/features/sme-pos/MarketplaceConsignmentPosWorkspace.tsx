import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import { SmePosBarcodeInventoryPanel } from '../../components/SmePosBarcodeInventoryPanel';
import { SmePosBarcodeCheckoutScanner } from '../../components/SmePosBarcodeCheckoutScanner';
import { SmePosBarcodeLabelDialog } from '../../components/SmePosBarcodeLabelDialog';
import { SmePosBarcodeReturnScanner } from '../../components/SmePosBarcodeReturnScanner';
import { SmePosItemPhoto, SmePosItemPhotoField } from '../../components/SmePosItemPhoto';
import {
  checkoutMarketplacePos,
  deleteMarketplaceSeller,
  deleteSmePosCustomer,
  deleteSmePosItemPhoto,
  getMarketplacePosWorkspace,
  listSmePosAccess,
  listSmePosPaymentAccounts,
  receiveMarketplaceListingStock,
  registerExistingMarketplaceListing,
  recordMarketplaceSellerPayout,
  returnSmePosSale,
  saveMarketplaceListing,
  saveMarketplaceSeller,
  saveSmePosCustomer,
  setMarketplaceListingArchived,
  updateMarketplaceListingStock,
  uploadSmePosItemPhoto,
} from '../../repositories/smePosRepository';
import type {
  PaymentMethodCode,
  SmePosAccess,
  SmePosCommissionType,
  SmePosCustomer,
  SmePosListing,
  SmePosListingCondition,
  SmePosPaymentAccount,
  SmePosPayout,
  SmePosRole,
  SmePosSale,
  SmePosSeller,
  SmePosSellerLedgerEntry,
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

type MarketplaceTab = 'register' | 'sellers' | 'listings' | 'customers' | 'sales' | 'balance';
type ConfirmPayload =
  | { kind: 'seller'; id: string }
  | { kind: 'listing'; id: string }
  | { kind: 'customer'; id: string };

interface ReturnFormState {
  sale: SmePosSale;
  quantities: Record<string, number>;
  returnDate: string;
  reason: string;
}

interface PayoutFormState {
  seller: SmePosSeller;
  amount: string;
  paymentAccountId: string;
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel: string;
  payoutDate: string;
  note: string;
}

const paymentMethods: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Cash' },
  { code: 'bank_transfer', label: 'Bank transfer' },
  { code: 'debit_card', label: 'Debit card' },
  { code: 'credit_card', label: 'Credit card' },
  { code: 'e_wallet', label: 'E-wallet' },
  { code: 'qr_payment', label: 'QR payment' },
  { code: 'other', label: 'Other' },
];

const conditionLabels: Record<SmePosListingCondition, string> = {
  new: 'New',
  sealed: 'Sealed',
  open_box: 'Open box',
  used: 'Used',
  other: 'Other',
};

const tabLabels: Record<MarketplaceTab, string> = {
  register: 'Register',
  sellers: 'Sellers',
  listings: 'Inventory',
  customers: 'Customers',
  sales: 'Sales',
  balance: 'My balance',
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function tabsForRole(role: SmePosRole, hasSellerProfile: boolean): MarketplaceTab[] {
  let tabs: MarketplaceTab[] = [];
  if (role === 'owner' || role === 'manager') tabs = ['register', 'sellers', 'listings', 'customers', 'sales'];
  else if (role === 'cashier') tabs = ['register', 'customers', 'sales'];
  else if (role === 'stock_staff') tabs = ['listings'];
  else if (role === 'seller') tabs = ['listings', 'balance', 'sales'];
  else if (role === 'viewer') tabs = ['listings', 'customers'];
  if (hasSellerProfile && !tabs.includes('balance')) tabs.push('balance');
  return tabs;
}

function initialTab(role: SmePosRole): MarketplaceTab {
  if (role === 'stock_staff' || role === 'seller' || role === 'viewer') return 'listings';
  return 'register';
}

function commissionCopy(type: SmePosCommissionType, rateBps: number, fixedMinor: number, currency: string) {
  return type === 'percentage'
    ? `${(rateBps / 100).toFixed(2).replace(/\.00$/, '')}% commission`
    : `${formatMoney(fixedMinor, currency)} per item`;
}

function sellerBalanceLabel(balanceMinor: number) {
  if (balanceMinor < 0) return 'Seller owes shop';
  if (balanceMinor === 0) return 'Settled';
  return 'Waiting payout';
}

function ledgerKindLabel(entry: SmePosSellerLedgerEntry) {
  if (entry.kind === 'sale_earning') return 'Sale earning';
  if (entry.kind === 'return_adjustment') return 'Return adjustment';
  return 'Seller payout';
}

export function MarketplaceConsignmentPosWorkspace({ space, settings, role, onChanged }: Props) {
  const [mySeller, setMySeller] = useState<SmePosSeller | null>(null);
  const availableTabs = useMemo(() => tabsForRole(role, Boolean(mySeller)), [role, mySeller]);
  const [tab, setTab] = useState<MarketplaceTab>(() => initialTab(role));
  const [sellers, setSellers] = useState<SmePosSeller[]>([]);
  const [listings, setListings] = useState<SmePosListing[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sales, setSales] = useState<SmePosSale[]>([]);
  const [payouts, setPayouts] = useState<SmePosPayout[]>([]);
  const [mySellerLedger, setMySellerLedger] = useState<SmePosSellerLedgerEntry[]>([]);
  const [mySellerPayouts, setMySellerPayouts] = useState<SmePosPayout[]>([]);
  const [sellerAccess, setSellerAccess] = useState<SmePosAccess[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<SmePosPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [sellerForm, setSellerForm] = useState<SmePosSeller | 'new' | null>(null);
  const [sellerCommissionType, setSellerCommissionType] = useState<SmePosCommissionType>('percentage');
  const [listingForm, setListingForm] = useState<SmePosListing | 'new' | null>(null);
  const [newListingBarcode, setNewListingBarcode] = useState('');
  const [listingCommissionType, setListingCommissionType] = useState<SmePosCommissionType>('percentage');
  const [listingCondition, setListingCondition] = useState<SmePosListingCondition>('new');
  const [listingPhotoFile, setListingPhotoFile] = useState<File | null>(null);
  const [removeListingPhoto, setRemoveListingPhoto] = useState(false);
  const [manualListingForm, setManualListingForm] = useState(false);
  const [manualListingPhotoFile, setManualListingPhotoFile] = useState<File | null>(null);
  const [manualListingCondition, setManualListingCondition] = useState<SmePosListingCondition>('new');
  const [stockForm, setStockForm] = useState<SmePosListing | null>(null);
  const [receiveForm, setReceiveForm] = useState<SmePosListing | null>(null);
  const [stocktakeForm, setStocktakeForm] = useState<SmePosListing | null>(null);
  const [labelItems, setLabelItems] = useState<SmePosListing[] | null>(null);
  const [customerForm, setCustomerForm] = useState<SmePosCustomer | 'new' | null>(null);
  const [receipt, setReceipt] = useState<SmePosSale | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnFormState | null>(null);
  const [payoutForm, setPayoutForm] = useState<PayoutFormState | null>(null);
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(settings.defaultPaymentAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [saleDate, setSaleDate] = useState(today());
  const [checkoutNote, setCheckoutNote] = useState('');

  const canManageSellers = role === 'owner' || role === 'manager';
  const canManageListings = role === 'owner' || role === 'manager';
  const canManageStock = ['owner', 'manager', 'stock_staff'].includes(role);
  const canManageCustomers = ['owner', 'manager', 'cashier'].includes(role);
  const canDeleteCustomers = role === 'owner';
  const canDeleteSellers = role === 'owner';
  const canRegisterExistingStock = ['owner', 'manager', 'cashier'].includes(role);
  const canCheckout = ['owner', 'manager', 'cashier'].includes(role);
  const canManageReturns = role === 'owner' || role === 'manager';
  const canManagePayouts = role === 'owner' || role === 'manager';
  const canViewReports = role === 'owner' || role === 'manager';
  const canViewSales = ['owner', 'manager', 'cashier', 'seller'].includes(role);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [workspace, accounts, access] = await Promise.all([
        getMarketplacePosWorkspace(space.id),
        canCheckout ? listSmePosPaymentAccounts(space.id) : Promise.resolve([]),
        canManageSellers ? listSmePosAccess(space.id) : Promise.resolve([]),
      ]);
      setSellers(workspace.sellers);
      setListings(workspace.listings);
      setCustomers(workspace.customers);
      setSales(workspace.sales);
      setPayouts(workspace.payouts);
      setMySeller(workspace.mySeller);
      setMySellerLedger(workspace.mySellerLedger);
      setMySellerPayouts(workspace.mySellerPayouts);
      setPaymentAccounts(accounts);
      setSellerAccess(access.filter((item) => item.status === 'active'));
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
    if (!paymentAccountId && settings.defaultPaymentAccountId) setPaymentAccountId(settings.defaultPaymentAccountId);
  }, [paymentAccountId, settings.defaultPaymentAccountId]);

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((item) => !term || [item.name, item.category, item.sku, item.barcode, item.sellerName, conditionLabels[item.condition]].some((value) => value?.toLowerCase().includes(term)));
  }, [listings, search]);

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => {
    const listing = listings.find((item) => item.id === id);
    return listing ? { listing, quantity } : null;
  }).filter((item): item is { listing: SmePosListing; quantity: number } => Boolean(item)), [cart, listings]);

  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.listing.sellingPriceMinor * item.quantity, 0);
  let discountMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const monthPrefix = today().slice(0, 7);
  const activeSales = sales.filter((item) => item.status !== 'refunded');
  const todayGross = activeSales.filter((item) => item.saleDate === today()).reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthGross = activeSales.filter((item) => item.saleDate.startsWith(monthPrefix)).reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthCommission = activeSales.filter((item) => item.saleDate.startsWith(monthPrefix)).reduce((sum, item) => sum + (item.marketplaceCommissionMinor || item.profitMinor), 0);
  const sellerMoneyWaiting = sellers.reduce((sum, item) => sum + item.balanceMinor, 0);
  const lowStock = listings.filter((item) => item.quantityOnHand <= item.lowStockLevel).length;

  function requireOnline() {
    if (navigator.onLine) return true;
    setError('Connect to the internet to change Marketplace records or complete checkout.');
    return false;
  }

  function openSellerForm(value: SmePosSeller | 'new') {
    setSellerCommissionType(value === 'new' ? 'percentage' : value.defaultCommissionType);
    setSellerForm(value);
  }

  function openListingForm(value: SmePosListing | 'new', barcode = '') {
    setNewListingBarcode(value === 'new' ? barcode : '');
    setListingPhotoFile(null);
    setRemoveListingPhoto(false);
    if (value === 'new') {
      const firstSeller = sellers[0];
      setListingCommissionType(firstSeller?.defaultCommissionType || 'percentage');
      setListingCondition('new');
    } else {
      setListingCommissionType(value.commissionType);
      setListingCondition(value.condition);
    }
    setListingForm(value);
  }

  function openManualListingForm() {
    setManualListingPhotoFile(null);
    setManualListingCondition('new');
    setManualListingForm(true);
  }

  async function saveSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sellerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const commissionType = String(form.get('commissionType') || 'percentage') as SmePosCommissionType;
    const rate = Number(form.get('commissionRate') || 0);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveMarketplaceSeller({
        spaceId: space.id,
        sellerId: sellerForm === 'new' ? undefined : sellerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
        linkedUid: String(form.get('linkedUid') || '') || null,
        defaultCommissionType: commissionType,
        defaultCommissionRateBps: commissionType === 'percentage' ? Math.round(rate * 100) : 0,
        defaultCommissionMinor: commissionType === 'fixed_per_item' ? toMinorUnits(String(form.get('commissionFixed') || '0')) : 0,
      });
      setSellerForm(null);
      setSuccess(sellerForm === 'new' ? 'Seller added.' : 'Seller updated.');
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listingForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const commissionType = String(form.get('commissionType') || 'percentage') as SmePosCommissionType;
    const rate = Number(form.get('commissionRate') || 0);
    const existingPhotoPath = listingForm === 'new' ? null : listingForm.photoPath || null;
    let uploadedPhotoPath: string | null = null;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (listingPhotoFile) uploadedPhotoPath = (await uploadSmePosItemPhoto(space.id, listingPhotoFile)).photoPath;
      const photoPath = uploadedPhotoPath || (removeListingPhoto ? null : existingPhotoPath);
      await saveMarketplaceListing({
        spaceId: space.id,
        listingId: listingForm === 'new' ? undefined : listingForm.id,
        sellerId: String(form.get('sellerId') || ''),
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        barcode: String(form.get('barcode') || ''),
        photoPath,
        note: String(form.get('note') || ''),
        condition: String(form.get('condition') || 'new') as SmePosListingCondition,
        conditionNote: String(form.get('conditionNote') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        commissionType,
        commissionRateBps: commissionType === 'percentage' ? Math.round(rate * 100) : 0,
        commissionMinor: commissionType === 'fixed_per_item' ? toMinorUnits(String(form.get('commissionFixed') || '0')) : 0,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      if (existingPhotoPath && existingPhotoPath !== photoPath) void deleteSmePosItemPhoto(existingPhotoPath).catch(() => undefined);
      setListingForm(null); setListingPhotoFile(null); setRemoveListingPhoto(false); setNewListingBarcode('');
      setSuccess(listingForm === 'new' ? 'Seller listing added.' : 'Seller listing updated.');
      await load(); await onChanged();
    } catch (nextError) {
      if (uploadedPhotoPath) void deleteSmePosItemPhoto(uploadedPhotoPath).catch(() => undefined);
      setError(getErrorMessage(nextError));
    } finally { setBusy(false); }
  }

  async function registerExistingListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualListingForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    let uploadedPhotoPath: string | null = null;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (manualListingPhotoFile) uploadedPhotoPath = (await uploadSmePosItemPhoto(space.id, manualListingPhotoFile)).photoPath;
      await registerExistingMarketplaceListing({
        spaceId: space.id,
        sellerId: String(form.get('sellerId') || ''),
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        barcode: String(form.get('barcode') || ''),
        photoPath: uploadedPhotoPath,
        note: String(form.get('note') || ''),
        condition: manualListingCondition,
        conditionNote: String(form.get('conditionNote') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setManualListingForm(false); setManualListingPhotoFile(null);
      setSuccess('Existing seller stock registered and added to Inventory.');
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
    setBusy(true); setError(''); setSuccess('');
    try {
      await updateMarketplaceListingStock({
        spaceId: space.id,
        listingId: stockForm.id,
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setStockForm(null); setSuccess('Listing stock updated.');
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function receiveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receiveForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const quantityReceived = Math.floor(Number(form.get('quantityReceived') || 0));
    if (quantityReceived < 1) { setError('Enter at least one received unit.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await receiveMarketplaceListingStock({
        spaceId: space.id,
        listingId: receiveForm.id,
        quantityReceived,
        note: String(form.get('note') || ''),
      });
      const name = receiveForm.name;
      setReceiveForm(null);
      setSuccess(`Received ${quantityReceived} unit(s) of ${name}. New stock: ${result.data.quantityOnHand}.`);
      await load();
      await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveStocktake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stocktakeForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    const countedQuantity = Math.floor(Number(form.get('countedQuantity') || 0));
    if (countedQuantity < 0 || countedQuantity > 999999) { setError('Enter a physical count from 0 to 999999.'); return; }
    const previousQuantity = stocktakeForm.quantityOnHand;
    setBusy(true); setError(''); setSuccess('');
    try {
      await updateMarketplaceListingStock({
        spaceId: space.id,
        listingId: stocktakeForm.id,
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
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveSmePosCustomer({
        spaceId: space.id,
        customerId: customerForm === 'new' ? undefined : customerForm.id,
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        note: String(form.get('note') || ''),
      });
      setCustomerForm(null); setSuccess(customerForm === 'new' ? 'Customer added.' : 'Customer updated.');
      await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  async function archiveConfirmed() {
    if (!confirm || !requireOnline()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (confirm.payload.kind === 'seller') {
        const result = await deleteMarketplaceSeller(space.id, confirm.payload.id);
        setSuccess(result.data.preservedHistory ? 'Seller deleted. Historical sales, commission and payout records were preserved.' : 'Seller deleted.');
      } else if (confirm.payload.kind === 'listing') {
        await setMarketplaceListingArchived(space.id, confirm.payload.id, true);
        setSuccess('Listing archived.');
      } else {
        const result = await deleteSmePosCustomer(space.id, confirm.payload.id);
        setSuccess(result.data.preservedHistory ? 'Customer deleted. Historical sales and receipts were preserved.' : 'Customer deleted.');
      }
      setConfirm(null); await load();
    } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); }
  }

  function addToCart(listing: SmePosListing) {
    if (listing.quantityOnHand < 1) return;
    setCart((current) => {
      const next = Math.min((current[listing.id] || 0) + 1, listing.quantityOnHand);
      return { ...current, [listing.id]: next };
    });
  }

  function changeQuantity(listing: SmePosListing, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (!Number.isFinite(quantity) || quantity < 1) delete next[listing.id];
      else next[listing.id] = Math.min(Math.floor(quantity), listing.quantityOnHand);
      return next;
    });
  }

  async function completeCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCheckout || !requireOnline()) return;
    if (!cartLines.length) { setError('Add at least one seller listing to the cart.'); return; }
    if (!paymentAccountId) { setError('Choose where the payment was received.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await checkoutMarketplacePos({
        spaceId: space.id,
        items: cartLines.map((item) => ({ listingId: item.listing.id, quantity: item.quantity })),
        customerId: customerId || null,
        paymentAccountId,
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodLabel : null,
        discountMinor,
        saleDate,
        note: checkoutNote,
      });
      setCart({}); setDiscount('0.00'); setCheckoutNote(''); setCustomerId('');
      setSuccess(`Sale completed. Receipt ${result.data.receiptNumber}. Seller balances were updated.`);
      await load(); await onChanged();
      const nextWorkspace = await getMarketplacePosWorkspace(space.id);
      const nextReceipt = nextWorkspace.sales.find((item) => item.id === result.data.saleId) || null;
      setReceipt(nextReceipt);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      await load();
    } finally { setBusy(false); }
  }


  function openReturnForm(sale: SmePosSale) {
    const quantities = Object.fromEntries(sale.items.map((item) => [item.listingId || item.productId, 0]));
    setReceipt(null);
    setReturnForm({ sale, quantities, returnDate: today(), reason: '' });
    setError('');
    setSuccess('');
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnForm || !requireOnline()) return;
    const items = returnForm.sale.items
      .map((item) => {
        const itemId = item.listingId || item.productId;
        return { itemId, quantity: Math.floor(returnForm.quantities[itemId] || 0) };
      })
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
      setSuccess(`Return recorded. ${formatMoney(result.data.refundMinor, returnForm.sale.currency)} was refunded and seller balances were adjusted.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function openPayoutForm(seller: SmePosSeller) {
    setPayoutForm({
      seller,
      amount: seller.balanceMinor > 0 ? (seller.balanceMinor / 100).toFixed(2) : '0.00',
      paymentAccountId: settings.defaultPaymentAccountId || paymentAccounts[0]?.id || '',
      paymentMethod: 'bank_transfer',
      paymentMethodLabel: '',
      payoutDate: today(),
      note: '',
    });
    setError('');
    setSuccess('');
  }

  async function submitPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payoutForm || !requireOnline()) return;
    let amountMinor = 0;
    try {
      amountMinor = toMinorUnits(payoutForm.amount);
    } catch {
      setError('Enter a valid payout amount.');
      return;
    }
    if (amountMinor <= 0 || amountMinor > payoutForm.seller.balanceMinor) {
      setError(`Payout must be more than zero and no more than ${formatMoney(Math.max(0, payoutForm.seller.balanceMinor), payoutForm.seller.currency)}.`);
      return;
    }
    if (!payoutForm.paymentAccountId) {
      setError('Choose the business account used for this payout.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await recordMarketplaceSellerPayout({
        spaceId: space.id,
        sellerId: payoutForm.seller.id,
        amountMinor,
        paymentAccountId: payoutForm.paymentAccountId,
        paymentMethod: payoutForm.paymentMethod,
        paymentMethodLabel: payoutForm.paymentMethod === 'other' ? payoutForm.paymentMethodLabel : null,
        payoutDate: payoutForm.payoutDate,
        note: payoutForm.note,
      });
      const sellerName = payoutForm.seller.name;
      setPayoutForm(null);
      setSuccess(`Payout recorded for ${sellerName}. Remaining balance: ${formatMoney(result.data.balanceAfterMinor, payoutForm.seller.currency)}.`);
      await load();
      await onChanged();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return <section className="sme-standard-pos-workspace marketplace-pos-workspace">
    <div className="pos-workspace-heading">
      <div>
        <h2>{role === 'cashier' ? 'Register' : role === 'seller' ? 'Seller area' : 'Consignment POS'}</h2>
        <p>{role === 'seller' ? 'Your listings, sales, and balance.' : 'Sell items from multiple sellers.'}</p>
      </div>

      {(role === 'owner' || role === 'manager') && (
        <Link className="button secondary" to={`/spaces/${space.id}/pos/archived`}>
          Archived Records
        </Link>
      )}
    </div>

    {settings.status !== 'active' && <div className="notice warning">The POS is {settings.status === 'paused' ? 'paused' : 'still in setup'}. Records can be prepared, but checkout is blocked.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-workspace-tabs" role="tablist" aria-label="Consignment POS">
      {availableTabs.map((item) => (
        <button
          key={item}
          type="button"
          className={tab === item ? 'active' : ''}
          onClick={() => {
            setTab(item);
            setError('');
            setSuccess('');
            setSearch('');
          }}
        >
          {item === 'sales' && role === 'cashier'
            ? 'My recent sales'
            : item === 'sales' && role === 'seller'
              ? 'My sales'
              : tabLabels[item]}
        </button>
      ))}
    </div>

    {loading ? <div className="loading-panel">Loading records...</div> : <>
      {tab === 'sellers' && canManageSellers && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Sellers</h3><p>Seller profiles track stock, commission and payouts. A seller profile does not automatically give the person BajetBN login access. For Seller-only access, invite them from Members and choose Seller. If they already have another team role, link that team member to the seller profile below.</p></div><button className="button primary" type="button" onClick={() => openSellerForm('new')}>Add seller profile</button></div>
        <div className="marketplace-seller-grid">{sellers.map((seller) => <article className="sme-pos-product-card" key={seller.id}>
          <div><span className="type-badge">Seller</span><h3>{seller.name}</h3><small>{seller.email || seller.phone || seller.displayId}</small></div>
          <p>{commissionCopy(seller.defaultCommissionType, seller.defaultCommissionRateBps, seller.defaultCommissionMinor, seller.currency)}</p>
          <div className="marketplace-balance-row"><span>{sellerBalanceLabel(seller.balanceMinor)}</span><strong>{formatMoney(Math.abs(seller.balanceMinor), seller.currency)}</strong></div>
          <small>{seller.soldQuantity} item(s) sold · Shop earned {formatMoney(seller.commissionEarnedMinor, seller.currency)} · Paid out {formatMoney(seller.paidOutMinor, seller.currency)}</small>
          <div className="button-row"><button className="button secondary small" type="button" onClick={() => openSellerForm(seller)}>Edit</button>{canManagePayouts && seller.balanceMinor > 0 && <button className="button primary small" type="button" onClick={() => openPayoutForm(seller)}>Record payout</button>}{canDeleteSellers && <button className="button ghost danger small" type="button" onClick={() => setConfirm({ payload: { kind: 'seller', id: seller.id }, title: 'Delete this seller?', description: 'The seller profile will be removed from active and archived seller lists.', note: seller.balanceMinor !== 0 ? 'Settle the seller balance before deletion. Active listings will be removed from the register and historical sales, commission and payouts will stay preserved.' : 'Active listings will be removed from the register. Historical sales, commission and payouts stay preserved.', confirmLabel: 'Delete seller' })}>Delete</button>}</div>
        </article>)}</div>
        {!sellers.length && <div className="empty-inline">No sellers yet. Add a seller before creating a listing.</div>}
      </section>}

      {tab === 'listings' && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>{role === 'seller' ? 'My listings' : 'Seller listings and stock'}</h3><p>Every listing or stock batch keeps its own seller, price, condition, quantity and commission.</p></div><div className="button-row">{canManageStock && <button className="button secondary" type="button" disabled={!listings.some((item) => item.barcode)} onClick={() => setLabelItems(listings)}>Print barcode labels</button>}{canManageListings && <button className="button primary" type="button" onClick={() => openListingForm('new')} disabled={!sellers.length}>Add listing</button>}</div></div>
        <SmePosBarcodeInventoryPanel
          itemLabel="listing"
          items={listings}
          canCreate={canManageListings && sellers.length > 0}
          onCreate={canManageListings && sellers.length > 0 ? (barcode) => openListingForm('new', barcode) : undefined}
          onOpen={canManageListings ? (listing) => openListingForm(listing) : undefined}
          onReceive={canManageStock ? setReceiveForm : undefined}
          onStocktake={canManageStock ? setStocktakeForm : undefined}
          onPrintLabel={canManageStock ? (listing) => setLabelItems([listing]) : undefined}
        />
        <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, seller, category, condition, SKU or barcode" />
        <div className="sme-pos-product-grid">{filteredListings.map((listing) => {
          const outOfStock = listing.quantityOnHand < 1;
          const low = listing.quantityOnHand > 0 && listing.quantityOnHand <= listing.lowStockLevel;
          return <article className={`sme-pos-product-card ${outOfStock ? 'out-of-stock' : ''}`} key={listing.id}>
            {listing.photoPath && <SmePosItemPhoto photoPath={listing.photoPath} name={listing.name} />}
            <div><span className="type-badge">{listing.sellerName}</span><h3>{listing.name}</h3><small>{conditionLabels[listing.condition]} · {listing.sku || listing.displayId}</small>{listing.barcode && <small>Barcode · {listing.barcode}</small>}</div>
            {role !== 'stock_staff' && <strong>{formatMoney(listing.sellingPriceMinor, listing.currency)}</strong>}
            <p className={outOfStock ? 'stock-danger' : low ? 'stock-warning' : ''}>{outOfStock ? 'Out of stock' : `${listing.quantityOnHand} in stock${low ? ' · Low stock' : ''}`}</p>
            {(role === 'owner' || role === 'manager' || role === 'seller') && <small>{commissionCopy(listing.commissionType, listing.commissionRateBps, listing.commissionMinor, listing.currency)}</small>}
            {canManageListings && <div className="button-row"><button className="button secondary small" type="button" onClick={() => openListingForm(listing)}>Edit</button><button className="button primary small" type="button" onClick={() => setReceiveForm(listing)}>Receive stock</button><button className="button secondary small" type="button" onClick={() => setStocktakeForm(listing)}>Count stock</button>{listing.barcode && <button className="button secondary small" type="button" onClick={() => setLabelItems([listing])}>Label</button>}<button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'listing', id: listing.id }, title: 'Archive this listing?', description: 'It will leave the active register while its sales and seller balance history stay unchanged.', note: 'You can restore it from Archived Records.', confirmLabel: 'Archive listing' })}>Archive</button></div>}
            {!canManageListings && canManageStock && <div className="button-row"><button className="button primary small" type="button" onClick={() => setReceiveForm(listing)}>Receive stock</button><button className="button secondary small" type="button" onClick={() => setStocktakeForm(listing)}>Count stock</button><button className="button secondary small" type="button" onClick={() => setStockForm(listing)}>Update stock</button>{listing.barcode && <button className="button secondary small" type="button" onClick={() => setLabelItems([listing])}>Label</button>}</div>}
          </article>;
        })}</div>
        {!filteredListings.length && <div className="empty-inline">No active seller listings found.</div>}
      </section>}

      {tab === 'customers' && <section className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Customers</h3><p>Optional customer details for receipts and repeat visits.</p></div>{canManageCustomers && <button className="button primary" type="button" onClick={() => setCustomerForm('new')}>Add customer</button>}</div>
        <div className="sme-pos-customer-list">{customers.map((customer) => <div className="sme-pos-customer-row" key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</small></div><span>{customer.visitCount || 0} sale{customer.visitCount === 1 ? '' : 's'}</span>{canManageCustomers && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setCustomerForm(customer)}>Edit</button>{canDeleteCustomers && <button className="button ghost danger small" type="button" onClick={() => setConfirm({ payload: { kind: 'customer', id: customer.id }, title: 'Delete this customer?', description: 'The customer will be removed from active and archived customer lists.', note: 'If sales or receipt history exists, BajetBN keeps those historical records but removes the customer profile from active use.', confirmLabel: 'Delete customer' })}>Delete</button>}</div>}</div>)}</div>
        {!customers.length && <div className="empty-inline">No customers yet. The register can still use Walk-in customer.</div>}
      </section>}

      {tab === 'register' && <form className="sme-pos-checkout-layout" onSubmit={completeCheckout}>
        <section className="panel sme-pos-checkout-products">
          <div className="panel-heading"><div><span className="eyebrow">Shared register</span><h3>Choose seller listings</h3><p>One sale can contain items from several sellers.</p></div>{canRegisterExistingStock && <button className="button secondary" type="button" onClick={openManualListingForm} disabled={!sellers.length}>+ Register item</button>}</div>
          <SmePosBarcodeCheckoutScanner
            itemLabel="listing"
            items={listings}
            cartQuantities={cart}
            disabled={!canCheckout || settings.status !== 'active' || busy}
            onAdd={addToCart}
          />
          <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, seller, condition, SKU or barcode" />
          <div className="sme-pos-checkout-product-grid">{filteredListings.map((listing) => {
            const outOfStock = listing.quantityOnHand < 1;
            return <button type="button" key={listing.id} disabled={outOfStock} className={outOfStock ? 'out-of-stock' : ''} onClick={() => addToCart(listing)}>{listing.photoPath && <SmePosItemPhoto photoPath={listing.photoPath} name={listing.name} className="register-thumb" />}<strong>{listing.name}</strong><span>{formatMoney(listing.sellingPriceMinor, listing.currency)}</span><small>{listing.sellerName} · {conditionLabels[listing.condition]}</small><small>{outOfStock ? 'Out of stock' : `${listing.quantityOnHand} available`}</small></button>;
          })}</div>
          {!filteredListings.length && <div className="empty-inline">No seller listings found.</div>}
        </section>
        <section className="panel sme-pos-cart">
          <div className="panel-heading"><div><span className="eyebrow">Current sale</span><h3>Cart</h3><p>{cartLines.reduce((sum, item) => sum + item.quantity, 0)} item(s) · {new Set(cartLines.map((item) => item.listing.sellerId)).size} seller(s)</p></div>{cartLines.length > 0 && <button className="button ghost small" type="button" onClick={() => setCart({})}>Clear cart</button>}</div>
          <div className="sme-pos-cart-lines">{cartLines.map(({ listing, quantity }) => <div key={listing.id}><div><strong>{listing.name}</strong><small>{listing.sellerName} · {formatMoney(listing.sellingPriceMinor, listing.currency)} each</small></div><input type="number" min="0" max={listing.quantityOnHand} value={quantity} onChange={(event) => changeQuantity(listing, Number(event.target.value))} aria-label={`${listing.name} quantity`} /><strong>{formatMoney(listing.sellingPriceMinor * quantity, listing.currency)}</strong></div>)}</div>
          {!cartLines.length && <div className="empty-inline">Tap a listing to begin the sale.</div>}
          <div className="form-stack compact">
            <label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Payment received in<select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} required><option value="">Choose account</option>{paymentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>
            <div className="form-grid"><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodCode)}>{paymentMethods.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>Sale date<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label></div>
            {paymentMethod === 'other' && <label>Other payment method<input value={paymentMethodLabel} onChange={(event) => setPaymentMethodLabel(event.target.value)} required /></label>}
            <label>Discount (BND)<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
            <label>Note<textarea rows={2} value={checkoutNote} onChange={(event) => setCheckoutNote(event.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Customer pays <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
          <button className="button primary pos-complete-sale" type="submit" disabled={busy || !canCheckout || settings.status !== 'active' || !cartLines.length}>{busy ? 'Completing sale…' : settings.status !== 'active' ? 'POS is not active' : `Complete sale · ${formatMoney(totalMinor, settings.currency)}`}</button>
        </section>
      </form>}

      {tab === 'balance' && mySeller && <div className="sme-pos-sales-section">
        <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>{sellerBalanceLabel(mySeller?.balanceMinor || 0)}</span><strong>{formatMoney(Math.abs(mySeller?.balanceMinor || 0), settings.currency)}</strong><small>Sales, returns and payouts update this balance</small></article><article className="summary-card"><span>My gross sales</span><strong>{formatMoney(mySeller?.grossSalesMinor || 0, settings.currency)}</strong><small>{mySeller?.soldQuantity || 0} item(s) currently sold</small></article><article className="summary-card"><span>Paid out</span><strong>{formatMoney(mySeller?.paidOutMinor || 0, settings.currency)}</strong><small>Recorded seller payouts</small></article></div>
        <section className="panel"><div className="panel-heading"><div><h3>Balance activity</h3><p>Sales increase the balance. Returns and payouts reduce it.</p></div></div><div className="sme-pos-sales-list">{mySellerLedger.map((entry) => <div className="marketplace-ledger-row" key={entry.id}><div><strong>{entry.receiptNumber || entry.displayId}</strong><small>{ledgerKindLabel(entry)} · {entry.note || entry.sellerName}</small></div><strong>{entry.amountMinor >= 0 ? '+' : '-'}{formatMoney(Math.abs(entry.amountMinor), entry.currency)}</strong><small>Balance {formatMoney(entry.balanceAfterMinor, entry.currency)}</small></div>)}</div>{!mySellerLedger.length && <div className="empty-inline">No seller balance activity yet.</div>}</section>
        {mySellerPayouts.length > 0 && <section className="panel"><div className="panel-heading"><div><h3>My payouts</h3><p>Recorded payouts for this seller profile.</p></div></div><div className="sme-pos-sales-list">{mySellerPayouts.map((payout) => <div className="marketplace-ledger-row" key={payout.id}><div><strong>{payout.payoutDate}</strong><small>{payout.paymentAccountName}</small></div><strong>-{formatMoney(payout.amountMinor, payout.currency)}</strong><small>Balance {formatMoney(payout.balanceAfterMinor, payout.currency)}</small></div>)}</div></section>}
      </div>}

      {tab === 'sales' && canViewSales && <div className="sme-pos-sales-section">
        {canViewReports && <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Gross sales today</span><strong>{formatMoney(todayGross, settings.currency)}</strong><small>{today()}</small></article><article className="summary-card"><span>Gross sales this month</span><strong>{formatMoney(monthGross, settings.currency)}</strong><small>{monthPrefix}</small></article><article className="summary-card"><span>Shop commission</span><strong>{formatMoney(monthCommission, settings.currency)}</strong><small>This month</small></article><article className="summary-card"><span>Seller money waiting</span><strong>{formatMoney(sellerMoneyWaiting, settings.currency)}</strong><small>Across active sellers</small></article><article className="summary-card"><span>Low stock</span><strong>{lowStock}</strong><small>At or below alert level</small></article></div>}
        {canManageReturns && <SmePosBarcodeReturnScanner itemLabel="listing" items={listings} sales={sales} getSaleItemId={(item) => item.listingId || item.productId} onSelectSale={openReturnForm} />}
        <section className="panel"><div className="panel-heading"><div><h3>{role === 'cashier' ? 'My recent sales' : role === 'seller' ? 'My sales' : 'Recent Marketplace sales'}</h3><p>{role === 'seller' ? 'Only the part of each sale belonging to you is shown.' : 'Open a sale to view its receipt or record a return.'}</p></div></div><div className="sme-pos-sales-list">{sales.map((sale) => <button type="button" key={sale.id} onClick={() => setReceipt(sale)}><div><strong>{sale.receiptNumber}</strong><small>{sale.saleDate} · {sale.customerName || 'Walk-in customer'} · {sale.itemCount} item(s)</small></div><span className="status-badge posted">{sale.status}</span><strong>{formatMoney(role === 'seller' ? (sale.sellerEarningsMinor || 0) : sale.totalMinor - sale.returnedMinor, sale.currency)}</strong></button>)}</div>{!sales.length && <div className="empty-inline">No Marketplace sales available.</div>}</section>
        {canViewReports && <section className="panel"><div className="panel-heading"><div><h3>Recent seller payouts</h3><p>Each payout posts Money Out from the selected business account.</p></div></div><div className="sme-pos-sales-list">{payouts.map((payout) => <div className="marketplace-ledger-row" key={payout.id}><div><strong>{payout.sellerName}</strong><small>{payout.payoutDate} · {payout.paymentAccountName}</small></div><strong>-{formatMoney(payout.amountMinor, payout.currency)}</strong><small>Balance {formatMoney(payout.balanceAfterMinor, payout.currency)}</small></div>)}</div>{!payouts.length && <div className="empty-inline">No seller payouts recorded yet.</div>}</section>}
      </div>}
    </>}

    {manualListingForm && <Modal title="Register existing seller stock" onClose={() => !busy && setManualListingForm(false)}>
      <form className="form-stack" onSubmit={registerExistingListing}>
        <div className="notice">For stock already physically in the shop. No purchase record is created. The seller's default commission is applied automatically. Barcode is optional.</div>
        <SmePosItemPhotoField currentPhotoPath={null} file={manualListingPhotoFile} removeExisting={false} onFileChange={setManualListingPhotoFile} onRemoveExisting={() => undefined} disabled={busy} />
        <label>Seller<select name="sellerId" defaultValue={sellers[0]?.id || ''} required>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
        <div className="form-grid">
          <label>Item name<input name="name" maxLength={100} required autoFocus /></label>
          <label>Category<input name="category" maxLength={60} /></label>
          <label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" required /></label>
          <label>Quantity on hand<input name="quantity" type="number" min="0" max="999999" defaultValue={1} required /></label>
          <label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={1} required /></label>
          <label>SKU (optional)<input name="sku" maxLength={50} /></label>
          <label>Barcode (optional)<input name="barcode" maxLength={240} autoComplete="off" /></label>
          <label>Condition<select value={manualListingCondition} onChange={(event) => setManualListingCondition(event.target.value as SmePosListingCondition)}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Condition details<input name="conditionNote" maxLength={120} placeholder="Optional" /></label>
        </div>
        <label>Note<textarea name="note" rows={2} maxLength={300} placeholder="Optional" /></label>
        <small>Source is recorded as Existing stock / Manual registration with the staff member and time.</small>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setManualListingForm(false)} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register item'}</button></div>
      </form>
    </Modal>}

    {sellerForm && <Modal title={sellerForm === 'new' ? 'Add seller profile' : 'Edit seller profile'} onClose={() => !busy && setSellerForm(null)}><form className="form-stack" onSubmit={saveSeller}>
      <label>Seller name<input name="name" defaultValue={sellerForm === 'new' ? '' : sellerForm.name} maxLength={100} required /></label>
      <div className="form-grid"><label>WhatsApp or phone<input name="phone" defaultValue={sellerForm === 'new' ? '' : sellerForm.phone || ''} maxLength={32} /></label><label>Email<input name="email" type="email" defaultValue={sellerForm === 'new' ? '' : sellerForm.email || ''} maxLength={120} /></label></div>
      <label>Link to team member<select name="linkedUid" defaultValue={sellerForm === 'new' ? '' : sellerForm.linkedUid || ''}><option value="">No login linked</option>{sellerAccess.map((item) => <option key={item.uid} value={item.uid}>{item.displayName && item.displayName !== item.uid
  ? `${item.displayName} · ${item.role.replace('_', ' ')}`
  : item.email && item.email !== item.uid
    ? `${item.email} · ${item.role.replace('_', ' ')}`
    : `Team member · ${item.role.replace('_', ' ')}`}</option>)}</select><small>A Manager, Cashier, Stock Staff, Viewer or Seller-only user can also own this seller profile. Their main POS role stays unchanged.</small></label>
      <fieldset className="pos-item-type-fieldset"><legend>Default shop commission</legend><label className={`pos-item-type-option ${sellerCommissionType === 'percentage' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="percentage" checked={sellerCommissionType === 'percentage'} onChange={() => setSellerCommissionType('percentage')} /><span><strong>Percentage</strong><small>The shop keeps a percentage of the final selling amount.</small></span></label><label className={`pos-item-type-option ${sellerCommissionType === 'fixed_per_item' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="fixed_per_item" checked={sellerCommissionType === 'fixed_per_item'} onChange={() => setSellerCommissionType('fixed_per_item')} /><span><strong>Fixed amount per item</strong><small>The shop keeps the same amount for every unit sold.</small></span></label></fieldset>
      {sellerCommissionType === 'percentage' ? <label>Commission percentage<input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={sellerForm === 'new' ? '3' : (sellerForm.defaultCommissionRateBps / 100).toFixed(2)} required /></label> : <label>Commission per item (BND)<input name="commissionFixed" inputMode="decimal" defaultValue={sellerForm === 'new' ? '0.00' : (sellerForm.defaultCommissionMinor / 100).toFixed(2)} required /></label>}
      <label>Note<textarea name="note" rows={3} defaultValue={sellerForm === 'new' ? '' : sellerForm.note || ''} maxLength={300} /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setSellerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save seller'}</button></div>
    </form></Modal>}

    {listingForm && <Modal title={listingForm === 'new' ? 'Add seller listing' : 'Edit seller listing'} onClose={() => !busy && setListingForm(null)}><form className="form-stack" onSubmit={saveListing}>
      <SmePosItemPhotoField currentPhotoPath={listingForm === 'new' ? null : listingForm.photoPath} file={listingPhotoFile} removeExisting={removeListingPhoto} onFileChange={setListingPhotoFile} onRemoveExisting={setRemoveListingPhoto} disabled={busy} />
      <label>Seller<select name="sellerId" defaultValue={listingForm === 'new' ? sellers[0]?.id || '' : listingForm.sellerId} required>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
      <div className="form-grid"><label>Item name<input name="name" defaultValue={listingForm === 'new' ? '' : listingForm.name} maxLength={100} required /></label><label>Category<input name="category" defaultValue={listingForm === 'new' ? '' : listingForm.category || ''} maxLength={60} /></label><label>SKU (optional)<input name="sku" defaultValue={listingForm === 'new' ? '' : listingForm.sku || ''} maxLength={50} /></label><label>Barcode (optional)<input name="barcode" defaultValue={listingForm === 'new' ? newListingBarcode : listingForm.barcode || ''} maxLength={240} autoComplete="off" /></label><label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" defaultValue={listingForm === 'new' ? '' : (listingForm.sellingPriceMinor / 100).toFixed(2)} required /></label></div>
      <div className="form-grid"><label>Condition<select name="condition" value={listingCondition} onChange={(event) => setListingCondition(event.target.value as SmePosListingCondition)}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Condition details<input name="conditionNote" defaultValue={listingForm === 'new' ? '' : listingForm.conditionNote || ''} maxLength={120} placeholder="Optional" /></label></div>
      <fieldset className="pos-item-type-fieldset"><legend>Commission for this listing</legend><label className={`pos-item-type-option ${listingCommissionType === 'percentage' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="percentage" checked={listingCommissionType === 'percentage'} onChange={() => setListingCommissionType('percentage')} /><span><strong>Percentage</strong><small>Calculated after any sale discount is shared across the cart.</small></span></label><label className={`pos-item-type-option ${listingCommissionType === 'fixed_per_item' ? 'selected' : ''}`}><input type="radio" name="commissionType" value="fixed_per_item" checked={listingCommissionType === 'fixed_per_item'} onChange={() => setListingCommissionType('fixed_per_item')} /><span><strong>Fixed amount per item</strong><small>Must be lower than the item selling price.</small></span></label></fieldset>
      {listingCommissionType === 'percentage' ? <label>Commission percentage<input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={listingForm === 'new' ? '3' : (listingForm.commissionRateBps / 100).toFixed(2)} required /></label> : <label>Commission per item (BND)<input name="commissionFixed" inputMode="decimal" defaultValue={listingForm === 'new' ? '0.00' : (listingForm.commissionMinor / 100).toFixed(2)} required /></label>}
      <div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={listingForm === 'new' ? 0 : listingForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={listingForm === 'new' ? 1 : listingForm.lowStockLevel} required /></label></div>
      <label>Note<textarea name="note" rows={3} defaultValue={listingForm === 'new' ? '' : listingForm.note || ''} maxLength={300} /></label>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setListingForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save listing'}</button></div>
    </form></Modal>}

    {receiveForm && <Modal title={`Receive stock · ${receiveForm.name}`} onClose={() => !busy && setReceiveForm(null)}><form className="form-stack" onSubmit={receiveStock}><div className="notice">Current stock: <strong>{receiveForm.quantityOnHand}</strong>. Scanning did not change this number.</div><label>Quantity received<input name="quantityReceived" type="number" min="1" max={Math.max(1, 999999 - receiveForm.quantityOnHand)} defaultValue={1} required autoFocus /></label><label>Receiving note<textarea name="note" rows={2} maxLength={300} placeholder="Optional seller, delivery or reference" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setReceiveForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Receiving…' : 'Confirm received stock'}</button></div></form></Modal>}

    {stockForm && <Modal title={`Update stock · ${stockForm.name}`} onClose={() => !busy && setStockForm(null)}><form className="form-stack" onSubmit={saveStock}><div className="notice">Stock staff can change only the quantity and low-stock alert. Seller, price and commission stay owner or manager controlled.</div><div className="form-grid"><label>Available quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={stockForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={stockForm.lowStockLevel} required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStockForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save stock'}</button></div></form></Modal>}

    {stocktakeForm && <Modal title={`Count stock · ${stocktakeForm.name}`} onClose={() => !busy && setStocktakeForm(null)}><form className="form-stack" onSubmit={saveStocktake}><div className="notice">System quantity: <strong>{stocktakeForm.quantityOnHand}</strong>. Enter the physical count. Nothing changes until you confirm.</div><label>Physical count<input name="countedQuantity" type="number" min="0" max="999999" defaultValue={stocktakeForm.quantityOnHand} required autoFocus /></label><label>Count note<textarea name="note" rows={2} maxLength={300} placeholder="Optional seller batch, shelf, counter or reference" /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setStocktakeForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving count…' : 'Confirm physical count'}</button></div></form></Modal>}

    {labelItems && <SmePosBarcodeLabelDialog itemLabel="listing" items={labelItems} shopName={settings.shopName || settings.receiptName || space.name} onClose={() => setLabelItems(null)} />}

    {customerForm && <Modal title={customerForm === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => !busy && setCustomerForm(null)}><form className="form-stack" onSubmit={saveCustomer}><label>Customer name<input name="name" defaultValue={customerForm === 'new' ? '' : customerForm.name} maxLength={100} required /></label><div className="form-grid"><label>Phone<input name="phone" defaultValue={customerForm === 'new' ? '' : customerForm.phone || ''} maxLength={30} /></label><label>Email<input name="email" type="email" defaultValue={customerForm === 'new' ? '' : customerForm.email || ''} maxLength={120} /></label></div><label>Note<textarea name="note" rows={3} defaultValue={customerForm === 'new' ? '' : customerForm.note || ''} maxLength={300} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCustomerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></div></form></Modal>}

    {receipt && <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={() => setReceipt(null)}>
      <div className="sme-pos-receipt">
        <header><strong>{receipt.receiptName}</strong><span>{receipt.saleDate}</span><small>{receipt.customerName || 'Walk-in customer'}</small></header>
        {receipt.items.map((item, index) => <div className="sme-pos-receipt-line" key={`${item.listingId || item.productId}-${index}`}>
          <span>{item.quantity} × {item.productName}{item.returnedQuantity > 0 ? ` · ${item.returnedQuantity} returned` : ''}</span>
          <strong>{formatMoney(item.netLineMinor ?? item.lineTotalMinor, receipt.currency)}</strong>
        </div>)}
        <div className="sme-pos-receipt-totals">
          <span>Original total <strong>{formatMoney(receipt.totalMinor, receipt.currency)}</strong></span>
          {receipt.returnedMinor > 0 && <span>Refunded <strong>-{formatMoney(receipt.returnedMinor, receipt.currency)}</strong></span>}
          <span>Net sale <strong>{formatMoney(receipt.totalMinor - receipt.returnedMinor, receipt.currency)}</strong></span>
        </div>
        <p>{receipt.receiptFooter}</p>
        {receipt.paymentAccountName && <small>Paid into {receipt.paymentAccountName}</small>}
      </div>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={() => window.print()}>Print</button>
        {canManageReturns && receipt.status !== 'refunded' && <button className="button secondary" type="button" onClick={() => openReturnForm(receipt)}>Return items</button>}
        <button className="button primary" type="button" onClick={() => setReceipt(null)}>Done</button>
      </div>
    </Modal>}

    {returnForm && <Modal title={`Return items · ${returnForm.sale.receiptNumber}`} onClose={() => !busy && setReturnForm(null)}>
      <form className="form-stack" onSubmit={submitReturn}>
        <div className="notice">The customer refund posts as Money Out from the original shop account. Seller balances, commission, listing stock and reports are adjusted together.</div>
        <div className="sme-pos-cart-lines">
          {returnForm.sale.items.map((item) => {
            const itemId = item.listingId || item.productId;
            const remaining = Math.max(0, item.quantity - item.returnedQuantity);
            return <div key={itemId}>
              <div><strong>{item.productName}</strong><small>{item.sellerName || 'Seller'} · {remaining} returnable of {item.quantity} sold</small></div>
              <input
                type="number"
                min="0"
                max={remaining}
                value={returnForm.quantities[itemId] || 0}
                onChange={(event) => setReturnForm((current) => current ? {
                  ...current,
                  quantities: { ...current.quantities, [itemId]: Math.min(remaining, Math.max(0, Number(event.target.value) || 0)) },
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

    {payoutForm && <Modal title={`Record payout · ${payoutForm.seller.name}`} onClose={() => !busy && setPayoutForm(null)}>
      <form className="form-stack" onSubmit={submitPayout}>
        <div className="notice">Available seller balance: {formatMoney(Math.max(0, payoutForm.seller.balanceMinor), payoutForm.seller.currency)}. The payout posts as Money Out and creates permanent payout and seller-balance history.</div>
        <label>Payout amount (BND)<input inputMode="decimal" value={payoutForm.amount} onChange={(event) => setPayoutForm((current) => current ? { ...current, amount: event.target.value } : current)} required /></label>
        <label>Paid from<select value={payoutForm.paymentAccountId} onChange={(event) => setPayoutForm((current) => current ? { ...current, paymentAccountId: event.target.value } : current)} required><option value="">Choose business account</option>{paymentAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label>
        <div className="form-grid"><label>Payment method<select value={payoutForm.paymentMethod} onChange={(event) => setPayoutForm((current) => current ? { ...current, paymentMethod: event.target.value as PaymentMethodCode } : current)}>{paymentMethods.map((method) => <option value={method.code} key={method.code}>{method.label}</option>)}</select></label><label>Payout date<input type="date" value={payoutForm.payoutDate} onChange={(event) => setPayoutForm((current) => current ? { ...current, payoutDate: event.target.value } : current)} required /></label></div>
        {payoutForm.paymentMethod === 'other' && <label>Other payment method<input value={payoutForm.paymentMethodLabel} onChange={(event) => setPayoutForm((current) => current ? { ...current, paymentMethodLabel: event.target.value } : current)} required /></label>}
        <label>Note<textarea rows={3} value={payoutForm.note} onChange={(event) => setPayoutForm((current) => current ? { ...current, note: event.target.value } : current)} maxLength={500} placeholder="Optional reference or note" /></label>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setPayoutForm(null)} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Recording payout…' : 'Confirm seller payout'}</button></div>
      </form>
    </Modal>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void archiveConfirmed()} />}
  </section>;
}
