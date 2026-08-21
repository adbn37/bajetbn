import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  PERSONALISATION_EVENT,
  applyPersonalisation,
  defaultPersonalisation,
  loadPersonalisation,
  savePersonalisation,
  type DecorationIntensity,
  type PersonalisationSettings,
  type TypographyStyle,
} from '../services/personalisation';

interface TouchOption<T> {
  value: T;
  label: string;
  labelMs: string;
  detail: string;
  detailMs: string;
}

const typographyOptions: TouchOption<TypographyStyle>[] = [
  { value: 'system', label: 'System', labelMs: 'Sistem', detail: 'Keep BajetBN familiar', detailMs: 'Kekalkan rupa biasa BajetBN' },
  { value: 'friendly', label: 'Friendly', labelMs: 'Mesra', detail: 'Softer everyday character', detailMs: 'Karakter harian lebih lembut' },
  { value: 'editorial', label: 'Editorial', labelMs: 'Editorial', detail: 'More character in headings', detailMs: 'Lebih berkarakter pada tajuk' },
  { value: 'mono', label: 'Mono', labelMs: 'Mono', detail: 'Compact technical character', detailMs: 'Karakter teknikal dan padat' },
];

const decorationOptions: TouchOption<DecorationIntensity>[] = [
  { value: 'quiet', label: 'Quiet', labelMs: 'Ringkas', detail: 'Minimal decorative detail', detailMs: 'Hiasan yang minimum' },
  { value: 'balanced', label: 'Balanced', labelMs: 'Seimbang', detail: 'Personality without distraction', detailMs: 'Personaliti tanpa gangguan' },
  { value: 'bold', label: 'Bold', labelMs: 'Menonjol', detail: 'More expressive visual treatment', detailMs: 'Gaya visual lebih ekspresif' },
];

export function ThemeStudioPersonalTouches() {
  const { user } = useAuth();
  const { language } = usePreferences();
  const [settings, setSettings] = useState<PersonalisationSettings>(() => defaultPersonalisation());
  const isMalay = language === 'ms';

  useEffect(() => {
    const next = user?.uid ? loadPersonalisation(user.uid) : defaultPersonalisation();
    setSettings(next);
    applyPersonalisation(next);
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ uid?: string; settings?: PersonalisationSettings }>).detail;
      if (!detail?.settings || detail.uid !== user?.uid) return;
      setSettings(detail.settings);
    };

    window.addEventListener(PERSONALISATION_EVENT, receive);
    return () => window.removeEventListener(PERSONALISATION_EVENT, receive);
  }, [user?.uid]);

  function saveTouch(
    patch: Partial<Pick<PersonalisationSettings, 'typographyStyle' | 'decorationIntensity'>>,
  ) {
    const current = user?.uid ? loadPersonalisation(user.uid) : settings;
    const next = { ...current, ...patch };

    if (user?.uid) {
      setSettings(savePersonalisation(user.uid, next));
      return;
    }

    applyPersonalisation(next);
    setSettings(next);
  }

  function resetTouches() {
    saveTouch({
      typographyStyle: 'system',
      decorationIntensity: 'balanced',
    });
  }

  return (
    <section className="theme-studio-personal-touches" aria-labelledby="theme-studio-personal-touches-title">
      <div className="theme-studio-touch-heading">
        <div>
          <span className="eyebrow">{isMalay ? 'Sentuhan anda' : 'Your finishing touches'}</span>
          <h3 id="theme-studio-personal-touches-title">{isMalay ? 'Sentuhan peribadi' : 'Personal touches'}</h3>
          <p className="muted">
            {isMalay
              ? 'Pilih rasa tulisan dan tahap hiasan. Data kewangan, peranan dan kebenaran tidak berubah.'
              : 'Choose the typography feel and decoration level. Financial data, roles and permissions stay unchanged.'}
          </p>
        </div>

        <button type="button" className="text-button" onClick={resetTouches}>
          {isMalay ? 'Set semula sentuhan' : 'Reset touches'}
        </button>
      </div>

      <div className="theme-studio-touch-grid">
        <fieldset className="theme-studio-touch-group">
          <legend>{isMalay ? 'Tipografi' : 'Typography'}</legend>

          <div className="theme-studio-touch-options">
            {typographyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={'theme-studio-touch-option' + (settings.typographyStyle === option.value ? ' active' : '')}
                aria-pressed={settings.typographyStyle === option.value}
                onClick={() => saveTouch({ typographyStyle: option.value })}
              >
                <strong>{isMalay ? option.labelMs : option.label}</strong>
                <small>{isMalay ? option.detailMs : option.detail}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="theme-studio-touch-group">
          <legend>{isMalay ? 'Tahap hiasan' : 'Decoration level'}</legend>

          <div className="theme-studio-touch-options theme-studio-touch-options-three">
            {decorationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={'theme-studio-touch-option' + (settings.decorationIntensity === option.value ? ' active' : '')}
                aria-pressed={settings.decorationIntensity === option.value}
                onClick={() => saveTouch({ decorationIntensity: option.value })}
              >
                <strong>{isMalay ? option.labelMs : option.label}</strong>
                <small>{isMalay ? option.detailMs : option.detail}</small>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <small className="theme-studio-touch-note">
        {isMalay
          ? 'Tema utama kekal disimpan melalui profil BajetBN. Sentuhan ini menggunakan sistem personalisasi pengguna BajetBN yang sedia ada.'
          : 'Your main theme remains profile-backed. These touches reuse BajetBN\'s existing per-user personalisation system.'}
      </small>
    </section>
  );
}
