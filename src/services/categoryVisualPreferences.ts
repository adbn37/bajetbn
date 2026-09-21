const STORAGE_PREFIX = 'bajetbn:category-icon-v1:';
export const CATEGORY_VISUAL_EVENT = 'bajetbn:category-visual-changed';
function key(uid: string, categoryId: string) { return STORAGE_PREFIX + uid + ':' + categoryId; }
export function getCategoryCustomIcon(uid: string, categoryId: string): string {
  if (typeof window === 'undefined' || !uid || !categoryId) return '';
  return window.localStorage.getItem(key(uid, categoryId)) || '';
}
export function setCategoryCustomIcon(uid: string, categoryId: string, dataUrl: string): void {
  window.localStorage.setItem(key(uid, categoryId), dataUrl);
  window.dispatchEvent(new Event(CATEGORY_VISUAL_EVENT));
}
export function removeCategoryCustomIcon(uid: string, categoryId: string): void {
  window.localStorage.removeItem(key(uid, categoryId));
  window.dispatchEvent(new Event(CATEGORY_VISUAL_EVENT));
}
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('BajetBN could not read this image.')); };
    image.src = url;
  });
}
export async function prepareCategoryCustomIcon(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file for the category icon.');
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error('Choose an image smaller than 8 MB.');
  const source = await loadImage(file);
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error('This image has no usable size.');
  const crop = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 160;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is not available on this device.');
  context.drawImage(source, Math.floor((width-crop)/2), Math.floor((height-crop)/2), crop, crop, 0, 0, 160, 160);
  if ('close' in source && typeof source.close === 'function') source.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
  if (dataUrl.length > 300000) throw new Error('The prepared icon is still too large. Choose a simpler image.');
  return dataUrl;
}
