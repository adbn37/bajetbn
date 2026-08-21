import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceChatRecordRef,
  SpaceChatRecordType,
} from '../types/models';

export interface SpaceChatRecordOption extends SpaceChatRecordRef {
  searchText: string;
}

interface RecordSpec {
  collectionName: string;
  type: SpaceChatRecordType;
  include?: (row: DocumentData) => boolean;
  label: (row: DocumentData) => string;
  targetPath: (spaceId: string, id: string, row: DocumentData) => string;
}

function value(row: DocumentData, key: string, fallback = '') {
  const next = row[key];
  return typeof next === 'string' && next.trim()
    ? next.trim()
    : fallback;
}

function option(
  spec: RecordSpec,
  spaceId: string,
  id: string,
  row: DocumentData,
): SpaceChatRecordOption {
  const label = spec.label(row).trim().slice(0, 160);
  const targetPath = spec.targetPath(spaceId, id, row);

  return {
    type: spec.type,
    id,
    label,
    targetPath,
    searchText: (
      spec.type
      + ' '
      + label
      + ' '
      + value(row, 'displayId')
    ).toLowerCase(),
  };
}

const specs: RecordSpec[] = [
  {
    collectionName: 'sharedExpenses',
    type: 'expense',
    include: (row) => !row.closedAt,
    label: (row) => 'Expense - ' + value(row, 'title', value(row, 'displayId', 'Shared expense')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=expenses&expenseId=' + encodeURIComponent(id),
  },
  {
    collectionName: 'sharedBillAssignments',
    type: 'shared_bill',
    include: (row) => row.status !== 'paid' || Boolean(row.displayId),
    label: (row) => 'Shared bill - ' + value(row, 'commitmentName', value(row, 'displayId', 'Assignment')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=bills&assignmentId=' + encodeURIComponent(id),
  },
  {
    collectionName: 'commitments',
    type: 'commitment',
    include: (row) => !row.archivedAt,
    label: (row) => 'Bill - ' + value(row, 'name', value(row, 'displayId', 'Commitment')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=bills&commitmentId=' + encodeURIComponent(id),
  },
  {
    collectionName: 'tripTasks',
    type: 'trip_task',
    include: (row) => !row.archivedAt,
    label: (row) => 'Task - ' + value(row, 'title', value(row, 'displayId', 'Trip task')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=overview&taskId=' + encodeURIComponent(id) + '#trip-planning',
  },
  {
    collectionName: 'tripBookings',
    type: 'booking',
    include: (row) => !row.archivedAt,
    label: (row) => 'Booking - ' + value(row, 'title', value(row, 'displayId', 'Trip booking')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=overview&bookingId=' + encodeURIComponent(id) + '#trip-planning',
  },
  {
    collectionName: 'budgets',
    type: 'budget',
    include: (row) => !row.archivedAt,
    label: (row) => 'Budget - ' + value(row, 'name', value(row, 'displayId', 'Budget')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '?tab=overview&section=budgets&budgetId=' + encodeURIComponent(id),
  },
  {
    collectionName: 'smePosPayouts',
    type: 'payout',
    label: (row) => 'Payout - ' + value(row, 'sellerName', value(row, 'displayId', 'Seller payout')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '/pos?tab=payouts&payoutId=' + encodeURIComponent(id),
  },
  {
    collectionName: 'collectionItems',
    type: 'collection_item',
    include: (row) => !row.archivedAt,
    label: (row) => 'Collection item - ' + value(row, 'name', value(row, 'displayId', 'Item')),
    targetPath: (spaceId, id) => '/spaces/' + spaceId + '/collection/items/' + encodeURIComponent(id),
  },
  {
    collectionName: 'spaceApprovals',
    type: 'approval',
    label: (row) => 'Approval - ' + value(row, 'title', value(row, 'displayId', 'Request')),
    targetPath: (spaceId, id, row) =>
      value(row, 'targetPath')
      || ('/spaces/' + spaceId + '?tab=approvals&approvalId=' + encodeURIComponent(id)),
  },
];

async function safeRows(
  collectionName: string,
  spaceId: string,
): Promise<Array<{ id: string; data: DocumentData }>> {
  const { db } = requireFirebase();

  try {
    const snapshot = await getDocs(
      query(
        collection(db, collectionName),
        where('spaceId', '==', spaceId),
      ),
    );

    return snapshot.docs.map((item) => ({
      id: item.id,
      data: item.data(),
    }));
  }
  catch {
    // Some record types are role-restricted. Omit only the inaccessible group.
    return [];
  }
}

export function spaceChatRecordTypeLabel(type: SpaceChatRecordType) {
  const labels: Record<SpaceChatRecordType, string> = {
    expense: 'Expense',
    shared_bill: 'Shared bill',
    commitment: 'Bill',
    trip_task: 'Task',
    booking: 'Booking',
    budget: 'Budget',
    payout: 'Payout',
    collection_item: 'Collection item',
    approval: 'Approval',
  };

  return labels[type];
}

export function spaceChatDiscussionPath(
  spaceId: string,
  recordRef: Pick<SpaceChatRecordRef, 'type' | 'id'>,
) {
  return (
    '/spaces/'
    + spaceId
    + '?tab=chat&recordType='
    + encodeURIComponent(recordRef.type)
    + '&recordId='
    + encodeURIComponent(recordRef.id)
  );
}

export async function listSpaceChatRecordOptions(
  spaceId: string,
): Promise<SpaceChatRecordOption[]> {
  const groups = await Promise.all(
    specs.map(async (spec) => {
      const rows = await safeRows(spec.collectionName, spaceId);

      return rows
        .filter(({ data }) => !spec.include || spec.include(data))
        .map(({ id, data }) => option(spec, spaceId, id, data));
    }),
  );

  return groups
    .flat()
    .filter((item) => item.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 250);
}
