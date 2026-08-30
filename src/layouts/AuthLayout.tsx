import {
  Outlet,
  useLocation,
} from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ThemeChooser } from '../components/ThemeChooser';
import { usePreferences } from '../contexts/PreferencesContext';

export function AuthLayout() {
  const location = useLocation();

  const {
    language,
    setLanguage,
  } = usePreferences();

  const isLogin =
    location.pathname === '/login';

  const isRegister =
    location.pathname === '/register';

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

        {isLogin && <ThemeChooser compact />}

        <div>
          <span className="eyebrow">
            Built for Brunei
          </span>

          <h1>
            Your money, your goals,
            one clear place.
          </h1>

          <p>
            Track spending, manage household and trip funds, grow your savings, and keep Business finances organised—all with BajetBN.
          </p>
        </div>

        <div className="auth-points">
          <span>Default currency: BND</span>
          <span>English &amp; Malay-ready</span>
          <span>Private by design</span>
        </div>

        <blockquote className="signup-money-reminder">
          <p>
            &ldquo;
            {language === 'ms'
              ? 'Tidak akan berganjak kaki seorang hamba pada hari kiamat sehingga dia ditanya... tentang hartanya; dari mana diperolehnya dan ke mana dibelanjakannya.'
              : 'A servant will not move on the Day of Judgement until questioned... about his wealth: how it was earned and how it was spent.'}
            &rdquo;
          </p>

          <cite>
            &mdash;{' '}
            {language === 'ms'
              ? "Riwayat Jami' al-Tirmidhi (No. 2417)"
              : "Jami' al-Tirmidhi (No. 2417)"}
          </cite>
        </blockquote>
      </section>

      <section className="auth-panel">
        {isRegister ? (
          <div className="auth-register-stack">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </section>
    </main>
  );
}