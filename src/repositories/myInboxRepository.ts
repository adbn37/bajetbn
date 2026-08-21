import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type {
  SharedBillAssignment,
  Space,
  SpaceApproval,
  SpaceMember,
  UserNotification,
} from '../types/models';

export type MyInboxKind =
  | 'approval_review'
  | 'approval_request'
  | 'shared_bill'
  | 'mention'
  | 'reminder'
  | 'task'
  | 'contribution';

export type MyInboxState = 'needs_action' | 'due_soon' | 'open' | 'waiting';

export interface MyInboxItem {
  id: string;
  sourceId: string;
  kind: MyInboxKind;
  state: MyInboxState;
  title: string;
  detail: string;
  spaceId: string | null;
  spaceName: string;
  targetPath: string;
  amountMinor?: number | null;
  currency?: string | null;
  dueDate?: string | null;
  automationRule?: string | null;
  dismissible: boolean;
  sortTime: number;
}

const ACTION_NOTIFICATION_TYPES = new Set([
  'space_mention',
  'record_mention',
  'space_reminder',
  'assignment_reminder',
  'task_assignment',
  'contribution_request',
]);

function timestampMillis(value: { toMillis?: () => number } | null | undefined): number {
  return Number(value?.toMillis?.() || 0);
}

function dateMillis(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value + 'T00:00:00');
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function dueState(dueDate?: string | null): MyInboxState {
  if (!dueDate) return 'open';
  const today = localDateKey();
  if (dueDate <= today) return 'needs_action';

  const todayMs = dateMillis(today);
  const dueMs = dateMillis(dueDate);
  const days = todayMs && dueMs ? Math.ceil((dueMs - todayMs) / 86400000) : 999;
  return days <= 7 ? 'due_soon' : 'open';
}

function billOutstanding(item: SharedBillAssignment): number {
  if (typeof item.outstandingMinor === 'number') return Math.max(0, item.outstandingMinor);
  return Math.max(0, Number(item.assignedMinor || 0) - Number(item.settledMinor || 0));
}

function notificationKind(item: UserNotification): MyInboxKind {
  if (item.type === 'space_mention' || item.type === 'record_mention') return 'mention';
  if (item.type === 'task_assignment') return 'task';
  if (item.type === 'contribution_request') return 'contribution';
  return 'reminder';
}

function automationRule(item: UserNotification): string {
  if (item.type !== 'space_reminder' || typeof item.reminderKey !== 'string') return '';
  const parts = item.reminderKey.split('|');
  return parts[1] === 'space_automation' ? parts[3] || '' : '';
}

function priority(item: MyInboxItem): number {
  if (item.kind === 'shared_bill' && item.state === 'needs_action') return 0;
  if (item.kind === 'approval_review') return 1;
  if (item.state === 'due_soon') return 2;
  if (item.kind === 'reminder' && item.automationRule) return 3;
  if (item.kind === 'shared_bill') return 4;
  if (item.kind === 'mention' || item.kind === 'task' || item.kind === 'contribution' || item.kind === 'reminder') return 5;
  if (item.kind === 'approval_request') return 6;
  return 7;
}

function buildItems(input: {
  uid: string;
  memberships: Map<string, SpaceMember>;
  spaces: Map<string, Space>;
  approvals: Map<string, SpaceApproval[]>;
  bills: Map<string, SharedBillAssignment[]>;
  notifications: UserNotification[];
}): MyInboxItem[] {
  const result: MyInboxItem[] = [];
  const assignedBillKeys = new Set<string>();

  for (const [spaceId, membership] of input.memberships.entries()) {
    const space = input.spaces.get(spaceId);
    if (!space || space.archivedAt) continue;

    const canReview = membership.role === 'owner' || membership.role === 'admin';

    for (const approval of input.approvals.get(spaceId) || []) {
      if (approval.status !== 'pending') continue;

      const own = approval.requestedBy === input.uid;
      if (!own && !canReview) continue;

      result.push({
        id: 'approval:' + approval.id,
        sourceId: approval.id,
        kind: own ? 'approval_request' : 'approval_review',
        state: own ? 'waiting' : 'needs_action',
        title: approval.title || 'Approval request',
        detail: own
          ? 'Waiting for a Space owner or manager to decide.'
          : (approval.requestedByName || 'Space member') + ' needs a decision.',
        spaceId,
        spaceName: space.name,
        targetPath: approval.targetPath || ('/spaces/' + spaceId + '?tab=approvals'),
        amountMinor: approval.amountMinor ?? null,
        currency: approval.currency || space.currency || null,
        dueDate: null,
        dismissible: false,
        sortTime: timestampMillis(approval.requestedAt || approval.createdAt),
      });
    }

    for (const assignment of input.bills.get(spaceId) || []) {
      if (assignment.memberUid !== input.uid) continue;
      assignedBillKeys.add(spaceId + ':' + assignment.id);

      const outstandingMinor = billOutstanding(assignment);
      if (outstandingMinor <= 0) continue;
      if (assignment.status === 'paid' || assignment.status === 'confirmed') continue;

      const state = dueState(assignment.dueDate);

      result.push({
        id: 'shared_bill:' + assignment.id,
        sourceId: assignment.id,
        kind: 'shared_bill',
        state,
        title: assignment.commitmentName || 'Shared bill',
        detail: state === 'needs_action'
          ? 'Your assigned payment is due or overdue.'
          : state === 'due_soon'
            ? 'Your assigned payment is coming up soon.'
            : 'You still have an assigned amount to settle.',
        spaceId,
        spaceName: space.name,
        targetPath: '/spaces/' + spaceId + '?tab=bills',
        amountMinor: outstandingMinor,
        currency: assignment.currency || space.currency || null,
        dueDate: assignment.dueDate || null,
        dismissible: false,
        sortTime: dateMillis(assignment.dueDate) || timestampMillis(assignment.createdAt),
      });
    }
  }

  for (const notification of input.notifications) {
    if (!ACTION_NOTIFICATION_TYPES.has(notification.type)) continue;

    const spaceId = notification.spaceId || null;
    const space = spaceId ? input.spaces.get(spaceId) : null;
    if (space?.archivedAt) continue;

    const rule = automationRule(notification);

    if (
      rule === 'overdue_bill'
      && spaceId
      && notification.itemId
      && assignedBillKeys.has(spaceId + ':' + notification.itemId)
    ) {
      continue;
    }

    result.push({
      id: 'notification:' + notification.id,
      sourceId: notification.id,
      kind: notificationKind(notification),
      state: dueState(notification.dueDate),
      title: notification.title || 'Action for you',
      detail: notification.message || 'Open the related item to continue.',
      spaceId,
      spaceName: space?.name || 'BajetBN',
      targetPath: notification.targetPath || (spaceId ? '/spaces/' + spaceId : '/notifications'),
      amountMinor: null,
      currency: space?.currency || null,
      dueDate: notification.dueDate || null,
      automationRule: rule || null,
      dismissible: true,
      sortTime: dateMillis(notification.dueDate) || timestampMillis(notification.createdAt),
    });
  }

  return result.sort((a, b) => {
    const priorityDifference = priority(a) - priority(b);
    if (priorityDifference !== 0) return priorityDifference;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    return b.sortTime - a.sortTime;
  });
}

export function subscribeMyInbox(
  uid: string,
  onItems: (items: MyInboxItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const { db } = requireFirebase();

  let stopped = false;
  let memberships = new Map<string, SpaceMember>();
  const spaces = new Map<string, Space>();
  const approvals = new Map<string, SpaceApproval[]>();
  const bills = new Map<string, SharedBillAssignment[]>();
  let notifications: UserNotification[] = [];
  const spaceStops = new Map<string, Unsubscribe[]>();

  const reportError = (error: Error) => {
    if (!stopped) onError?.(error);
  };

  const emit = () => {
    if (stopped) return;
    onItems(buildItems({ uid, memberships, spaces, approvals, bills, notifications }));
  };

  const stopSpace = (spaceId: string) => {
    for (const stop of spaceStops.get(spaceId) || []) stop();
    spaceStops.delete(spaceId);
    spaces.delete(spaceId);
    approvals.delete(spaceId);
    bills.delete(spaceId);
  };

  const startSpace = (spaceId: string) => {
    if (spaceStops.has(spaceId)) return;

    const stops: Unsubscribe[] = [];

    stops.push(onSnapshot(
      doc(db, 'spaces', spaceId),
      (snapshot) => {
        if (snapshot.exists()) {
          spaces.set(spaceId, { id: snapshot.id, ...snapshot.data() } as Space);
        } else {
          spaces.delete(spaceId);
        }
        emit();
      },
      reportError,
    ));

    stops.push(onSnapshot(
      query(collection(db, 'spaceApprovals'), where('spaceId', '==', spaceId)),
      (snapshot) => {
        approvals.set(
          spaceId,
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SpaceApproval),
        );
        emit();
      },
      reportError,
    ));

    stops.push(onSnapshot(
      query(collection(db, 'sharedBillAssignments'), where('spaceId', '==', spaceId)),
      (snapshot) => {
        bills.set(
          spaceId,
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SharedBillAssignment),
        );
        emit();
      },
      reportError,
    ));

    spaceStops.set(spaceId, stops);
  };

  const membershipStop = onSnapshot(
    query(collection(db, 'spaceMembers'), where('uid', '==', uid)),
    (snapshot) => {
      const next = new Map<string, SpaceMember>();

      for (const item of snapshot.docs) {
        const member = { id: item.id, ...item.data() } as SpaceMember;
        if ((member.status || 'active') !== 'active' || !member.spaceId) continue;
        next.set(member.spaceId, member);
      }

      for (const existingSpaceId of memberships.keys()) {
        if (!next.has(existingSpaceId)) stopSpace(existingSpaceId);
      }

      memberships = next;

      for (const spaceId of memberships.keys()) startSpace(spaceId);
      emit();
    },
    reportError,
  );

  const notificationStop = onSnapshot(
    query(collection(db, 'userNotifications'), where('uid', '==', uid)),
    (snapshot) => {
      notifications = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as UserNotification)
        .filter((item) => ACTION_NOTIFICATION_TYPES.has(item.type));
      emit();
    },
    reportError,
  );

  return () => {
    stopped = true;
    membershipStop();
    notificationStop();
    for (const stops of spaceStops.values()) {
      for (const stop of stops) stop();
    }
    spaceStops.clear();
  };
}
