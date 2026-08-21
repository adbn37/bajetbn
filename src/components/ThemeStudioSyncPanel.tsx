import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { listSpaces } from "../repositories/spaceRepository";
import type { Space } from "../types/models";
import {
  THEME_STUDIO_V2_EVENT,
  loadThemeStudioV2,
  normalizeThemeAccent,
  saveThemeStudioV2,
  type ThemeStudioV2Settings,
} from "../services/themeStudioV2";
import {
  deleteThemeStudioWallpaper,
  hydrateThemeStudioV2FromCloud,
  loadThemeStudioV2SpaceOverride,
  removeThemeStudioV2SpaceOverride,
  saveThemeStudioV2CloudPayload,
  saveThemeStudioV2SpaceOverride,
  uploadThemeStudioWallpaper,
} from "../services/themeStudioV2Persistence";

type SyncState = "idle" | "saving" | "synced" | "local";

export function ThemeStudioSyncPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ThemeStudioV2Settings | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    setSettings(loadThemeStudioV2(user.uid));

    void listSpaces(user.uid)
      .then((items) => {
        const active = items.filter((space) => !space.archivedAt);
        setSpaces(active);
        setSelectedSpaceId((current) => current || active[0]?.id || "");
      })
      .catch(() => setSpaces([]));

    void hydrateThemeStudioV2FromCloud(user.uid).then((result) => {
      setSettings(loadThemeStudioV2(user.uid));
      if (result.found) setSyncState("synced");
    });

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string; settings: ThemeStudioV2Settings }>).detail;
      if (!detail || detail.uid !== user.uid) return;
      setSettings(detail.settings);
      setSyncState("local");
    };

    window.addEventListener(THEME_STUDIO_V2_EVENT, handle);
    return () => window.removeEventListener(THEME_STUDIO_V2_EVENT, handle);
  }, [user]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) || null,
    [spaces, selectedSpaceId],
  );

  const spaceOverride = useMemo(() => {
    if (!user || !selectedSpaceId) return null;
    return loadThemeStudioV2SpaceOverride(user.uid, selectedSpaceId);
  }, [user, selectedSpaceId, settings, syncState]);

  if (!user || !settings) return null;

  const activeSettings = settings;

  function updateGlobal(patch: Partial<ThemeStudioV2Settings>) {
    if (!user || !settings) return;
    setSettings(saveThemeStudioV2(user.uid, { ...settings, ...patch }));
    setSyncState("local");
    setMessage("");
  }

  async function saveCloud() {
    if (!user) return;
    setSyncState("saving");
    setMessage("");

    const result = await saveThemeStudioV2CloudPayload(user.uid);

    if (result.synced) {
      setSyncState("synced");
      setMessage("Theme saved to your BajetBN account.");
    } else {
      setSyncState("local");
      setMessage("Saved on this device. Cloud sync activates with the v1.6 backend release.");
    }
  }

  async function uploadWallpaper(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    setBusy(true);
    setMessage("");

    try {
      const previous = activeSettings.wallpaperPath;
      const path = await uploadThemeStudioWallpaper(user.uid, file);
      updateGlobal({ wallpaperPath: path });

      if (previous && previous !== path) {
        try {
          await deleteThemeStudioWallpaper(user.uid, previous);
        } catch {
          // Old private wallpaper cleanup can be retried later.
        }
      }

      setMessage("Wallpaper uploaded privately. Save to your account to sync the theme across devices.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallpaper upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeWallpaper() {
    if (!user) return;
    const previous = activeSettings.wallpaperPath;
    updateGlobal({ wallpaperPath: null });

    if (previous) {
      try {
        await deleteThemeStudioWallpaper(user.uid, previous);
      } catch {
        // Visual reset is immediate even if remote file cleanup must be retried.
      }
    }

    setMessage("Wallpaper removed from this theme.");
  }

  function createSpaceOverride() {
    if (!user || !selectedSpaceId) return;
    saveThemeStudioV2SpaceOverride(user.uid, selectedSpaceId, activeSettings);
    setSyncState("local");
    setMessage("Personal Space theme created. Other members will not see your theme.");
  }

  function removeSpaceOverride() {
    if (!user || !selectedSpaceId) return;
    removeThemeStudioV2SpaceOverride(user.uid, selectedSpaceId);
    setSyncState("local");
    setMessage("This Space now uses your main BajetBN theme.");
  }

  function updateSpace(patch: Partial<ThemeStudioV2Settings>) {
    if (!user || !selectedSpaceId) return;
    const current = loadThemeStudioV2SpaceOverride(user.uid, selectedSpaceId) || activeSettings;
    saveThemeStudioV2SpaceOverride(user.uid, selectedSpaceId, { ...current, ...patch });
    setSyncState("local");
    setMessage("");
  }

  return (
    <section className="theme-v2-sync panel">
      <div className="theme-v2-heading">
        <div>
          <span className="eyebrow">Theme Studio v2</span>
          <h3>Wallpaper, sync & Space themes</h3>
          <p>Your wallpaper stays private. Space themes are personal to you and never change another member&apos;s view.</p>
        </div>
        <button type="button" className="button primary compact" disabled={syncState === "saving"} onClick={() => void saveCloud()}>
          {syncState === "saving" ? "Saving..." : "Save to my account"}
        </button>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="theme-v2-sync-grid">
        <section className="theme-v2-control-group">
          <div className="theme-v2-control-title">
            <div>
              <strong>Custom wallpaper</strong>
              <small>Image only, maximum 5 MB. Stored in your private user folder.</small>
            </div>
            {settings.wallpaperPath && <button type="button" className="text-button danger" onClick={() => void removeWallpaper()}>Remove</button>}
          </div>

          <label className="theme-v2-wallpaper-upload">
            <span>{busy ? "Uploading..." : settings.wallpaperPath ? "Replace wallpaper" : "Upload wallpaper"}</span>
            <input type="file" accept="image/*" disabled={busy} onChange={(event) => void uploadWallpaper(event)} />
          </label>

          <div className="form-grid">
            <label>
              Fit
              <select value={settings.wallpaperFit} onChange={(event) => updateGlobal({ wallpaperFit: event.target.value as ThemeStudioV2Settings["wallpaperFit"] })}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </label>

            <label>
              Position
              <select value={settings.wallpaperPosition} onChange={(event) => updateGlobal({ wallpaperPosition: event.target.value as ThemeStudioV2Settings["wallpaperPosition"] })}>
                <option value="center">Centre</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>

          <label>
            Blur <span>{settings.wallpaperBlur}px</span>
            <input type="range" min="0" max="20" value={settings.wallpaperBlur} onChange={(event) => updateGlobal({ wallpaperBlur: Number(event.target.value) })} />
          </label>

          <label>
            Dim strength <span>{settings.wallpaperDim}%</span>
            <input type="range" min="0" max="80" value={settings.wallpaperDim} onChange={(event) => updateGlobal({ wallpaperDim: Number(event.target.value) })} />
          </label>
        </section>

        <section className="theme-v2-control-group">
          <div className="theme-v2-control-title">
            <div>
              <strong>Personal Space themes</strong>
              <small>Each Space can look different for you without changing collaborators&apos; themes.</small>
            </div>
          </div>

          {spaces.length ? <>
            <label>
              Space
              <select value={selectedSpaceId} onChange={(event) => setSelectedSpaceId(event.target.value)}>
                {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
              </select>
            </label>

            {selectedSpace && !spaceOverride && <>
              <div className="theme-v2-space-summary">
                <strong>{selectedSpace.name}</strong>
                <small>Using your main BajetBN theme</small>
              </div>
              <button type="button" className="button secondary" onClick={createSpaceOverride}>Give this Space its own theme</button>
            </>}

            {selectedSpace && spaceOverride && <>
              <div className="theme-v2-space-summary active">
                <strong>{selectedSpace.name}</strong>
                <small>Personal Space theme enabled</small>
              </div>

              <label>
                Space accent HEX
                <input
                  key={spaceOverride.accentColor}
                  defaultValue={spaceOverride.accentColor}
                  maxLength={7}
                  onBlur={(event) => {
                    const value = normalizeThemeAccent(event.currentTarget.value, spaceOverride.accentColor);
                    event.currentTarget.value = value;
                    updateSpace({ accentColor: value });
                  }}
                />
              </label>

              <label>
                Pattern intensity <span>{spaceOverride.patternIntensity}%</span>
                <input type="range" min="0" max="100" value={spaceOverride.patternIntensity} onChange={(event) => updateSpace({ patternIntensity: Number(event.target.value) })} />
              </label>

              <label>
                Card style
                <select value={spaceOverride.cardStyle} onChange={(event) => updateSpace({ cardStyle: event.target.value as ThemeStudioV2Settings["cardStyle"] })}>
                  <option value="solid">Solid</option>
                  <option value="soft">Soft</option>
                  <option value="glass">Glass</option>
                  <option value="outline">Outline</option>
                </select>
              </label>

              <label>
                Typography
                <select value={spaceOverride.fontChoice} onChange={(event) => updateSpace({ fontChoice: event.target.value as ThemeStudioV2Settings["fontChoice"] })}>
                  <option value="system">System</option>
                  <option value="friendly">Friendly</option>
                  <option value="editorial">Editorial</option>
                  <option value="mono">Mono</option>
                  <option value="humanist">Humanist</option>
                  <option value="rounded">Rounded</option>
                </select>
              </label>

              <div className="theme-v2-space-actions">
                <button type="button" className="button secondary compact" onClick={createSpaceOverride}>Copy current main theme</button>
                <button type="button" className="text-button" onClick={removeSpaceOverride}>Use my main theme</button>
              </div>
            </>}
          </> : <p className="muted">Create a Space first to give it a personal theme.</p>}
        </section>
      </div>

      <small className="theme-v2-sync-status">
        {syncState === "synced"
          ? "Synced with your BajetBN account"
          : syncState === "local"
            ? "Current changes are saved on this device"
            : "Theme sync ready"}
      </small>
    </section>
  );
}
