export interface PreparedCollectionPhoto {
  file: File;
  width: number;
  height: number;
}

interface LoadedCollectionImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

function loadImageElement(file: File): Promise<LoadedCollectionImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const image = new Image();
    reader.onerror = () => reject(new Error('The captured photo could not be read. Please try again.'));
    reader.onload = () => { image.src = String(reader.result || ''); };
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => undefined,
    });
    image.onerror = () => reject(new Error('This photo format cannot be opened by Chrome. Use a JPEG, PNG, or WebP photo.'));
    reader.readAsDataURL(file);
  });
}

async function loadImage(file: File): Promise<LoadedCollectionImage> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Some Android content providers need FileReader rather than the bitmap decoder.
    }
  }

  return loadImageElement(file);
}

export async function prepareCollectionPhoto(file: File): Promise<PreparedCollectionPhoto> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Choose a photo or image file.');
  }

  if (file.size <= 0) {
    throw new Error('The captured photo is empty. Please take it again.');
  }

  if (/image\/(?:hei[cf])|\.(?:hei[cf])$/i.test(`${file.type} ${file.name}`)) {
    throw new Error('HEIC/HEIF photos are not supported by Chrome. Change the camera format to JPEG and try again.');
  }

  const image = await loadImage(file);
  const maximumSide = 1600;
  const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  try {
    if (!context) {
      throw new Error('Photo preparation is unavailable in this browser.');
    }

    context.drawImage(image.source, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value
          ? resolve(value)
          : reject(new Error('The photo could not be prepared.')),
        'image/jpeg',
        0.82,
      );
    });

    if (blob.size >= 5 * 1024 * 1024) {
      throw new Error('The prepared photo is still too large. Choose a smaller image.');
    }

    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 120) || 'collection-photo';

    return {
      file: new File(
        [blob],
        `${baseName}.jpg`,
        { type: 'image/jpeg' },
      ),
      width,
      height,
    };
  }
  finally {
    image.release();
  }
}
