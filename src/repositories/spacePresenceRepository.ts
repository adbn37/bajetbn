import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { SpacePresence } from '../types/models';

export const SPACE_PRESENCE_HEARTBEAT_MS = 30_000;
export const SPACE_PRESENCE_TTL_MS = 90_000;
const SPACE_PRESENCE_REFRESH_MS = 2_000;
const SPACE_TYPING_TTL_MS = 8_000;

function presenceId(spaceId: string, uid: string) {
  return `${spaceId}_${uid}`;
}

function futureTimestamp(milliseconds: number) {
  return Timestamp.fromMillis(Date.now() + milliseconds);
}

function isPresenceActive(item: SpacePresence, now = Date.now()) {
  return Number(item.expiresAt?.toMillis?.() || 0) > now;
}

export function subscribeSpacePresence(
  spaceId: string,
  onItems: (items: SpacePresence[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  let latest: SpacePresence[] = [];

  const emit = () => {
    const now = Date.now();
    onItems(latest.filter((item) => isPresenceActive(item, now)));
  };

  const stopSnapshot = onSnapshot(
    query(
      collection(db, 'spacePresence'),
      where('spaceId', '==', spaceId),
    ),
    (snapshot) => {
      latest = snapshot.docs.map(
        (item) =>
          ({
            id: item.id,
            ...item.data(),
          }) as SpacePresence,
      );
      emit();
    },
    (error) => onError?.(error),
  );

  const refreshTimer = window.setInterval(
    emit,
    SPACE_PRESENCE_REFRESH_MS,
  );

  return () => {
    window.clearInterval(refreshTimer);
    stopSnapshot();
  };
}

export async function touchSpacePresence(
  spaceId: string,
  uid: string,
) {
  if (!spaceId.trim() || !uid.trim()) return;

  const { db } = requireFirebase();

  await setDoc(
    doc(db, 'spacePresence', presenceId(spaceId, uid)),
    {
      spaceId,
      uid,
      activeAt: serverTimestamp(),
      expiresAt: futureTimestamp(SPACE_PRESENCE_TTL_MS),
    },
    { merge: true },
  );
}

export async function setSpaceTyping(
  spaceId: string,
  uid: string,
  typing: boolean,
) {
  if (!spaceId.trim() || !uid.trim()) return;

  const { db } = requireFirebase();

  await setDoc(
    doc(db, 'spacePresence', presenceId(spaceId, uid)),
    {
      spaceId,
      uid,
      activeAt: serverTimestamp(),
      expiresAt: futureTimestamp(SPACE_PRESENCE_TTL_MS),
      typingUntil: typing
        ? futureTimestamp(SPACE_TYPING_TTL_MS)
        : null,
    },
    { merge: true },
  );
}