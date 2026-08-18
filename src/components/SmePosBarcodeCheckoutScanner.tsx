import { type KeyboardEvent, useRef, useState } from 'react';
import { BarcodeCameraScanner } from './BarcodeCameraScanner';
import type { SmePosBarcodeItem } from './SmePosBarcodeInventoryPanel';

type ScanStatus = 'added' | 'ignored' | 'missing' | 'unavailable';

interface ScanResult {
  status: ScanStatus;
  message: string;
}

interface Props<T extends SmePosBarcodeItem> {
  itemLabel: 'product' | 'listing';
  items: T[];
  cartQuantities: Record<string, number>;
  disabled?: boolean;
  onAdd: (item: T) => void;
}

const rapidRepeatWindowMs = 1200;

function barcodeKey(value: string) {
  return value.trim().normalize('NFKC').toLowerCase();
}

export function SmePosBarcodeCheckoutScanner<T extends SmePosBarcodeItem>({
  itemLabel,
  items,
  cartQuantities,
  disabled = false,
  onAdd,
}: Props<T>) {
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannerError, setScannerError] = useState('');
  const lastAcceptedRef = useRef({ key: '', at: 0 });


  function scanToCart(value: string) {
    const clean = value.trim();
    if (!clean || disabled) return;
    const key = barcodeKey(clean);
    const match = items.find((item) => item.barcode && barcodeKey(item.barcode) === key) || null;
    const now = Date.now();

    setBarcode('');
    setScannerError('');

    if (!match) {
      setResult({ status: 'missing', message: `Barcode ${clean} was not found. No item was added.` });
      return;
    }

    if (lastAcceptedRef.current.key === key && now - lastAcceptedRef.current.at < rapidRepeatWindowMs) {
      setResult({ status: 'ignored', message: `Rapid duplicate scan ignored for ${match.name}. No item was added.` });
      return;
    }

    const currentQuantity = cartQuantities[match.id] || 0;
    const cartLimit = match.trackStock === false ? 9999 : match.quantityOnHand;
    if (cartLimit < 1) {
      setResult({ status: 'unavailable', message: `${match.name} is out of stock. No item was added.` });
      return;
    }
    if (currentQuantity >= cartLimit) {
      setResult({ status: 'unavailable', message: `${match.name} already reached its available cart quantity. No item was added.` });
      return;
    }

    lastAcceptedRef.current = { key, at: now };
    onAdd(match);
    setResult({ status: 'added', message: `${match.name} added to cart. Cart quantity: ${currentQuantity + 1}.` });
  }

  function handleBarcodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    scanToCart(barcode);
  }

  return <section className="sme-pos-checkout-scanner">
    <div className="sme-pos-checkout-scanner-heading">
      <div>
        <span className="eyebrow">Scan to cart</span>
        <h4>Add a {itemLabel} by barcode</h4>
        <p>Each accepted scan adds one unit. Stock changes only when the sale is completed.</p>
      </div>
      <BarcodeCameraScanner
        startLabel={`Scan ${itemLabel} to cart`}
        disabled={disabled}
        onDetected={scanToCart}
        onError={setScannerError}
      />
    </div>

    <div className="sme-pos-checkout-scanner-entry">
      <label>
        Barcode number or code
        <input
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          maxLength={240}
          autoComplete="off"
          placeholder="Scan with a USB scanner or type the code"
          disabled={disabled}
          onKeyDown={handleBarcodeKeyDown}
        />
      </label>
      <button className="button primary" type="button" disabled={disabled || !barcode.trim()} onClick={() => scanToCart(barcode)}>Add to cart</button>
    </div>

    {scannerError && <div className="notice error">{scannerError}</div>}
    {result && <div className={`notice sme-pos-checkout-scan-result ${result.status === 'added' ? 'success' : result.status === 'ignored' ? 'warning' : 'error'}`}>
      <span>{result.message}</span>
      <button className="button ghost small" type="button" onClick={() => setResult(null)}>Clear</button>
    </div>}
  </section>;
}
