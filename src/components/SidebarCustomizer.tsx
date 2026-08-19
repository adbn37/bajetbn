import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import {
  NAVIGATION_ITEMS,
  defaultPersonalisation,
  isProtectedNavigation,
  navigationIcon,
  type NavigationId,
  type NavigationItem,
  type PersonalisationSettings,
} from '../services/personalisation';

export function SidebarCustomizer({
  settings,
  onChange,
  onClose,
}: {
  settings: PersonalisationSettings;
  onChange: (next: PersonalisationSettings) => void;
  onClose: () => void;
}) {
  const [draggingId, setDraggingId] = useState<NavigationId | null>(null);
  const byId = useMemo(() => new Map(NAVIGATION_ITEMS.map((item) => [item.id, item])), []);
  const ordered = settings.navigationOrder
    .map((id) => byId.get(id))
    .filter((item): item is NavigationItem => Boolean(item));

  function updateOrder(nextOrder: NavigationId[]) {
    onChange({ ...settings, navigationOrder: nextOrder });
  }

  function move(id: NavigationId, delta: number) {
    const next = [...settings.navigationOrder];
    const index = next.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateOrder(next);
  }

  function dropOn(targetId: NavigationId) {
    if (!draggingId || draggingId === targetId) return;
    const next = [...settings.navigationOrder];
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    updateOrder(next);
    setDraggingId(null);
  }

  function toggleHidden(id: NavigationId) {
    if (isProtectedNavigation(id)) return;
    const hidden = new Set(settings.hiddenNavigation);
    const pinned = new Set(settings.pinnedNavigation);
    if (hidden.has(id)) hidden.delete(id);
    else {
      hidden.add(id);
      pinned.delete(id);
    }
    onChange({
      ...settings,
      hiddenNavigation: [...hidden],
      pinnedNavigation: [...pinned],
    });
  }

  function togglePinned(id: NavigationId) {
    const pinned = new Set(settings.pinnedNavigation);
    if (pinned.has(id)) pinned.delete(id);
    else pinned.add(id);
    onChange({ ...settings, pinnedNavigation: [...pinned] });
  }

  return (
    <Modal title="Customize menu" onClose={onClose}>
      <div className="menu-customizer">
        <div className="notice compact-notice">
          <strong>Your menu, your order</strong>
          <span>Drag on desktop or use the arrows on mobile. Overview and Spaces always stay available.</span>
        </div>
        <div className="menu-customizer-list">
          {ordered.map((item, index) => {
            const hidden = settings.hiddenNavigation.includes(item.id);
            const pinned = settings.pinnedNavigation.includes(item.id);
            return (
              <div
                className={`menu-customizer-row ${hidden ? 'is-hidden' : ''}`}
                key={item.id}
                draggable
                onDragStart={() => setDraggingId(item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropOn(item.id)}
              >
                <span className="menu-drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
                <span className="nav-icon">{navigationIcon(settings.iconPack, item.id, item.icon)}</span>
                <div className="menu-customizer-copy">
                  <strong>{item.label}</strong>
                  <small>{hidden ? 'Hidden from your sidebar' : pinned ? 'Pinned near the top' : 'Shown in your sidebar'}</small>
                </div>
                <div className="menu-customizer-actions">
                  <button type="button" className="text-button" onClick={() => move(item.id, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`}>↑</button>
                  <button type="button" className="text-button" onClick={() => move(item.id, 1)} disabled={index === ordered.length - 1} aria-label={`Move ${item.label} down`}>↓</button>
                  {!hidden && <button type="button" className="text-button" onClick={() => togglePinned(item.id)}>{pinned ? 'Unpin' : 'Pin'}</button>}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => toggleHidden(item.id)}
                    disabled={isProtectedNavigation(item.id)}
                    title={isProtectedNavigation(item.id) ? 'This essential menu item always stays visible.' : undefined}
                  >
                    {hidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const defaults = defaultPersonalisation();
              onChange({
                ...settings,
                navigationOrder: defaults.navigationOrder,
                hiddenNavigation: defaults.hiddenNavigation,
                pinnedNavigation: defaults.pinnedNavigation,
              });
            }}
          >
            Reset menu
          </button>
          <button type="button" className="button primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}
