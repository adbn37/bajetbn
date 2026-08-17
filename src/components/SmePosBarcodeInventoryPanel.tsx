import { type FormEvent, useState } from 'react';
import { BarcodeCameraScanner } from './BarcodeCameraScanner';

export interface SmePosBarcodeItem {
  id: string;
  name: string;
  barcode?: string;
  category?: string;
  sku?: string;
  quantityOnHand: number;
  trackStock?: boolean;
}

interface Props<T extends SmePosBarcodeItem> {
  itemLabel: 'product' | 'listing';
  items: T[];
  canCreate: boolean;
  onCreate?: (barcode: string) => void;
  onOpen?: (item: T) => void;
  onReceive?: (item: T) => void;
  onStocktake?: (item: T) => void;
  onPrintLabel?: (item: T) => void;
}

function barcodeKey(value: string) {
  return value.trim().normalize('NFKC').toLowerCase();
}

export function SmePosBarcodeInventoryPanel<T extends SmePosBarcodeItem>({
  itemLabel,
  items,
  canCreate,
  onCreate,
  onOpen,
  onReceive,
  onStocktake,
  onPrintLabel,
}: Props<T>) {
  const [barcode, setBarcode] = useState('');
  const [matchedItem, setMatchedItem] = useState<T | null>(null);
  const [searchedBarcode, setSearchedBarcode] = useState('');
  const [scannerError, setScannerError] = useState('');

  function findBarcode(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const key = barcodeKey(clean);
    const match = items.find((item) => item.barcode && barcodeKey(item.barcode) === key) || null;
    setBarcode(clean);
    setSearchedBarcode(clean);
    setMatchedItem(match);
    setScannerError('');
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    findBarcode(barcode);
  }

  function beginCreate() {
    if (!onCreate || !searchedBarcode) return;
    const value = searchedBarcode;
    setMatchedItem(null);
    setSearchedBarcode('');
    onCreate(value);
  }

  return <section className="sme-pos-barcode-panel">
    <div className="sme-pos-barcode-heading">
      <div>
        <span className="eyebrow">Barcode inventory</span>
        <h4>Scan or enter a {itemLabel} barcode</h4>
        <p>Scanning searches only. Stock changes require a separate confirmation.</p>
      </div>
      <BarcodeCameraScanner
        startLabel={`Scan ${itemLabel} barcode`}
        onDetected={findBarcode}
        onError={setScannerError}
      />
    </div>

    <form className="sme-pos-barcode-entry" onSubmit={submitManual}>
      <label>
        Barcode number or code
        <input
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          maxLength={240}
          autoComplete="off"
          placeholder="Scan with a USB scanner or type the code"
        />
      </label>
      <button className="button secondary" type="submit" disabled={!barcode.trim()}>Find barcode</button>
    </form>

    {scannerError && <div className="notice error">{scannerError}</div>}

    {searchedBarcode && matchedItem && <div className="sme-pos-barcode-result found">
      <div>
        <span className="type-badge">Barcode found</span>
        <strong>{matchedItem.name}</strong>
        <small>{[matchedItem.category, matchedItem.sku, matchedItem.barcode].filter(Boolean).join(' · ')}</small>
        <p>{matchedItem.trackStock === false ? 'Service or unlimited item' : `${matchedItem.quantityOnHand} currently in stock`}</p>
        <small>No quantity was added by this scan.</small>
      </div>
      <div className="button-row">
        {onOpen && <button className="button secondary small" type="button" onClick={() => onOpen(matchedItem)}>Open {itemLabel}</button>}
        {onReceive && matchedItem.trackStock !== false && <button className="button primary small" type="button" onClick={() => onReceive(matchedItem)}>Receive stock</button>}
        {onStocktake && matchedItem.trackStock !== false && <button className="button secondary small" type="button" onClick={() => onStocktake(matchedItem)}>Count stock</button>}
        {onPrintLabel && matchedItem.barcode && <button className="button secondary small" type="button" onClick={() => onPrintLabel(matchedItem)}>Print label</button>}
        <button className="button ghost small" type="button" onClick={() => { setMatchedItem(null); setSearchedBarcode(''); }}>Clear</button>
      </div>
    </div>}

    {searchedBarcode && !matchedItem && <div className="sme-pos-barcode-result missing">
      <div>
        <span className="type-badge">Not found</span>
        <strong>{searchedBarcode}</strong>
        <p>No active {itemLabel} uses this barcode.</p>
        <small>{canCreate ? `You can create a new ${itemLabel} with this barcode prefilled.` : 'Ask an owner or manager to add this barcode.'}</small>
      </div>
      <div className="button-row">
        {canCreate && onCreate && <button className="button primary small" type="button" onClick={beginCreate}>Add new {itemLabel}</button>}
        <button className="button ghost small" type="button" onClick={() => setSearchedBarcode('')}>Clear</button>
      </div>
    </div>}
  </section>;
}
