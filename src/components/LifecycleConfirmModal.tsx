import { Modal } from './Modal';

export interface LifecycleConfirmState<TRecord, TAction extends string> {
  record: TRecord;
  action: TAction;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  note?: string;
}

export function LifecycleConfirmModal<TRecord, TAction extends string>({
  state,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  state: LifecycleConfirmState<TRecord, TAction>;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return <Modal title={state.title} onClose={busy ? () => undefined : onClose}>
    <div className="lifecycle-dialog-copy">
      <p>{state.description}</p>
      {state.note && <div className="notice">{state.note}</div>}
      {error && <div className="notice error">{error}</div>}
    </div>
    <div className="modal-actions">
      <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button>
      <button type="button" className={`button ${state.tone === 'danger' ? 'danger' : 'primary'}`} disabled={busy} onClick={onConfirm}>
        {busy ? 'Working…' : state.confirmLabel}
      </button>
    </div>
  </Modal>;
}
