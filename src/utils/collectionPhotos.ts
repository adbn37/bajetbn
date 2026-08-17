export interface PreparedCollectionPhoto {
  file: File;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened.')); };
    image.src = url;
  });
}

export async function prepareCollectionPhoto(file: File): Promise<PreparedCollectionPhoto> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo or image file.');
  const image = await loadImage(file);
  const maximumSide = 1600;
  const scale = Math.min(1, maximumSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo preparation is unavailable in this browser.');
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The photo could not be prepared.')), 'image/jpeg', 0.82);
  });
  if (blob.size >= 5 * 1024 * 1024) throw new Error('The prepared photo is still too large. Choose a smaller image.');
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120) || 'collection-photo';
  return { file: new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }), width, height };
}
