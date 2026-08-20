import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';
import type {
  TripBooking,
  TripBookingType,
  TripItineraryCategory,
  TripItineraryItem,
  TripTask,
  TripTaskStatus,
} from '../types/models';

export async function listTripItineraryItems(
  spaceId: string,
): Promise<TripItineraryItem[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(
    query(collection(db, 'tripItineraryItems'), where('spaceId', '==', spaceId)),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TripItineraryItem)
    .filter((item) => !item.archivedAt)
    .sort((a, b) =>
      `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`),
    );
}

export async function listTripTasks(spaceId: string): Promise<TripTask[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(
    query(collection(db, 'tripTasks'), where('spaceId', '==', spaceId)),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TripTask)
    .filter((item) => !item.archivedAt)
    .sort((a, b) =>
      (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'),
    );
}

export async function listTripBookings(spaceId: string): Promise<TripBooking[]> {
  const { db } = requireFirebase();
  const snapshot = await getDocs(
    query(collection(db, 'tripBookings'), where('spaceId', '==', spaceId)),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TripBooking)
    .filter((item) => !item.archivedAt)
    .sort((a, b) =>
      `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`),
    );
}

export async function saveTripItineraryItem(input: {
  spaceId: string;
  itemId?: string;
  title: string;
  category: TripItineraryCategory;
  date: string;
  time?: string;
  location?: string;
  reference?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { itemId: string }
  >(functions, 'saveTripItineraryItem')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function archiveTripItineraryItem(input: {
  spaceId: string;
  itemId: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveTripItineraryItem')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function saveTripTask(input: {
  spaceId: string;
  taskId?: string;
  title: string;
  assigneeUid?: string;
  dueDate?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { taskId: string }
  >(functions, 'saveTripTask')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function setTripTaskStatus(input: {
  spaceId: string;
  taskId: string;
  status: TripTaskStatus;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'setTripTaskStatus')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function archiveTripTask(input: {
  spaceId: string;
  taskId: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveTripTask')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function saveTripBooking(input: {
  spaceId: string;
  bookingId?: string;
  title: string;
  bookingType: TripBookingType;
  provider?: string;
  reference?: string;
  date: string;
  time?: string;
  location?: string;
  amountMinor?: number;
  currency?: string;
  note?: string;
}) {
  const { functions } = requireFirebase();
  const result = await httpsCallable<
    typeof input & { idempotencyKey: string },
    { bookingId: string }
  >(functions, 'saveTripBooking')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });

  return result.data;
}

export async function archiveTripBooking(input: {
  spaceId: string;
  bookingId: string;
}) {
  const { functions } = requireFirebase();
  return httpsCallable(functions, 'archiveTripBooking')({
    ...input,
    idempotencyKey: crypto.randomUUID(),
  });
}