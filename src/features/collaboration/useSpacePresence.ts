import { useEffect } from 'react';
import {
  SPACE_PRESENCE_HEARTBEAT_MS,
  touchSpacePresence,
} from '../../repositories/spacePresenceRepository';

interface SpacePresenceHeartbeatInput {
  spaceId: string;
  uid: string;
  enabled: boolean;
}

export function useSpacePresenceHeartbeat({
  spaceId,
  uid,
  enabled,
}: SpacePresenceHeartbeatInput) {
  useEffect(() => {
    if (!enabled || !spaceId || !uid) return undefined;

    let disposed = false;

    const touch = () => {
      if (
        disposed
        || document.visibilityState !== 'visible'
      ) {
        return;
      }

      void touchSpacePresence(spaceId, uid).catch(() => {
        // Presence is optional. Collaboration still works if a heartbeat fails.
      });
    };

    touch();

    const timer = window.setInterval(
      touch,
      SPACE_PRESENCE_HEARTBEAT_MS,
    );

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') touch();
    };

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange,
    );
    window.addEventListener('focus', touch);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
      window.removeEventListener('focus', touch);
    };
  }, [enabled, spaceId, uid]);
}