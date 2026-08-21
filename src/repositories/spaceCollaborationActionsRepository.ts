import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceAnnouncement,
  SpacePoll,
  SpacePollStatus,
  SpacePollVote,
} from '../types/models';

function timestampMillis(value: { toMillis?: () => number } | null | undefined) {
  return Number(value?.toMillis?.() || 0);
}

export function subscribeSpaceAnnouncements(
  spaceId: string,
  onItems: (items: SpaceAnnouncement[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    query(collection(db, 'spaceAnnouncements'), where('spaceId', '==', spaceId)),
    (snapshot) => onItems(
      snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as SpaceAnnouncement)
        .sort((a, b) => {
          const pinned = Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt));
          return pinned || timestampMillis(b.createdAt) - timestampMillis(a.createdAt);
        }),
    ),
    (error) => onError?.(error),
  );
}

export function subscribeSpacePolls(
  spaceId: string,
  onItems: (items: SpacePoll[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    query(collection(db, 'spacePolls'), where('spaceId', '==', spaceId)),
    (snapshot) => onItems(
      snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as SpacePoll)
        .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)),
    ),
    (error) => onError?.(error),
  );
}

export function subscribeSpacePollVotes(
  spaceId: string,
  onItems: (items: SpacePollVote[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    query(collection(db, 'spacePollVotes'), where('spaceId', '==', spaceId)),
    (snapshot) => onItems(
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SpacePollVote),
    ),
    (error) => onError?.(error),
  );
}

export async function createSpaceAnnouncement(input: {
  spaceId: string;
  title: string;
  body: string;
  expiresOn?: string | null;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createSpaceAnnouncement')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function setSpaceAnnouncementState(input: {
  spaceId: string;
  announcementId: string;
  action: 'pin' | 'unpin' | 'archive';
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'setSpaceAnnouncementState')(input);
}

export async function createSpacePoll(input: {
  spaceId: string;
  question: string;
  options: string[];
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createSpacePoll')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function voteSpacePoll(input: {
  spaceId: string;
  pollId: string;
  optionId: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'voteSpacePoll')(input);
}

export async function setSpacePollStatus(input: {
  spaceId: string;
  pollId: string;
  status: SpacePollStatus;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'setSpacePollStatus')(input);
}
