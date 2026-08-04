import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionConfirmModal, type ActionConfirmState } from '../../components/ActionConfirmModal';
import { Modal } from '../../components/Modal';
import {
  checkoutStandardPos,
  listSmePosCustomers,
  listSmePosProducts,
  listSmePosPaymentAccounts,
  listSmePosSales,
  saveSmePosCustomer,
  saveSmePosProduct,
  setSmePosCustomerArchived,
  setSmePosProductArchived,
} from '../../repositories/smePosRepository';
import type {
  PaymentMethodCode,
  SmePosCustomer,
  SmePosProduct,
  SmePosPaymentAccount,
  SmePosRole,
  SmePosSale,
  SmePosSettings,
  Space,
} from '../../types/models';
import { formatMoney, toMinorUnits } from '../../utils/money';
import { getErrorMessage } from '../../utils/errors';

interface Props {
  space: Space;
  settings: SmePosSettings;
  role: SmePosRole;
  onChanged: () => Promise<void> | void;
}

type WorkspaceTab = 'products' | 'customers' | 'checkout' | 'sales';
type ConfirmPayload =
  | { kind: 'product'; id: string }
  | { kind: 'customer'; id: string };

const paymentMethods: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Cash' },
  { code: 'bank_transfer', label: 'Bank transfer' },
  { code: 'debit_card', label: 'Debit card' },
  { code: 'credit_card', label: 'Credit card' },
  { code: 'e_wallet', label: 'E-wallet' },
  { code: 'qr_payment', label: 'QR payment' },
  { code: 'other', label: 'Other' },
];

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Brunei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function StandardPosWorkspace({ space, settings, role, onChanged }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>('products');
  const [products, setProducts] = useState<SmePosProduct[]>([]);
  const [customers, setCustomers] = useState<SmePosCustomer[]>([]);
  const [sales, setSales] = useState<SmePosSale[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<SmePosPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productForm, setProductForm] = useState<SmePosProduct | 'new' | null>(null);
  const [customerForm, setCustomerForm] = useState<SmePosCustomer | 'new' | null>(null);
  const [receipt, setReceipt] = useState<SmePosSale | null>(null);
  const [confirm, setConfirm] = useState<ActionConfirmState<ConfirmPayload> | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(settings.defaultPaymentAccountId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cash');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('');
  const [discount, setDiscount] = useState('0.00');
  const [saleDate, setSaleDate] = useState(today());
  const [checkoutNote, setCheckoutNote] = useState('');

  const canManageProducts = ['owner', 'manager', 'stock_staff'].includes(role);
  const canManageCustomers = ['owner', 'manager', 'cashier'].includes(role);
  const canCheckout = ['owner', 'manager', 'cashier'].includes(role);

  async function load() {
    setLoading(true);
    setError('');
    try {
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
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [space.id]);
  useEffect(() => { if (!paymentAccountId && settings.defaultPaymentAccountId) setPaymentAccountId(settings.defaultPaymentAccountId); }, [paymentAccountId, settings.defaultPaymentAccountId]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((item) => !term || [item.name, item.category, item.sku].some((value) => value?.toLowerCase().includes(term)));
  }, [products, search]);

  const cartLines = useMemo(() => Object.entries(cart).map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return product ? { product, quantity } : null;
  }).filter((item): item is { product: SmePosProduct; quantity: number } => Boolean(item)), [cart, products]);

  const subtotalMinor = cartLines.reduce((sum, item) => sum + item.product.sellingPriceMinor * item.quantity, 0);
  let discountMinor = 0;
  try { discountMinor = Math.max(0, toMinorUnits(discount || '0')); } catch { discountMinor = 0; }
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const monthPrefix = today().slice(0, 7);
  const todaySales = sales.filter((item) => item.saleDate === today() && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthSales = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.totalMinor - item.returnedMinor, 0);
  const monthProfit = sales.filter((item) => item.saleDate.startsWith(monthPrefix) && item.status !== 'refunded').reduce((sum, item) => sum + item.profitMinor, 0);
  const lowStock = products.filter((item) => item.trackStock && item.quantityOnHand <= item.lowStockLevel).length;

  function requireOnline() {
    if (navigator.onLine) return true;
    setError('Connect to the internet to change shop records or complete checkout.');
    return false;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productForm || !requireOnline()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess('');
    try {
      await saveSmePosProduct({
        spaceId: space.id,
        productId: productForm === 'new' ? undefined : productForm.id,
        name: String(form.get('name') || ''),
        category: String(form.get('category') || ''),
        sku: String(form.get('sku') || ''),
        note: String(form.get('note') || ''),
        sellingPriceMinor: toMinorUnits(String(form.get('sellingPrice') || '')),
        costPriceMinor: String(form.get('costPrice') || '').trim() ? toMinorUnits(String(form.get('costPrice'))) : null,
        trackStock: form.get('trackStock') === 'on',
        quantityOnHand: Number(form.get('quantity') || 0),
        lowStockLevel: Number(form.get('lowStock') || 0),
      });
      setProductForm(null);
      setSuccess(productForm === 'new' ? 'Product added.' : 'Product updated.');
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
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
      setCustomerForm(null);
      setSuccess(customerForm === 'new' ? 'Customer added.' : 'Customer updated.');
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  }

  async function archiveConfirmed() {
    if (!confirm || !requireOnline()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      if (confirm.payload.kind === 'product') await setSmePosProductArchived(space.id, confirm.payload.id, true);
      else await setSmePosCustomerArchived(space.id, confirm.payload.id, true);
      setSuccess(confirm.payload.kind === 'product' ? 'Product moved to archived records.' : 'Customer moved to archived records.');
      setConfirm(null);
      await load(); await onChanged();
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  }

  function addToCart(product: SmePosProduct) {
    setCart((current) => {
      const next = (current[product.id] || 0) + 1;
      if (product.trackStock && next > product.quantityOnHand) return current;
      return { ...current, [product.id]: next };
    });
  }

  function changeQuantity(product: SmePosProduct, value: number) {
    const next = Math.max(0, Math.floor(value));
    setCart((current) => {
      const result = { ...current };
      if (next === 0) delete result[product.id];
      else result[product.id] = product.trackStock ? Math.min(next, product.quantityOnHand) : next;
      return result;
    });
  }

  async function completeCheckout(event: FormEvent) {
    event.preventDefault();
    if (!requireOnline()) return;
    if (!cartLines.length) { setError('Add at least one product to the checkout.'); return; }
    if (!paymentAccountId) { setError('Choose where the payment was received.'); return; }
    if (discountMinor >= subtotalMinor) { setError('Discount must be less than the subtotal.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await checkoutStandardPos({
        spaceId: space.id,
        items: cartLines.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        customerId: customerId || null,
        paymentAccountId,
        paymentMethod,
        paymentMethodLabel: paymentMethod === 'other' ? paymentMethodLabel : null,
        discountMinor,
        saleDate,
        note: checkoutNote,
      });
      await load(); await onChanged();
      const nextSales = await listSmePosSales(space.id);
      setSales(nextSales);
      setReceipt(nextSales.find((item) => item.id === result.data.saleId) || nextSales[0] || null);
      setCart({}); setCustomerId(''); setDiscount('0.00'); setCheckoutNote('');
      setSuccess(`Sale completed. Receipt ${result.data.receiptNumber} is ready.`);
    } catch (nextError) { setError(getErrorMessage(nextError)); }
    finally { setBusy(false); }
  }

  if (role === 'seller') return <section className="panel"><span className="eyebrow">Shop-owned stock</span><h2>Standard POS tools</h2><p>Seller stock, listings and seller reports will be added in the Marketplace Consignment POS phase.</p></section>;

  return <section className="sme-standard-pos-workspace">
    <div className="panel-heading"><div><span className="eyebrow">Standard POS</span><h2>Products, customers and checkout</h2><p>Shop-owned stock works in both Standard and Marketplace POS modes.</p></div><Link className="button secondary" to={`/spaces/${space.id}/pos/archived`}>Archived POS records</Link></div>
    {settings.status !== 'active' && <div className="notice warning">The POS is {settings.status === 'paused' ? 'paused' : 'still in setup'}. Products and customers can be prepared, but checkout requires an active POS.</div>}
    {error && <div className="notice error">{error}</div>}
    {success && <div className="notice success">{success}</div>}

    <div className="sme-pos-workspace-tabs" role="tablist">
      {(['products', 'customers', 'checkout', 'sales'] as WorkspaceTab[]).map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setError(''); setSuccess(''); }}>{item === 'sales' ? 'Sales & reports' : item[0].toUpperCase() + item.slice(1)}</button>)}
    </div>

    {loading ? <div className="loading-panel">Loading shop records…</div> : <>
      {tab === 'products' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Products and stock</h3><p>{products.length} active product{products.length === 1 ? '' : 's'}</p></div>{canManageProducts && <button className="button primary" type="button" onClick={() => setProductForm('new')}>Add product</button>}</div>
        <input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, category or SKU" />
        <div className="sme-pos-product-grid">{filteredProducts.map((product) => <article className="sme-pos-product-card" key={product.id}>
          <div><span className="type-badge">{product.category || 'Product'}</span><h3>{product.name}</h3><small>{product.sku || product.displayId}</small></div>
          <strong>{formatMoney(product.sellingPriceMinor, product.currency)}</strong>
          <p>{product.trackStock ? `${product.quantityOnHand} in stock${product.quantityOnHand <= product.lowStockLevel ? ' · Low stock' : ''}` : 'Stock not tracked'}</p>
          {canManageProducts && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setProductForm(product)}>Edit</button><button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'product', id: product.id }, title: 'Archive this product?', description: 'It will leave the active product list but its sales history will stay.', note: 'You can restore it from Archived POS records.', confirmLabel: 'Archive product' })}>Archive</button></div>}
        </article>)}</div>
        {!filteredProducts.length && <div className="empty-inline">No active products found.</div>}
      </div>}

      {tab === 'customers' && <div className="panel sme-pos-module-panel">
        <div className="panel-heading"><div><h3>Customers</h3><p>Optional customer details for receipts and repeat visits.</p></div>{canManageCustomers && <button className="button primary" type="button" onClick={() => setCustomerForm('new')}>Add customer</button>}</div>
        <div className="sme-pos-customer-list">{customers.map((customer) => <div className="sme-pos-customer-row" key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}</small></div><span>{customer.visitCount || 0} sale{customer.visitCount === 1 ? '' : 's'}</span>{canManageCustomers && <div className="button-row"><button className="button secondary small" type="button" onClick={() => setCustomerForm(customer)}>Edit</button><button className="button ghost small" type="button" onClick={() => setConfirm({ payload: { kind: 'customer', id: customer.id }, title: 'Archive this customer?', description: 'The customer will leave the active list while old receipts and sales stay unchanged.', note: 'You can restore the customer later.', confirmLabel: 'Archive customer' })}>Archive</button></div>}</div>)}</div>
        {!customers.length && <div className="empty-inline">No customers yet. Checkout can still use Walk-in customer.</div>}
      </div>}

      {tab === 'checkout' && <form className="sme-pos-checkout-layout" onSubmit={completeCheckout}>
        <section className="panel sme-pos-checkout-products"><div className="panel-heading"><div><h3>Choose products</h3><p>Search and add shop-owned stock.</p></div></div><input className="sme-pos-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /><div className="sme-pos-checkout-product-grid">{filteredProducts.map((product) => <button type="button" key={product.id} disabled={product.trackStock && product.quantityOnHand < 1} onClick={() => addToCart(product)}><strong>{product.name}</strong><span>{formatMoney(product.sellingPriceMinor, product.currency)}</span><small>{product.trackStock ? `${product.quantityOnHand} available` : 'Available'}</small></button>)}</div></section>
        <section className="panel sme-pos-cart"><div className="panel-heading"><div><h3>Current sale</h3><p>{cartLines.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></div></div>
          <div className="sme-pos-cart-lines">{cartLines.map(({ product, quantity }) => <div key={product.id}><div><strong>{product.name}</strong><small>{formatMoney(product.sellingPriceMinor, product.currency)} each</small></div><input type="number" min="0" max={product.trackStock ? product.quantityOnHand : 9999} value={quantity} onChange={(event) => changeQuantity(product, Number(event.target.value))} /><strong>{formatMoney(product.sellingPriceMinor * quantity, product.currency)}</strong></div>)}</div>
          {!cartLines.length && <div className="empty-inline">Add products to begin checkout.</div>}
          <div className="form-stack compact"><label>Customer<select value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Walk-in customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Payment received in<select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} required><option value="">Choose account</option>{paymentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label><div className="form-grid"><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodCode)}>{paymentMethods.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>Sale date<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label></div>{paymentMethod === 'other' && <label>Other payment method<input value={paymentMethodLabel} onChange={(event) => setPaymentMethodLabel(event.target.value)} required /></label>}<label>Discount (BND)<input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label><label>Note<textarea rows={2} value={checkoutNote} onChange={(event) => setCheckoutNote(event.target.value)} placeholder="Optional" /></label></div>
          <div className="sme-pos-totals"><span>Subtotal <strong>{formatMoney(subtotalMinor, settings.currency)}</strong></span><span>Discount <strong>-{formatMoney(discountMinor, settings.currency)}</strong></span><span className="total">Total <strong>{formatMoney(totalMinor, settings.currency)}</strong></span></div>
          <button className="button primary" type="submit" disabled={busy || !canCheckout || settings.status !== 'active' || !cartLines.length}>{busy ? 'Completing sale…' : settings.status !== 'active' ? 'Activate POS to checkout' : canCheckout ? 'Complete sale' : 'Checkout access required'}</button>
        </section>
      </form>}

      {tab === 'sales' && <div className="sme-pos-sales-section">
        <div className="summary-grid sme-pos-report-grid"><article className="summary-card featured"><span>Sales today</span><strong>{formatMoney(todaySales, settings.currency)}</strong><small>{today()}</small></article><article className="summary-card"><span>Sales this month</span><strong>{formatMoney(monthSales, settings.currency)}</strong><small>{monthPrefix}</small></article><article className="summary-card"><span>Estimated profit</span><strong>{formatMoney(monthProfit, settings.currency)}</strong><small>Sales minus saved product costs</small></article><article className="summary-card"><span>Low stock</span><strong>{lowStock}</strong><small>At or below alert level</small></article></div>
        <section className="panel"><div className="panel-heading"><div><h3>Recent sales</h3><p>Returns use these saved sale lines in the next POS phase.</p></div></div><div className="sme-pos-sales-list">{sales.map((sale) => <button type="button" key={sale.id} onClick={() => setReceipt(sale)}><div><strong>{sale.receiptNumber}</strong><small>{sale.saleDate} · {sale.customerName || 'Walk-in customer'} · {sale.itemCount} item(s)</small></div><span className="status-badge posted">{sale.status}</span><strong>{formatMoney(sale.totalMinor - sale.returnedMinor, sale.currency)}</strong></button>)}</div>{!sales.length && <div className="empty-inline">No POS sales yet.</div>}</section>
      </div>}
    </>}

    {productForm && <Modal title={productForm === 'new' ? 'Add product' : 'Edit product'} onClose={() => !busy && setProductForm(null)}><form className="form-stack" onSubmit={saveProduct}><div className="form-grid"><label>Product name<input name="name" defaultValue={productForm === 'new' ? '' : productForm.name} maxLength={100} required /></label><label>Category<input name="category" defaultValue={productForm === 'new' ? '' : productForm.category || ''} maxLength={60} placeholder="Example: Food, electronics" /></label><label>SKU (optional)<input name="sku" defaultValue={productForm === 'new' ? '' : productForm.sku || ''} maxLength={50} /></label><label>Selling price (BND)<input name="sellingPrice" inputMode="decimal" defaultValue={productForm === 'new' ? '' : (productForm.sellingPriceMinor / 100).toFixed(2)} required /></label><label>Cost price (BND)<input name="costPrice" inputMode="decimal" defaultValue={productForm === 'new' || productForm.costPriceMinor == null ? '' : (productForm.costPriceMinor / 100).toFixed(2)} placeholder="Optional" /></label><label>Quantity<input name="quantity" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 0 : productForm.quantityOnHand} required /></label><label>Low stock alert<input name="lowStock" type="number" min="0" max="999999" defaultValue={productForm === 'new' ? 2 : productForm.lowStockLevel} required /></label><label className="checkbox-field"><input name="trackStock" type="checkbox" defaultChecked={productForm === 'new' ? true : productForm.trackStock} /> Track stock quantity</label><label className="span-2">Note<textarea name="note" rows={2} defaultValue={productForm === 'new' ? '' : productForm.note || ''} maxLength={300} /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setProductForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div></form></Modal>}

    {customerForm && <Modal title={customerForm === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => !busy && setCustomerForm(null)}><form className="form-stack" onSubmit={saveCustomer}><label>Customer name<input name="name" defaultValue={customerForm === 'new' ? '' : customerForm.name} maxLength={100} required /></label><div className="form-grid"><label>Phone<input name="phone" defaultValue={customerForm === 'new' ? '' : customerForm.phone || ''} maxLength={30} /></label><label>Email<input name="email" type="email" defaultValue={customerForm === 'new' ? '' : customerForm.email || ''} maxLength={120} /></label></div><label>Note<textarea name="note" rows={3} defaultValue={customerForm === 'new' ? '' : customerForm.note || ''} maxLength={300} /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setCustomerForm(null)}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button></div></form></Modal>}

    {receipt && <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={() => setReceipt(null)}><div className="sme-pos-receipt"><header><strong>{receipt.receiptName}</strong><span>{receipt.saleDate}</span><small>{receipt.customerName || 'Walk-in customer'}</small></header>{receipt.items.map((item) => <div className="sme-pos-receipt-line" key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{formatMoney(item.lineTotalMinor, receipt.currency)}</strong></div>)}<div className="sme-pos-receipt-totals"><span>Subtotal <strong>{formatMoney(receipt.subtotalMinor, receipt.currency)}</strong></span><span>Discount <strong>-{formatMoney(receipt.discountMinor, receipt.currency)}</strong></span><span>Total <strong>{formatMoney(receipt.totalMinor, receipt.currency)}</strong></span></div><p>{receipt.receiptFooter}</p><small>Paid into {receipt.paymentAccountName}</small></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => window.print()}>Print</button><button className="button primary" type="button" onClick={() => setReceipt(null)}>Done</button></div></Modal>}

    {confirm && <ActionConfirmModal state={confirm} busy={busy} error={error} onClose={() => { setConfirm(null); setError(''); }} onConfirm={() => void archiveConfirmed()} />}
  </section>;
}
