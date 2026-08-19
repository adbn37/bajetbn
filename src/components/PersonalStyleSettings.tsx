import { useEffect, useState } from 'react';
import {
  applyPersonalisation,
  defaultPersonalisation,
  loadPersonalisation,
  savePersonalisation,
  type IconPack,
  type PersonalisationSettings,
  type SurfaceStyle,
  type WallpaperStyle,
} from '../services/personalisation';

export function PersonalStyleSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<PersonalisationSettings>(defaultPersonalisation());

  useEffect(() => {
    if (!userId) return;
    const next = loadPersonalisation(userId);
    setSettings(next);
    applyPersonalisation(next);
  }, [userId]);

  function update(patch: Partial<PersonalisationSettings>) {
    if (!userId) return;
    const next = savePersonalisation(userId, { ...settings, ...patch });
    setSettings(next);
  }

  return (
    <section className="panel settings-section personal-style-settings">
      <div className="settings-section-heading">
        <div>
          <h2>Personal style</h2>
          <p>Friendster-inspired freedom, with safe controls that cannot break BajetBN.</p>
        </div>
        <span className="type-badge">My Theme</span>
      </div>
      <div className="form-grid">
        <label>Icon style
          <select value={settings.iconPack} onChange={(event) => update({ iconPack: event.target.value as IconPack })}>
            <option value="classic">Classic</option>
            <option value="rounded">Rounded</option>
            <option value="minimal">Minimal</option>
            <option value="retro">Retro</option>
          </select>
          <small>Changes menu and shortcut icon styling.</small>
        </label>
        <label>Cards
          <select value={settings.surfaceStyle} onChange={(event) => update({ surfaceStyle: event.target.value as SurfaceStyle })}>
            <option value="solid">Solid</option>
            <option value="soft">Soft</option>
            <option value="glass">Glass</option>
          </select>
          <small>Choose how panels and cards feel.</small>
        </label>
        <label className="span-2">Background pattern
          <select value={settings.wallpaperStyle} onChange={(event) => update({ wallpaperStyle: event.target.value as WallpaperStyle })}>
            <option value="none">None — use theme background</option>
            <option value="dots">Dots</option>
            <option value="grid">Grid</option>
            <option value="waves">Waves</option>
            <option value="stars">Stars</option>
          </select>
          <small>Works together with your existing BajetBN colour theme. No raw CSS or unsafe profile code is used.</small>
        </label>
      </div>
      <div className="personal-style-preview" aria-label="Personal style preview">
        <span className="nav-icon">★</span>
        <div><strong>Your BajetBN, your style</strong><small>These choices save automatically for this account on this device.</small></div>
      </div>
    </section>
  );
}
