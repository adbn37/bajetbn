import { Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ThemeChooser } from '../components/ThemeChooser';
import { usePreferences } from '../contexts/PreferencesContext';

export function AuthLayout() {
  const {
    language,
    setLanguage,
  } = usePreferences();

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-brand-row">
          <Brand />

          <div
            className="language-switch"
            aria-label="Language"
          >
            <button
              type="button"
              className={
                language === 'en'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setLanguage('en')
              }
            >
              English
            </button>

            <button
              type="button"
              className={
                language === 'ms'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setLanguage('ms')
              }
            >
              Bahasa Melayu
            </button>
          </div>
        </div>

        <ThemeChooser compact />

        <div>
          <span className="eyebrow">
            Built for Brunei
          </span>

          <h1>
            One place for the money
            behind your life.
          </h1>

          <p>
            Organise personal finances,
            households, trips, goals,
            custom projects, and SME
            activity through Spaces.
          </p>
        </div>

        <div className="auth-points">
          <span>
            Default currency: BND
          </span>

          <span>
            English &amp; Malay-ready
          </span>

          <span>
            Private by design
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  );
}
