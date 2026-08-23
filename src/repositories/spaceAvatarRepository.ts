import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '../services/firebase';

const AVATAR_SIZE = 512;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('BajetBN could not read this image.'));
    };

    image.src = url;
  });
}

export async function prepareSpaceAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image for the Space icon.');
  }

  if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 12 MB.');
  }

  const source = await loadImage(file);

  const width =
    'naturalWidth' in source
      ? source.naturalWidth
      : source.width;

  const height =
    'naturalHeight' in source
      ? source.naturalHeight
      : source.height;

  if (!width || !height) {
    throw new Error('This image has no usable size.');
  }

  const cropSize = Math.min(width, height);
  const sourceX = Math.floor((width - cropSize) / 2);
  const sourceY = Math.floor((height - cropSize) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image processing is not available on this device.');
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82);
  });

  if (!blob) {
    throw new Error('BajetBN could not prepare this image.');
  }

  if (blob.size >= 700 * 1024) {
    throw new Error('The compressed Space icon is still too large.');
  }

  return blob;
}

export async function uploadSpaceAvatar(input: {
  spaceId: string;
  file: File;
}): Promise<{ avatarPath: string }> {
  if (!navigator.onLine) {
    throw new Error('Connect to the internet before changing the Space icon.');
  }

  const { auth, functions, storage } = requireFirebase();

  if (!auth.currentUser) {
    throw new Error('Your session has ended. Sign in again.');
  }

  const avatar = await prepareSpaceAvatar(input.file);

  const avatarId = crypto.randomUUID();

  const storagePath =
    `spaces/${input.spaceId}/avatar/${avatarId}.jpg`;

  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, avatar, {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=3600',
  });

  try {
    const call = httpsCallable<
      {
        spaceId: string;
        storagePath: string;
        idempotencyKey: string;
      },
      { avatarPath: string }
    >(
      functions,
      'setSpaceAvatar',
    );

    const result = await call({
      spaceId: input.spaceId,
      storagePath,
      idempotencyKey: crypto.randomUUID(),
    });

    return result.data;
  } catch (error) {
    try {
      await deleteObject(storageRef);
    } catch {
      // Server cleanup also removes abandoned Space avatar files.
    }

    throw error;
  }
}

export async function removeSpaceAvatar(
  spaceId: string,
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Connect to the internet before removing the Space icon.');
  }

  const { functions } = requireFirebase();

  const call = httpsCallable<
    {
      spaceId: string;
      idempotencyKey: string;
    },
    { removed: boolean }
  >(
    functions,
    'removeSpaceAvatar',
  );

  await call({
    spaceId,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function getSpaceAvatarUrl(
  avatarPath: string,
): Promise<string> {
  const { storage } = requireFirebase();

  return getDownloadURL(
    ref(storage, avatarPath),
  );
}
