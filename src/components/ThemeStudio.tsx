import { ThemeChooser } from './ThemeChooser';
import { ThemeStudioPersonalTouches } from './ThemeStudioPersonalTouches';
import { ThemeStudioAdvancedControls } from './ThemeStudioAdvancedControls';
import { ThemeStudioSyncPanel } from './ThemeStudioSyncPanel';
import { ThemeWallpaperAssistant } from './ThemeWallpaperAssistant';
import { PersonalStyleSettings } from './PersonalStyleSettings';
import { normalizeAppearance, themeOptions } from '../config/themePresets';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';

export function ThemeStudio() {
  const { user } = useAuth();
  const { appearance, language } = usePreferences();
  const selectedAppearance = normalizeAppearance(appearance);
  const selectedOption =
    themeOptions.find((option) => option.value === selectedAppearance)
    || themeOptions[0];
  const isMalay = language === 'ms';

  return (
    <section
      className="theme-studio theme-studio-simple"
      aria-labelledby="theme-studio-title"
    >
      <div className="theme-studio-simple-heading">
        <div>
          <span className="eyebrow">
            {isMalay ? 'Rupa aplikasi' : 'Appearance'}
          </span>

          <h2 id="theme-studio-title">
            {isMalay ? 'Tema dan latar' : 'Theme and wallpaper'}
          </h2>

          <p className="muted">
            {isMalay
              ? 'Pilih tema. Jika anda memuat naik latar, BajetBN boleh padankan warna dan kejelasan kad secara automatik.'
              : 'Choose a theme. If you upload a wallpaper, BajetBN can match its colours and card readability automatically.'}
          </p>
        </div>

        <span className="status-badge">
          {isMalay ? selectedOption.labelMs : selectedOption.label}
        </span>
      </div>

      <ThemeChooser compact />

      <ThemeWallpaperAssistant />

      <details className="theme-studio-advanced-disclosure">
        <summary>
          <span>
            <strong>
              {isMalay ? 'Penyesuaian lanjutan' : 'Advanced customisation'}
            </strong>
            <small>
              {isMalay
                ? 'Tipografi, gaya kad, corak, penyegerakan dan tema Space.'
                : 'Typography, card styles, patterns, sync and Space themes.'}
            </small>
          </span>
          <b aria-hidden="true">+</b>
        </summary>

        <div className="theme-studio-advanced-content">
          <ThemeStudioPersonalTouches />
          <PersonalStyleSettings userId={user?.uid || ''} />
          <ThemeStudioAdvancedControls />
          <ThemeStudioSyncPanel />
        </div>
      </details>

      <p className="theme-studio-simple-safety">
        <strong>Financial contrast protected.</strong>{' '}
        Positive, negative, warning and error colours keep their financial meaning.
      </p>
    </section>
  );
}
