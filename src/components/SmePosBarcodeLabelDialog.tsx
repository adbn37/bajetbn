import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface SmePosBarcodeLabelItem {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
}

interface Props<T extends SmePosBarcodeLabelItem> {
  itemLabel: 'product' | 'listing';
  items: T[];
  shopName: string;
  onClose: () => void;
}

function BarcodeCanvas({ barcode }: { barcode: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void import('@bwip-js/browser')
      .then(({ default: bwipjs }) => {
        if (!active || !canvasRef.current) return;
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',
          text: barcode,
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: 'center',
        });
      })
      .catch(() => {
        if (active) setError('Barcode preview could not be generated.');
      });
    return () => { active = false; };
  }, [barcode]);

  return error ? <small className="stock-danger">{error}</small> : <canvas ref={canvasRef} />;
}

export function SmePosBarcodeLabelDialog<T extends SmePosBarcodeLabelItem>({
  itemLabel,
  items,
  shopName,
  onClose,
}: Props<T>) {
  const printableItems = items.filter((item): item is T & { barcode: string } => Boolean(item.barcode?.trim()));

  function printLabels() {
    document.body.classList.add('sme-pos-label-printing');
    try {
      window.print();
    } finally {
      document.body.classList.remove('sme-pos-label-printing');
    }
  }

  return <Modal title={`Print ${itemLabel} barcode labels`} onClose={onClose}>
    <div className="sme-pos-label-dialog">
      <div className="notice">{printableItems.length} label{printableItems.length === 1 ? '' : 's'} ready. Each label uses Code 128 so internal, UPC, and EAN values can share one print layout.</div>
      {printableItems.length > 0 ? <div className="sme-pos-label-sheet">
        {printableItems.map((item) => <article className="sme-pos-print-label" key={item.id}>
          <header><strong>{item.name}</strong><span>{shopName}</span></header>
          <BarcodeCanvas barcode={item.barcode} />
          <small>{item.sku || `${itemLabel} barcode`}</small>
        </article>)}
      </div> : <div className="empty-inline">No selected {itemLabel} has a saved barcode.</div>}
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>Close</button>
        <button className="button primary" type="button" disabled={!printableItems.length} onClick={printLabels}>Print labels</button>
      </div>
    </div>
  </Modal>;
}
