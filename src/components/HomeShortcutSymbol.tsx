/** BajetBN v10.4: visual-only Home shortcut artwork from the shared SVG asset pack. */
import { navigationIconSrc } from '../services/navigationIconAssets';

export function HomeShortcutSymbol({ id, fallback: _fallback }: { id: string; fallback: string }) {
  return (
    <img
      className="bajetbn-v104-navigation-art"
      src={navigationIconSrc(id)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden="true"
    />
  );
}
