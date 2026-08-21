import { ThemeChooser } from './ThemeChooser';
import { normalizeAppearance, themeOptions } from '../config/themePresets';
import { usePreferences } from '../contexts/PreferencesContext';

export function ThemeStudio() {
  const { appearance, resolvedTheme, language } = usePreferences();
  const selectedAppearance = normalizeAppearance(appearance);
  const selectedOption = themeOptions.find((option) => option.value === selectedAppearance) || themeOptions[0];
  const isMalay = language === 'ms';

  return <section className="theme-studio" aria-labelledby="theme-studio-title">
    <div className="theme-studio-intro">
      <div>
        <span className="eyebrow">{isMalay ? 'Ruang anda' : 'Your space'}</span>
        <h2 id="theme-studio-title">{isMalay ? 'Studio Tema' : 'Theme Studio'}</h2>
        <p className="muted">
          {isMalay
            ? 'Jadikan BajetBN lebih peribadi tanpa mengganggu kejelasan maklumat kewangan.'
            : 'Make BajetBN feel more personal without compromising financial clarity.'}
        </p>
      </div>

      <div className="theme-studio-status" aria-label={isMalay ? 'Tema aktif' : 'Active theme'}>
        <span>{isMalay ? 'Aktif' : 'Active'}</span>
        <strong>{isMalay ? selectedOption.labelMs : selectedOption.label}</strong>
      </div>
    </div>

    <div className="theme-studio-layout">
      <div className="theme-studio-chooser">
        <ThemeChooser />
      </div>

      <aside
        className="theme-studio-preview"
        data-preview-theme={selectedAppearance}
        data-resolved-theme={resolvedTheme}
        aria-label={isMalay ? 'Pratonton tema' : 'Theme preview'}
      >
        <div className="theme-studio-preview-wallpaper" aria-hidden="true" />

        <div className="theme-studio-preview-content">
          <div className="theme-studio-preview-heading">
            <span className="eyebrow">{isMalay ? 'Pratonton langsung' : 'Live preview'}</span>
            <h3>{isMalay ? selectedOption.labelMs : selectedOption.label}</h3>
            <p>{isMalay ? selectedOption.descriptionMs : selectedOption.description}</p>
          </div>

          <div className="theme-studio-preview-balance">
            <small>{isMalay ? 'Baki tersedia' : 'Available balance'}</small>
            <strong>BND 2,480.00</strong>
            <span>{isMalay ? 'Kewangan anda kekal jelas' : 'Your finances stay clear'}</span>
          </div>

          <div className="theme-studio-preview-grid">
            <article className="theme-studio-preview-card">
              <small>{isMalay ? 'Bajet' : 'Budget'}</small>
              <strong>BND 650</strong>
              <span>{isMalay ? 'Baki BND 215' : 'BND 215 left'}</span>
            </article>

            <article className="theme-studio-preview-card">
              <small>{isMalay ? 'Matlamat' : 'Goal'}</small>
              <strong>72%</strong>
              <span>{isMalay ? 'Dana perjalanan' : 'Trip fund'}</span>
            </article>
          </div>

          <div className="theme-studio-preview-activity">
            <span className="theme-studio-preview-dot" aria-hidden="true" />
            <div>
              <strong>{isMalay ? 'Barang dapur' : 'Groceries'}</strong>
              <small>{isMalay ? 'Hari ini · BIBD' : 'Today · BIBD'}</small>
            </div>
            <b>-BND 42.80</b>
          </div>
        </div>
      </aside>
    </div>

    <div className="theme-studio-principles">
      <span>{isMalay ? 'Latar lebih peribadi' : 'Personal backgrounds'}</span>
      <span>{isMalay ? 'Kad lebih ekspresif' : 'Expressive cards'}</span>
      <span>{isMalay ? 'Kontras kewangan dilindungi' : 'Financial contrast protected'}</span>
    </div>
  </section>;
}
