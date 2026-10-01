import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import {
  NAVIGATION_ITEMS,
  defaultPersonalisation,
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
  const [draggingId, setDraggingId] =
    useState<NavigationId | null>(null);

  const byId = useMemo(
    () =>
      new Map(
        NAVIGATION_ITEMS.map(
          (item) => [item.id, item],
        ),
      ),
    [],
  );

  const ordered = settings.navigationOrder
    .map((id) => byId.get(id))
    .filter(
      (item): item is NavigationItem =>
        Boolean(item),
    );

  function updateOrder(
    nextOrder: NavigationId[],
  ) {
    onChange({
      ...settings,
      navigationOrder: nextOrder,
    });
  }

  function move(
    id: NavigationId,
    delta: number,
  ) {
    const next = [
      ...settings.navigationOrder,
    ];

    const index = next.indexOf(id);
    const target = index + delta;

    if (
      index < 0
      || target < 0
      || target >= next.length
    ) {
      return;
    }

    [next[index], next[target]] = [
      next[target],
      next[index],
    ];

    updateOrder(next);
  }

  function dropOn(
    targetId: NavigationId,
  ) {
    if (
      !draggingId
      || draggingId === targetId
    ) {
      return;
    }

    const next = [
      ...settings.navigationOrder,
    ];

    const from =
      next.indexOf(draggingId);

    const to =
      next.indexOf(targetId);

    if (from < 0 || to < 0) return;

    next.splice(from, 1);
    next.splice(
      to,
      0,
      draggingId,
    );

    updateOrder(next);
    setDraggingId(null);
  }

  function togglePinned(
    id: NavigationId,
  ) {
    const pinned = new Set(
      settings.pinnedNavigation,
    );

    if (pinned.has(id)) {
      pinned.delete(id);
    } else {
      pinned.add(id);
    }

    onChange({
      ...settings,
      pinnedNavigation: [
        ...pinned,
      ],
    });
  }

  return (
    <Modal
      title="Customize menu"
      onClose={onClose}
    >
      <div className="menu-customizer">
        <div className="notice compact-notice">
          <strong>
            Your menu, your order
          </strong>

          <span>
            Reorder every desktop sidebar tool and pin important items near the top. All tools remain available. Drag on desktop or use the arrows on mobile-sized layouts. Mobile bottom navigation stays unchanged.
          </span>
        </div>

        <div className="menu-customizer-list">
          {ordered.map(
            (item, index) => {
              const pinned =
                settings.pinnedNavigation.includes(
                  item.id,
                );

              return (
                <div
                  className="menu-customizer-row"
                  key={item.id}
                  draggable
                  onDragStart={() =>
                    setDraggingId(
                      item.id,
                    )
                  }
                  onDragEnd={() =>
                    setDraggingId(
                      null,
                    )
                  }
                  onDragOver={(
                    event,
                  ) =>
                    event.preventDefault()
                  }
                  onDrop={() =>
                    dropOn(
                      item.id,
                    )
                  }
                >
                  <span
                    className="menu-drag-handle"
                    title="Drag to reorder"
                    aria-hidden="true"
                  >
                    ⋮⋮
                  </span>

                  <span className="nav-icon">
                    {navigationIcon(
                      settings.iconPack,
                      item.id,
                      item.icon,
                    )}
                  </span>

                  <div className="menu-customizer-copy">
                    <strong>
                      {item.label}
                    </strong>

                    <small>
                      {pinned
                        ? 'Pinned near the top'
                        : 'Shown in your desktop sidebar'}
                    </small>
                  </div>

                  <div className="menu-customizer-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        move(
                          item.id,
                          -1,
                        )
                      }
                      disabled={
                        index === 0
                      }
                      aria-label={
                        `Move ${item.label} up`
                      }
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        move(
                          item.id,
                          1,
                        )
                      }
                      disabled={
                        index
                        === ordered.length - 1
                      }
                      aria-label={
                        `Move ${item.label} down`
                      }
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        togglePinned(
                          item.id,
                        )
                      }
                    >
                      {pinned
                        ? 'Unpin'
                        : 'Pin'}
                    </button>
                  </div>
                </div>
              );
            },
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const defaults =
                defaultPersonalisation();

              onChange({
                ...settings,
                navigationOrder:
                  defaults.navigationOrder,
                hiddenNavigation: [],
                pinnedNavigation:
                  defaults.pinnedNavigation,
              });
            }}
          >
            Reset menu
          </button>

          <button
            type="button"
            className="button primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
