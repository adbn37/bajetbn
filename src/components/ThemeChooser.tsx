import {
  normalizeAppearance,
  themeOptions,
} from '../config/themePresets';
import { usePreferences } from '../contexts/PreferencesContext';

interface ThemeChooserProps {
  compact?: boolean;
}

export function ThemeChooser({
  compact = false,
}: ThemeChooserProps) {
  const {
    appearance,
    resolvedTheme,
    setAppearance,
    language,
  } = usePreferences();

  const selected =
    normalizeAppearance(
      appearance,
    );

  const currentOption =
    themeOptions.find(
      (item) =>
        item.value === selected,
    )
    || themeOptions[1];

  const isMalay =
    language === 'ms';

  const title =
    isMalay
      ? 'Tema'
      : 'Theme';

  const help =
    isMalay
      ? 'Pilih rupa BajetBN. Perubahan ditunjukkan serta-merta.'
      : 'Choose how BajetBN looks. Changes appear immediately.';

  const currentLabel =
    isMalay
      ? currentOption.labelMs
      : currentOption.label;

  const choices = (
    <div
      className="theme-choice-grid"
      role="radiogroup"
      aria-label={title}
    >
      {themeOptions.map(
        (option) => {
          const active =
            selected
            === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={
                active
                  ? 'theme-choice active'
                  : 'theme-choice'
              }
              data-preview-theme={
                option.value
              }
              onClick={() =>
                setAppearance(
                  option.value,
                )
              }
            >
              <span
                className="theme-choice-preview"
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>

              <span
                className="theme-choice-copy"
              >
                <strong>
                  {isMalay
                    ? option.labelMs
                    : option.label}
                </strong>

                {!compact && (
                  <small>
                    {isMalay
                      ? option.descriptionMs
                      : option.description}
                  </small>
                )}
              </span>

              {active && (
                <span
                  className="theme-choice-selected"
                  aria-hidden="true"
                >
                  {'\u2713'}
                </span>
              )}
            </button>
          );
        },
      )}
    </div>
  );

  if (compact) {
    return (
      <details className="theme-chooser theme-chooser-compact">
        <summary>
          <span>{title}</span>
          <strong>{currentLabel}</strong>
        </summary>

        <p>{help}</p>

        {choices}
      </details>
    );
  }

  return (
    <div className="theme-chooser">
      <div className="theme-chooser-heading">
        <div>
          <strong>{title}</strong>
          <small>{help}</small>
        </div>

        <span className="status-badge">
          {resolvedTheme === 'black'
            ? isMalay
              ? 'Hitam'
              : 'Black'
            : currentLabel}
        </span>
      </div>

      {choices}
    </div>
  );
}
