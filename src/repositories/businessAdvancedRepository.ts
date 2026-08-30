import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { requireFirebase } from '../services/firebase';

import type {
  BusinessContact,
  BusinessContactKind,
  BusinessIndustry,
  BusinessProfile,
} from '../types/models';

export interface BusinessProfileInput {
  businessName: string;
  industry: BusinessIndustry;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  fiscalYearStartMonth: number;
  invoicePrefix: string;
}

export interface BusinessContactInput {
  kind: BusinessContactKind;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

function requireUid(): string {
  const { auth } = requireFirebase();

  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      'Your session has ended. Sign in again.',
    );
  }

  return uid;
}

function contactDisplayId(): string {
  const suffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto
          .randomUUID()
          .replace(/-/g, '')
          .slice(0, 8)
          .toUpperCase()
      : Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase();

  return 'BC-' + suffix;
}

export async function getBusinessProfile(
  spaceId: string,
): Promise<BusinessProfile | null> {
  const { db } = requireFirebase();

  const snapshot = await getDoc(
    doc(
      db,
      'businessProfiles',
      spaceId,
    ),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as BusinessProfile;
}

export async function saveBusinessProfile(
  spaceId: string,
  input: BusinessProfileInput,
): Promise<void> {
  const { db } = requireFirebase();
  const uid = requireUid();

  const ref = doc(
    db,
    'businessProfiles',
    spaceId,
  );

  const existing = await getDoc(ref);

  const shared = {
    spaceId,
    ownerId: uid,
    businessName: input.businessName.trim(),
    industry: input.industry,
    registrationNumber:
      input.registrationNumber.trim(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    fiscalYearStartMonth:
      input.fiscalYearStartMonth,
    invoicePrefix:
      input.invoicePrefix
        .trim()
        .toUpperCase(),
    updatedAt: serverTimestamp(),
  };

  if (existing.exists()) {
    await updateDoc(
      ref,
      shared,
    );

    return;
  }

  await setDoc(
    ref,
    {
      ...shared,
      taxEnabled: false,
      taxName: 'Tax',
      taxRateBps: 0,
      taxRegistrationNumber: '',
      payrollEnabled: false,
      createdAt: serverTimestamp(),
    },
  );
}

export interface BusinessTaxSettingsInput {
  taxEnabled: boolean;
  taxName: string;
  taxRateBps: number;
  taxRegistrationNumber: string;
}

export async function saveBusinessTaxSettings(
  spaceId: string,
  input: BusinessTaxSettingsInput,
): Promise<void> {
  const { db } = requireFirebase();
  const uid = requireUid();

  const ref = doc(
    db,
    'businessProfiles',
    spaceId,
  );

  const existing = await getDoc(ref);

  if (!existing.exists()) {
    throw new Error(
      'Set up the Business Profile before configuring tax.',
    );
  }

  const profile =
    existing.data() as BusinessProfile;

  if (profile.ownerId !== uid) {
    throw new Error(
      'Only the business owner can change tax settings.',
    );
  }

  const taxName =
    input.taxName.trim()
    || 'Tax';

  const taxRateBps =
    Math.max(
      0,
      Math.min(
        10000,
        Math.round(
          input.taxRateBps,
        ),
      ),
    );

  await updateDoc(
    ref,
    {
      taxEnabled:
        input.taxEnabled,
      taxName,
      taxRateBps,
      taxRegistrationNumber:
        input.taxRegistrationNumber.trim(),
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function setBusinessPayrollEnabled(
  spaceId: string,
  enabled: boolean,
): Promise<void> {
  const { db } = requireFirebase();
  const uid = requireUid();

  const ref = doc(
    db,
    'businessProfiles',
    spaceId,
  );

  const existing = await getDoc(ref);

  if (!existing.exists()) {
    throw new Error(
      'Set up the Business Profile before enabling payroll.',
    );
  }

  const profile =
    existing.data() as BusinessProfile;

  if (profile.ownerId !== uid) {
    throw new Error(
      'Only the business owner can change payroll settings.',
    );
  }

  await updateDoc(
    ref,
    {
      payrollEnabled:
        enabled,
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function listBusinessContacts(
  spaceId: string,
): Promise<BusinessContact[]> {
  const { db } = requireFirebase();

  const snapshot = await getDocs(
    query(
      collection(
        db,
        'businessContacts',
      ),
      where(
        'spaceId',
        '==',
        spaceId,
      ),
    ),
  );

  return snapshot.docs
    .map(
      (item) => ({
        id: item.id,
        ...item.data(),
      }) as BusinessContact,
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name),
    );
}

export async function createBusinessContact(
  spaceId: string,
  input: BusinessContactInput,
): Promise<string> {
  const { db } = requireFirebase();
  const uid = requireUid();

  const ref = doc(
    collection(
      db,
      'businessContacts',
    ),
  );

  await setDoc(
    ref,
    {
      displayId: contactDisplayId(),
      spaceId,
      ownerId: uid,
      kind: input.kind,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      archivedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return ref.id;
}

export async function updateBusinessContact(
  contactId: string,
  input: BusinessContactInput,
): Promise<void> {
  const { db } = requireFirebase();

  await updateDoc(
    doc(
      db,
      'businessContacts',
      contactId,
    ),
    {
      kind: input.kind,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
      updatedAt: serverTimestamp(),
    },
  );
}

export async function setBusinessContactArchived(
  contactId: string,
  archived: boolean,
): Promise<void> {
  const { db } = requireFirebase();

  await updateDoc(
    doc(
      db,
      'businessContacts',
      contactId,
    ),
    {
      archivedAt:
        archived
          ? serverTimestamp()
          : null,
      updatedAt: serverTimestamp(),
    },
  );
}
