import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { requireFirebase } from "./firebase";
import {
  loadThemeStudioV2,
  sanitizeThemeStudioV2,
  saveThemeStudioV2,
  type ThemeStudioV2Settings,
} from "./themeStudioV2";

export const THEME_STUDIO_V2_SCOPES_EVENT = "bajetbn:theme-studio-v2-scopes";
const SCOPE_PREFIX = "bajetbn.themeStudioV2Scopes.";

export interface ThemeStudioV2CloudPayload {
  schemaVersion: 2;
  global: ThemeStudioV2Settings;
  spaces: Record<string, ThemeStudioV2Settings>;
}

function validSpaceId(value: string) {
  return /^[A-Za-z0-9_-]{1,160}$/.test(value);
}

function sanitizeSpaces(value: unknown) {
  const source = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};

  const result: Record<string, ThemeStudioV2Settings> = {};

  for (const [spaceId, settings] of Object.entries(source)) {
    if (!validSpaceId(spaceId)) continue;
    result[spaceId] = sanitizeThemeStudioV2(settings as Partial<ThemeStudioV2Settings>);
  }

  return result;
}

function loadLocalSpaces(uid: string) {
  if (!uid || typeof window === "undefined") return {} as Record<string, ThemeStudioV2Settings>;

  try {
    const raw = window.localStorage.getItem(SCOPE_PREFIX + uid);
    return sanitizeSpaces(raw ? JSON.parse(raw) : null);
  } catch {
    return {} as Record<string, ThemeStudioV2Settings>;
  }
}

function saveLocalSpaces(uid: string, spaces: Record<string, ThemeStudioV2Settings>) {
  const next = sanitizeSpaces(spaces);

  if (uid && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SCOPE_PREFIX + uid, JSON.stringify(next));
    } catch {
      // Local overrides remain optional if browser storage is unavailable.
    }

    window.dispatchEvent(new CustomEvent(THEME_STUDIO_V2_SCOPES_EVENT, {
      detail: { uid, spaces: next },
    }));
  }

  return next;
}

export function loadThemeStudioV2SpaceOverride(uid: string, spaceId: string) {
  if (!uid || !validSpaceId(spaceId)) return null;
  return loadLocalSpaces(uid)[spaceId] || null;
}

export function saveThemeStudioV2SpaceOverride(uid: string, spaceId: string, settings: ThemeStudioV2Settings) {
  if (!validSpaceId(spaceId)) throw new Error("Invalid Space ID.");
  const spaces = loadLocalSpaces(uid);
  spaces[spaceId] = sanitizeThemeStudioV2(settings);
  saveLocalSpaces(uid, spaces);
  return spaces[spaceId];
}

export function removeThemeStudioV2SpaceOverride(uid: string, spaceId: string) {
  const spaces = loadLocalSpaces(uid);
  delete spaces[spaceId];
  saveLocalSpaces(uid, spaces);
}

export function localThemeStudioV2CloudPayload(uid: string): ThemeStudioV2CloudPayload {
  return {
    schemaVersion: 2,
    global: loadThemeStudioV2(uid),
    spaces: loadLocalSpaces(uid),
  };
}

function sanitizeCloudPayload(value: unknown): ThemeStudioV2CloudPayload | null {
  if (!value || typeof value !== "object") return null;

  const source = value as {
    schemaVersion?: unknown;
    global?: unknown;
    spaces?: unknown;
  };

  if (Number(source.schemaVersion || 0) !== 2) return null;

  return {
    schemaVersion: 2,
    global: sanitizeThemeStudioV2(source.global as Partial<ThemeStudioV2Settings>),
    spaces: sanitizeSpaces(source.spaces),
  };
}

export async function loadThemeStudioV2CloudPayload(uid: string) {
  if (!uid) return null;
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return sanitizeCloudPayload(snapshot.data()?.themeStudioV2);
}

export async function hydrateThemeStudioV2FromCloud(uid: string) {
  try {
    const payload = await loadThemeStudioV2CloudPayload(uid);
    if (!payload) return { found: false, synced: true };

    saveThemeStudioV2(uid, payload.global);
    saveLocalSpaces(uid, payload.spaces);
    return { found: true, synced: true };
  } catch {
    return { found: false, synced: false };
  }
}

export async function saveThemeStudioV2CloudPayload(uid: string) {
  const payload = localThemeStudioV2CloudPayload(uid);

  try {
    const { db } = requireFirebase();
    await updateDoc(doc(db, "users", uid), {
      themeStudioV2: payload,
      updatedAt: serverTimestamp(),
    });

    return { synced: true as const };
  } catch (error) {
    return { synced: false as const, error };
  }
}

export async function uploadThemeStudioWallpaper(uid: string, file: File) {
  if (!uid) throw new Error("Sign in before uploading a wallpaper.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image for your wallpaper.");
  if (file.size <= 0 || file.size >= 5 * 1024 * 1024) throw new Error("Wallpaper must be smaller than 5 MB.");

  const { storage } = requireFirebase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = "users/" + uid + "/theme-wallpapers/" + crypto.randomUUID() + "-" + safeName;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

export async function deleteThemeStudioWallpaper(uid: string, path: string | null) {
  if (!uid || !path) return;
  const prefix = "users/" + uid + "/theme-wallpapers/";
  if (!path.startsWith(prefix)) return;

  const { storage } = requireFirebase();
  await deleteObject(ref(storage, path));
}

export async function getThemeStudioWallpaperUrl(uid: string, path: string | null) {
  if (!uid || !path) return null;
  const prefix = "users/" + uid + "/theme-wallpapers/";
  if (!path.startsWith(prefix)) return null;

  const { storage } = requireFirebase();
  return getDownloadURL(ref(storage, path));
}
