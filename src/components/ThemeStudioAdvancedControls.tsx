import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  defaultThemeStudioV2,
  loadThemeStudioV2,
  normalizeThemeAccent,
  saveThemeStudioV2,
  type ThemeStudioV2Settings,
} from "../services/themeStudioV2";

export function ThemeStudioAdvancedControls() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ThemeStudioV2Settings>(defaultThemeStudioV2());

  useEffect(() => {
    if (!user) return;
    setSettings(loadThemeStudioV2(user.uid));
  }, [user]);

  if (!user) return null;

  function update(patch: Partial<ThemeStudioV2Settings>) {
    const next = saveThemeStudioV2(user!.uid, { ...settings, ...patch });
    setSettings(next);
  }

  function resetAll() {
    const next = saveThemeStudioV2(user!.uid, defaultThemeStudioV2());
    setSettings(next);
  }

  function resetAccent() {
    update({ accentColor: defaultThemeStudioV2().accentColor });
  }

  function resetCards() {
    const defaults = defaultThemeStudioV2();
    update({
      cardStyle: defaults.cardStyle,
      cardRadius: defaults.cardRadius,
      shadowStrength: defaults.shadowStrength,
      cardDensity: defaults.cardDensity,
    });
  }

  function resetType() {
    update({ fontChoice: defaultThemeStudioV2().fontChoice });
  }

  return (
    <section className="theme-v2-studio panel">
      <div className="theme-v2-heading">
        <div>
          <span className="eyebrow">Theme Studio v2</span>
          <h3>Make BajetBN feel like your space</h3>
          <p>Personalise the look while financial colours and High Contrast stay protected.</p>
        </div>
        <button type="button" className="button secondary compact" onClick={resetAll}>Reset all</button>
      </div>

      <div className="theme-v2-layout">
        <div className="theme-v2-controls">
          <section className="theme-v2-control-group">
            <div className="theme-v2-control-title">
              <div><strong>Accent colour</strong><small>Choose a personal highlight colour.</small></div>
              <button type="button" className="text-button" onClick={resetAccent}>Reset</button>
            </div>
            <div className="theme-v2-accent-row">
              <input
                aria-label="Accent colour picker"
                type="color"
                value={settings.accentColor}
                onChange={(event) => update({ accentColor: event.target.value.toUpperCase() })}
              />
              <label>
                HEX
                <input
                  key={settings.accentColor}
                  defaultValue={settings.accentColor}
                  maxLength={7}
                  spellCheck={false}
                  onBlur={(event) => {
                    const value = normalizeThemeAccent(event.currentTarget.value, settings.accentColor);
                    event.currentTarget.value = value;
                    update({ accentColor: value });
                  }}
                />
              </label>
            </div>
          </section>

          <section className="theme-v2-control-group">
            <div className="theme-v2-control-title">
              <div><strong>Pattern intensity</strong><small>Keep the current pattern but make it quieter or bolder.</small></div>
              <span>{settings.patternIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.patternIntensity}
              onChange={(event) => update({ patternIntensity: Number(event.target.value) })}
            />
          </section>

          <section className="theme-v2-control-group">
            <div className="theme-v2-control-title">
              <div><strong>Card designer</strong><small>Shape the panels without changing the financial information.</small></div>
              <button type="button" className="text-button" onClick={resetCards}>Reset</button>
            </div>

            <label>
              Card style
              <select value={settings.cardStyle} onChange={(event) => update({ cardStyle: event.target.value as ThemeStudioV2Settings["cardStyle"] })}>
                <option value="solid">Solid</option>
                <option value="soft">Soft</option>
                <option value="glass">Glass</option>
                <option value="outline">Outline</option>
              </select>
            </label>

            <label>
              Corner roundness <span>{settings.cardRadius}px</span>
              <input type="range" min="6" max="32" value={settings.cardRadius} onChange={(event) => update({ cardRadius: Number(event.target.value) })} />
            </label>

            <label>
              Shadow strength <span>{settings.shadowStrength}%</span>
              <input type="range" min="0" max="100" value={settings.shadowStrength} onChange={(event) => update({ shadowStrength: Number(event.target.value) })} />
            </label>

            <label>
              Card density
              <select value={settings.cardDensity} onChange={(event) => update({ cardDensity: event.target.value as ThemeStudioV2Settings["cardDensity"] })}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="roomy">Roomy</option>
              </select>
            </label>
          </section>

          <section className="theme-v2-control-group">
            <div className="theme-v2-control-title">
              <div><strong>Typography</strong><small>Curated choices only, keeping numbers easy to read.</small></div>
              <button type="button" className="text-button" onClick={resetType}>Reset</button>
            </div>
            <label>
              Font choice
              <select value={settings.fontChoice} onChange={(event) => update({ fontChoice: event.target.value as ThemeStudioV2Settings["fontChoice"] })}>
                <option value="system">System</option>
                <option value="friendly">Friendly</option>
                <option value="editorial">Editorial</option>
                <option value="mono">Mono</option>
                <option value="humanist">Humanist</option>
                <option value="rounded">Rounded</option>
              </select>
            </label>
          </section>
        </div>

        <aside className="theme-v2-preview-shell" aria-label="Live Theme Studio preview">
          <div className="theme-v2-preview-label">Live preview</div>
          <div className="theme-v2-preview-desktop">
            <div className="theme-v2-preview-topbar"><span>BajetBN</span><small>My money space</small></div>
            <article className="theme-v2-preview-card">
              <small>Available balance</small>
              <strong>BND 1,248.50</strong>
              <span className="theme-v2-positive">+ BND 320.00 this month</span>
            </article>
            <article className="theme-v2-preview-card">
              <div><strong>Groceries</strong><small>Household Expense</small></div>
              <span className="theme-v2-negative">- BND 42.90</span>
            </article>
            <button type="button" className="button primary">Add money activity</button>
          </div>

          <div className="theme-v2-preview-phone">
            <div className="theme-v2-phone-bar"><strong>Trip Fund</strong><span>BND 860</span></div>
            <article className="theme-v2-preview-card">
              <small>Needs Attention</small>
              <strong>2 contributions due</strong>
            </article>
            <div className="theme-v2-phone-nav"><span>Spaces</span><strong>Home</strong><span>Alerts</span></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
