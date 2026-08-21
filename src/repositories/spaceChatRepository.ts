import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { requireFirebase } from '../services/firebase';
import type {
  SpaceChatRecordRef,
  SpaceMessage,
} from '../types/models';

export interface SpaceChatAttachmentInput {
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface SendSpaceMessageInput {
  spaceId: string;
  body: string;
  mentionUids?: string[];
  recordRef?: SpaceChatRecordRef | null;
  replyToMessageId?: string | null;
  attachment?: SpaceChatAttachmentInput | null;
}

function messageMilliseconds(message: SpaceMessage) {
  return Number(message.createdAt?.toMillis?.() || 0);
}

function idempotencyKey() {
  return crypto.randomUUID();
}

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

  return cleaned || 'attachment';
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

export async function uploadSpaceChatAttachment(input: {
  spaceId: string;
  uid: string;
  file: File;
}): Promise<SpaceChatAttachmentInput> {
  if (!input.spaceId.trim() || !input.uid.trim()) {
    throw new Error('Space and member are required for attachments.');
  }

  if (
    !input.file.type.startsWith('image/')
    && input.file.type !== 'application/pdf'
  ) {
    throw new Error('Attach an image or PDF.');
  }

  if (input.file.size <= 0 || input.file.size >= 10 * 1024 * 1024) {
    throw new Error('Attachments must be smaller than 10 MB.');
  }

  const { storage } = requireFirebase();
  const attachmentId = crypto.randomUUID();
  const fileName = safeFileName(input.file.name);
  const storagePath =
    'spaces/'
    + input.spaceId
    + '/chat-attachments/'
    + input.uid
    + '/'
    + attachmentId
    + '/'
    + fileName;

  await uploadBytes(
    ref(storage, storagePath),
    input.file,
    { contentType: input.file.type },
  );

  return {
    storagePath,
    fileName,
    contentType: input.file.type,
    sizeBytes: input.file.size,
  };
}

export async function removeSpaceChatAttachment(storagePath: string) {
  const { storage } = requireFirebase();

  try {
    await deleteObject(ref(storage, storagePath));
  }
  catch {
    // Best-effort cleanup only. Failed uploads remain protected by Storage rules.
  }
}

export async function getSpaceChatAttachmentUrl(storagePath: string) {
  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, storagePath));
}

export async function sendSpaceMessage(
  input: SendSpaceMessageInput,
) {
  const body = input.body.trim();

  if (!input.spaceId.trim()) {
    throw new Error('Space is required.');
  }

  if (
    !body
    && !input.recordRef
    && !input.attachment
  ) {
    throw new Error('Write a message or attach a record or file first.');
  }

  if (body.length > 2000) {
    throw new Error('Messages can be up to 2,000 characters.');
  }

  const { functions } = requireFirebase();
  const call = httpsCallable<
    SendSpaceMessageInput & { idempotencyKey: string },
    { messageId: string }
  >(functions, 'sendSpaceChatMessage');

  return call({
    ...input,
    body,
    mentionUids: Array.from(new Set(input.mentionUids || [])),
    idempotencyKey: idempotencyKey(),
  });
}
