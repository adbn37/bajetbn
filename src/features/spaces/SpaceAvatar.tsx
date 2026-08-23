import { useEffect, useState } from 'react';
import type { Space } from '../../types/models';
import { getSpaceAvatarUrl } from '../../repositories/spaceAvatarRepository';

export function SpaceAvatar({
  space,
  size = 'normal',
}: {
  space: Space;
  size?: 'normal' | 'large';
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    setUrl('');

    if (!space.avatarPath) {
      return () => {
        active = false;
      };
    }

    void getSpaceAvatarUrl(space.avatarPath)
      .then((nextUrl) => {
        if (active) {
          setUrl(nextUrl);
        }
      })
      .catch(() => {
        if (active) {
          setUrl('');
        }
      });

    return () => {
      active = false;
    };
  }, [space.avatarPath]);

  const fallback =
    space.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      className={`space-avatar ${size === 'large' ? 'space-avatar-large' : ''} ${space.type}`}
      aria-hidden="true"
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
