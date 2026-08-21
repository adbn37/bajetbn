import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type { SpaceMessage } from '../types/models';

export interface SendSpaceMessageInput {
  spaceId: string;
  senderUid: string;
  body: string;
}

function messageMilliseconds(message: SpaceMessage) {
  return Number(message.createdAt?.toMillis?.() || 0);
}

export function subscribeSpaceMessages(
  spaceId: string,
  onItems: (items: SpaceMessage[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();

  return onSnapshot(
    query(
      collection(db, 'spaceMessages'),
      where('spaceId', '==', spaceId),
    ),
    (snapshot) => {
      const items = snapshot.docs
        .map(
          (item) =>
            ({
              id: item.id,
              ...item.data(),
            }) as SpaceMessage,
        )
        .sort(
          (a, b) =>
            messageMilliseconds(a)
            - messageMilliseconds(b),
        )
        .slice(-150);

      onItems(items);
    },
    (error) => onError?.(error),
  );
}

export async function sendSpaceMessage(
  input: SendSpaceMessageInput,
) {
  const body = input.body.trim();

  if (!input.spaceId.trim()) {
    throw new Error('Space is required.');
  }

  if (!input.senderUid.trim()) {
    throw new Error('Sign in again before sending.');
  }

  if (!body) {
    throw new Error('Write a message first.');
  }

  if (body.length > 2000) {
    throw new Error('Messages can be up to 2,000 characters.');
  }

  const { db } = requireFirebase();

  await addDoc(
    collection(db, 'spaceMessages'),
    {
      spaceId: input.spaceId,
      senderUid: input.senderUid,
      body,
      createdAt: serverTimestamp(),
    },
  );
}
