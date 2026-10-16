import { useEffect, useState } from 'react';
import type { Space } from '../../types/models';
import { getSpaceAvatarUrl } from '../../repositories/spaceAvatarRepository';
import { spaceFallbackArt } from '../../services/financialVisualAssets';

/** Space cards and Space Details use the same neon-glass type artwork. */
export function SpaceAvatar({
  space,
  size = 'normal',
}: {
  space: Space;
  size?: 'normal' | 'large';
}) {
  const [custom, setCustom] = useState({ path: '', url: '' });
  const [failedUrl, setFailedUrl] = useState('');
  useEffect(() => {
    let active = true;
    if (!space.avatarPath) return () => { active = false; };
    void getSpaceAvatarUrl(space.avatarPath)
      .then((nextUrl) => { if (active) setCustom({ path: space.avatarPath || '', url: nextUrl }); })
      .catch(() => { if (active) setCustom({ path: '', url: '' }); });
    return () => { active = false; };
  }, [space.avatarPath]);
  const customEnabled = Boolean(space.avatarPath)
    && custom.path === space.avatarPath
    && Boolean(custom.url)
    && failedUrl !== custom.url;
  return (
    <span
      className={'space-avatar bajetbn-v103-space-avatar '
        + (size === 'large' ? 'space-avatar-large ' : '')
        + space.type}
      aria-hidden="true"
    >
      {customEnabled ? (
        <img
          className="bajetbn-v103-space-custom"
          src={custom.url}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(custom.url)}
        />
      ) : (
        <img
          className="bajetbn-v103-space-art"
          src={spaceFallbackArt(space.type)}
          alt=""
          loading="lazy"
        />
      )}
    </span>
  );
}
