import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  Commitment,
  SharedBillAssignment,
  SharedBillPayment,
  PaymentMethodCode,
  SharedBillSettlementMode,
  SpaceActivity,
  SpaceApprovalMode,
  SpaceInvitation,
  SpaceMember,
  SpaceRole,
  SmePosRole,
  UserNotification,
} from '../types/models';

export async function listSpaceCommitments(spaceId: string): Promise<Commitment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'commitments'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Commitment)
    .filter((item) => !item.archivedAt && item.status === 'active')
    .sort((a, b) => (a.nextDueDate || a.startDate).localeCompare(b.nextDueDate || b.startDate));
}

export async function listSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'spaceMembers'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SpaceMember)
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')));
}

export async function listSpaceInvitations(spaceId: string): Promise<SpaceInvitation[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'spaceInvitations'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SpaceInvitation)
    .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
}


export async function listMySpaceInvitations(email: string): Promise<SpaceInvitation[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'spaceInvitations'), where('email', '==', normalized)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SpaceInvitation)
    .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
}

export async function listSharedBillAssignments(spaceId: string): Promise<SharedBillAssignment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'sharedBillAssignments'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SharedBillAssignment)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function listSharedBillPayments(spaceId: string): Promise<SharedBillPayment[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'sharedBillPayments'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SharedBillPayment)
    .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
}

export async function listSpaceActivities(spaceId: string): Promise<SpaceActivity[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'spaceActivities'), where('spaceId', '==', spaceId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as SpaceActivity)
    .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
}

export async function listUserNotifications(uid: string): Promise<UserNotification[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(query(collection(db, 'userNotifications'), where('uid', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as UserNotification)
    .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));
}

export function subscribeUserNotifications(
  uid: string,
  onItems: (items: UserNotification[]) => void,
  onError?: (error: Error) => void,
) {
  const { db } = requireFirebase();
  return onSnapshot(
    query(collection(db, 'userNotifications'), where('uid', '==', uid)),
    (snapshot) => onItems(snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as UserNotification)
      .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0))),
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(notificationId: string) {
  const { db } = requireFirebase();
  await updateDoc(doc(db, 'userNotifications', notificationId), { readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(notificationIds: string[]) {
  const ids = Array.from(new Set(notificationIds.filter(Boolean)));
  if (!ids.length) return;
  const { db } = requireFirebase();
  const batch = writeBatch(db);
  ids.forEach((notificationId) => batch.update(doc(db, 'userNotifications', notificationId), { readAt: serverTimestamp() }));
  await batch.commit();
}

export async function updateSpaceCollaborationSettings(input: {
  spaceId: string;
  approvalMode: SpaceApprovalMode;
  headWhatsapp?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateSpaceCollaborationSettings')(input);
}

export async function createSpaceInvitation(input: {
  spaceId: string;
  email?: string | null;
  role: Exclude<SpaceRole, 'owner' | 'member'>;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
  posRole?: Exclude<SmePosRole, 'owner'> | null;
}): Promise<{ data: { invitationId: string; token: string } }> {
  const { functions } = requireFirebase();
  return httpsCallable<
    typeof input & { idempotencyKey: string },
    { invitationId: string; token: string }
  >(functions, 'createSpaceInvitation')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function revokeSpaceInvitation(invitationId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'revokeSpaceInvitation')({ invitationId, idempotencyKey: crypto.randomUUID() });
}

export async function declineSpaceInvitation(invitationId: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'declineSpaceInvitation')({ invitationId, idempotencyKey: crypto.randomUUID() });
}

export async function acceptSpaceInvitation(token: string): Promise<{ spaceId: string }> {
  const { functions } = requireFirebase();
  const result = await httpsCallable<{ token: string; idempotencyKey: string }, { spaceId: string }>(
    functions,
    'acceptSpaceInvitation',
  )({ token, idempotencyKey: crypto.randomUUID() });
  return result.data;
}

export async function updateSpaceMember(input: {
  spaceId: string;
  memberUid: string;
  role: Exclude<SpaceRole, 'owner' | 'member'>;
  canUseAccounts: boolean;
  canViewBalances: boolean;
  canViewLedger: boolean;
  status: 'active' | 'suspended';
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'updateSpaceMember')(input);
}

export async function removeSpaceMember(spaceId: string, memberUid: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'removeSpaceMember')({ spaceId, memberUid, idempotencyKey: crypto.randomUUID() });
}

export async function transferSpaceOwnership(spaceId: string, newOwnerUid: string) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'transferSpaceOwnership')({
    spaceId,
    newOwnerUid,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function createSharedBillAssignment(input: {
  spaceId: string;
  commitmentId: string;
  memberUid: string;
  assignedMinor: number;
  dueDate: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createSharedBillAssignment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function createSharedBillAssignments(input: {
  spaceId: string;
  commitmentId: string;
  assignments: Array<{ memberUid: string; assignedMinor: number }>;
  dueDate: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'createSharedBillAssignments')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function uploadSharedBillProof(input: { spaceId: string; assignmentId: string; file: File }) {
  if (!['application/pdf'].includes(input.file.type) && !input.file.type.startsWith('image/')) {
    throw new Error('Upload an image or PDF proof of payment.');
  }
  if (input.file.size >= 10 * 1024 * 1024) throw new Error('Proof of payment must be smaller than 10 MB.');
  const { storage } = requireFirebase();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `spaces/${input.spaceId}/payment-proofs/${input.assignmentId}/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, path), input.file, { contentType: input.file.type });
  return { proofPath: path, proofName: input.file.name };
}

export async function getSharedBillProofUrl(proofPath: string) {
  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, proofPath));
}

export async function submitSharedBillPayment(input: {
  assignmentId: string;
  amountMinor: number;
  settlementMode: SharedBillSettlementMode;
  accountId?: string;
  paymentMethod?: PaymentMethodCode;
  paymentMethodLabel?: string;
  paymentDate: string;
  proofPath?: string;
  proofName?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'submitSharedBillPayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reviewSharedBillPayment(input: {
  paymentId: string;
  decision: 'confirmed' | 'rejected';
  note?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reviewSharedBillPayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}

export async function reverseSharedBillPayment(input: {
  paymentId: string;
  reversalDate: string;
  reason?: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'reverseSharedBillPayment')({ ...input, idempotencyKey: crypto.randomUUID() });
}
