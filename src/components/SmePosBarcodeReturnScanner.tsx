import { type FormEvent, useState } from 'react';
import type { SmePosSale, SmePosSaleItem } from '../types/models';
import { BarcodeCameraScanner } from './BarcodeCameraScanner';
import type { SmePosBarcodeItem } from './SmePosBarcodeInventoryPanel';

interface Props<T extends SmePosBarcodeItem> {
  itemLabel: 'product' | 'listing';
  items: T[];
  sales: SmePosSale[];
  disabled?: boolean;
  getSaleItemId: (item: SmePosSaleItem) => string;
  onSelectSale: (sale: SmePosSale) => void;
}

function barcodeKey(value: string) {
  return value.trim().normalize('NFKC').toLowerCase();
}

export function SmePosBarcodeReturnScanner<T extends SmePosBarcodeItem>({
  itemLabel,
  items,
  sales,
  disabled = false,
  getSaleItemId,
  onSelectSale,
}: Props<T>) {
  const [barcode, setBarcode] = useState('');
  const [matchedItem, setMatchedItem] = useState<{ id: string; name: string } | null>(null);
  const [matchingSales, setMatchingSales] = useState<SmePosSale[]>([]);
  const [searched, setSearched] = useState(false);
  const [scannerError, setScannerError] = useState('');

  function findReturn(value: string) {
    const clean = value.trim();
    if (!clean || disabled) return;
    const key = barcodeKey(clean);
    const activeItem = items.find((candidate) => candidate.barcode && barcodeKey(candidate.barcode) === key) || null;
    const historicLine = sales.flatMap((sale) => sale.items).find((line) => line.barcode && barcodeKey(line.barcode) === key) || null;
    const item = activeItem
      ? { id: activeItem.id, name: activeItem.name }
      : historicLine
        ? { id: getSaleItemId(historicLine), name: historicLine.productName }
        : null;
    const nextSales = item ? sales.filter((sale) => sale.status !== 'refunded' && sale.items.some((line) => (
      getSaleItemId(line) === item.id && line.quantity > line.returnedQuantity
    ))) : [];
    setBarcode(clean);
    setMatchedItem(item);
    setMatchingSales(nextSales);
    setSearched(true);
    setScannerError('');
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    findReturn(barcode);
  }

  function clear() {
    setBarcode('');
    setMatchedItem(null);
    setMatchingSales([]);
    setSearched(false);
  }

  return <section className="sme-pos-return-scanner">
    <div className="sme-pos-barcode-heading">
      <div>
        <span className="eyebrow">Return lookup</span>
        <h4>Scan a sold {itemLabel}</h4>
        <p>Scanning finds returnable sales only. It never refunds or changes stock automatically.</p>
      </div>
      <BarcodeCameraScanner
        startLabel={`Scan returned ${itemLabel}`}
        disabled={disabled}
        onDetected={findReturn}
        onError={setScannerError}
      />
    </div>
    <form className="sme-pos-barcode-entry" onSubmit={submitManual}>
      <label>Barcode number or code<input value={barcode} onChange={(event) => setBarcode(event.target.value)} maxLength={240} autoComplete="off" placeholder="Scan or type the returned item barcode" disabled={disabled} /></label>
      <button className="button secondary" type="submit" disabled={disabled || !barcode.trim()}>Find sale</button>
    </form>
    {scannerError && <div className="notice error">{scannerError}</div>}
    {searched && !matchedItem && <div className="notice error">Barcode not found. No return was started.</div>}
    {searched && matchedItem && matchingSales.length === 0 && <div className="notice warning">{matchedItem.name} has no returnable sale in the available history.</div>}
    {matchingSales.length > 0 && <div className="sme-pos-return-matches">
      <div><strong>{matchedItem?.name}</strong><small>Choose the correct receipt before selecting return quantities.</small></div>
      {matchingSales.map((sale) => {
        const line = sale.items.find((candidate) => getSaleItemId(candidate) === matchedItem?.id);
        const remaining = line ? Math.max(0, line.quantity - line.returnedQuantity) : 0;
        return <button className="button secondary" type="button" key={sale.id} onClick={() => onSelectSale(sale)}>
          <span>{sale.receiptNumber} · {sale.saleDate}</span><small>{remaining} returnable · {sale.customerName || 'Walk-in customer'}</small>
        </button>;
      })}
    </div>}
    {searched && <div className="button-row"><button className="button ghost small" type="button" onClick={clear}>Clear lookup</button></div>}
  </section>;
}
