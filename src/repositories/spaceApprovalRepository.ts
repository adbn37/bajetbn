import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceApproval,
  SpaceApprovalStatus,
  SpaceApprovalTargetType,
} from '../types/models';

function timestampMillis(value: { toMillis?: () => number } | null | undefined) {
  return Number(value?.toMillis?.() || 0);
}

export function subscribeSpaceApprovals(
  spaceId: string,
  onItems: (items: SpaceApproval[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    query(collection(db, 'spaceApprovals'), where('spaceId', '==', spaceId)),
    (snapshot) => onItems(
      snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as SpaceApproval)
        .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)),
    ),
    (error) => onError?.(error),
  );
}

export async function requestSpaceApproval(input: {
  spaceId: string;
  title: string;
  requestNote?: string;
  targetType: SpaceApprovalTargetType;
  targetId?: string | null;
  targetPath?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'requestSpaceApproval')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function reviewSpaceApproval(input: {
  spaceId: string;
  approvalId: string;
  decision: Extract<SpaceApprovalStatus, 'approved' | 'rejected'>;
  decisionNote?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reviewSpaceApproval')(input);
}

export async function cancelSpaceApproval(input: {
  spaceId: string;
  approvalId: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'cancelSpaceApproval')(input);
}
