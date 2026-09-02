import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  THEME_STUDIO_V2_EVENT,
  loadThemeStudioV2,
  saveThemeStudioV2,
  type ThemeStudioV2Settings,
} from '../services/themeStudioV2';
import {
  deleteThemeStudioWallpaper,
  uploadThemeStudioWallpaper,
} from '../services/themeStudioV2Persistence';
import { getErrorMessage } from '../utils/errors';

interface WallpaperAnalysis {
  palette: string[];
  accent: string;
  brightness: number;
  busyness: number;
  cardOpacity: number;
  blur: number;
  dim: number;
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();
}

function colourDistance(a: number[], b: number[]) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2)
    + Math.pow(a[1] - b[1], 2)
    + Math.pow(a[2] - b[2], 2),
  );
}

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === 'string' && result.startsWith('data:')) {
        resolve(result);
        return;
      }

      reject(new Error('BajetBN could not prepare this wallpaper image.'));
    };

    reader.onerror = () => {
      reject(new Error('BajetBN could not read this wallpaper file.'));
    };

    reader.readAsDataURL(file);
  });
}

async function decodeWallpaperSource(
  file: File,
): Promise<{
  source: CanvasImageSource;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);

      return {
        source: bitmap,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to the data URL decoder for browser compatibility.
    }
  }

  const dataUrl = await fileAsDataUrl(file);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => {
      reject(new Error('BajetBN could not decode this wallpaper image.'));
    };
    image.src = dataUrl;
  });

  return {
    source: image,
    cleanup: () => undefined,
  };
}

async function analyseWallpaper(
  file: File,
): Promise<WallpaperAnalysis> {
  const decoded = await decodeWallpaperSource(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;

    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error('This browser cannot analyse the wallpaper.');
    }

    context.drawImage(
      decoded.source,
      0,
      0,
      48,
      48,
    );

    const pixels = context.getImageData(
      0,
      0,
      48,
      48,
    ).data;

    const buckets = new Map<
      string,
      {
        count: number;
        r: number;
        g: number;
        b: number;
        saturation: number;
        luminance: number;
      }
    >();

    let sampleCount = 0;
    let luminanceSum = 0;
    let luminanceSquaredSum = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];

      if (alpha < 160) {
        continue;
      }

      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      const saturation = maximum - minimum;
      const luminance =
        0.2126 * r
        + 0.7152 * g
        + 0.0722 * b;

      sampleCount += 1;
      luminanceSum += luminance;
      luminanceSquaredSum += luminance * luminance;

      const quantize = (value: number) =>
        Math.min(
          255,
          Math.max(
            0,
            Math.round(value / 32) * 32,
          ),
        );

      const qr = quantize(r);
      const qg = quantize(g);
      const qb = quantize(b);
      const key = `${qr},${qg},${qb}`;
      const existing = buckets.get(key);

      if (existing) {
        existing.count += 1;
        existing.saturation += saturation;
        existing.luminance += luminance;
      } else {
        buckets.set(key, {
          count: 1,
          r: qr,
          g: qg,
          b: qb,
          saturation,
          luminance,
        });
      }
    }

    if (sampleCount === 0) {
      throw new Error(
        'The wallpaper does not contain enough visible colour information.',
      );
    }

    const brightness = luminanceSum / sampleCount;
    const variance =
      Math.max(
        0,
        luminanceSquaredSum / sampleCount
        - brightness * brightness,
      );
    const busyness = Math.sqrt(variance);

    const ranked = [...buckets.values()]
      .map((entry) => ({
        ...entry,
        averageSaturation:
          entry.saturation / entry.count,
        averageLuminance:
          entry.luminance / entry.count,
        score:
          entry.count
          * (
            1
            + (entry.saturation / entry.count) / 150
          ),
      }))
      .sort((a, b) => b.score - a.score);

    const selected: number[][] = [];

    for (const entry of ranked) {
      const colour = [entry.r, entry.g, entry.b];

      if (
        selected.some(
          (existing) =>
            colourDistance(existing, colour) < 64,
        )
      ) {
        continue;
      }

      selected.push(colour);

      if (selected.length >= 5) {
        break;
      }
    }

    if (selected.length === 0) {
      selected.push([45, 212, 191]);
    }

    const palette = selected.map(
      ([r, g, b]) => rgbToHex(r, g, b),
    );

    const accentEntry =
      ranked.find(
        (entry) =>
          entry.averageSaturation >= 42
          && entry.averageLuminance >= 48
          && entry.averageLuminance <= 215,
      )
      || ranked[0];

    const accent = accentEntry
      ? rgbToHex(
          accentEntry.r,
          accentEntry.g,
          accentEntry.b,
        )
      : palette[0];

    const cardOpacity =
      busyness >= 58
        ? 94
        : busyness >= 42
          ? 90
          : brightness >= 170
            ? 89
            : brightness <= 78
              ? 76
              : 84;

    const blur =
      busyness >= 58
        ? 10
        : busyness >= 38
          ? 6
          : 2;

    const dim =
      brightness >= 178
        ? 52
        : brightness >= 128
          ? 40
          : brightness >= 82
            ? 28
            : 18;

    return {
      palette,
      accent,
      brightness,
      busyness,
      cardOpacity,
      blur,
      dim,
    };
  } finally {
    decoded.cleanup();
  }
}

export function ThemeWallpaperAssistant() {
  const { user } = useAuth();

  const [settings, setSettings] =
    useState<ThemeStudioV2Settings>(
      () =>
        user
          ? loadThemeStudioV2(user.uid)
          : loadThemeStudioV2(''),
    );

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    setSettings(loadThemeStudioV2(user.uid));

    const handleChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          uid: string;
          settings: ThemeStudioV2Settings;
        }>
      ).detail;

      if (!detail || detail.uid !== user.uid) {
        return;
      }

      setSettings(detail.settings);
    };

    window.addEventListener(
      THEME_STUDIO_V2_EVENT,
      handleChange,
    );

    return () =>
      window.removeEventListener(
        THEME_STUDIO_V2_EVENT,
        handleChange,
      );
  }, [user]);

  function update(
    patch: Partial<ThemeStudioV2Settings>,
  ) {
    if (!user) {
      return;
    }

    const next = saveThemeStudioV2(
      user.uid,
      {
        ...settings,
        ...patch,
      },
    );

    setSettings(next);
  }

  async function chooseWallpaper(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user || busy) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('Analysing colours on this device...');

    try {
      const analysis = await analyseWallpaper(file);

      setMessage('Uploading your wallpaper privately...');

      const previousPath = settings.wallpaperPath;
      const wallpaperPath =
        await uploadThemeStudioWallpaper(
          user.uid,
          file,
        );

      const next = saveThemeStudioV2(
        user.uid,
        {
          ...settings,
          wallpaperPath,
          wallpaperPalette: analysis.palette,
          ...(settings.wallpaperAutoMatch
            ? {
                accentColor: analysis.accent,
              }
            : {}),
          ...(settings.wallpaperAutoCards
            ? {
                cardOpacity:
                  analysis.cardOpacity,
                wallpaperBlur:
                  analysis.blur,
                wallpaperDim:
                  analysis.dim,
              }
            : {}),
        },
      );

      setSettings(next);

      if (
        previousPath
        && previousPath !== wallpaperPath
      ) {
        void deleteThemeStudioWallpaper(
          user.uid,
          previousPath,
        ).catch(() => undefined);
      }

      setMessage(
        settings.wallpaperAutoMatch
        && settings.wallpaperAutoCards
          ? 'Wallpaper applied. BajetBN matched its colours and card transparency automatically.'
          : settings.wallpaperAutoMatch
            ? 'Wallpaper applied and its colour scheme was matched automatically.'
            : settings.wallpaperAutoCards
              ? 'Wallpaper applied and card transparency was adjusted automatically.'
              : 'Wallpaper applied. Suggested colours are ready below.',
      );
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setMessage('');
    } finally {
      setBusy(false);
    }
  }

  async function removeWallpaper() {
    if (!user || busy || !settings.wallpaperPath) {
      return;
    }

    const previousPath = settings.wallpaperPath;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const next = saveThemeStudioV2(
        user.uid,
        {
          ...settings,
          wallpaperPath: null,
          wallpaperPalette: [],
        },
      );

      setSettings(next);

      await deleteThemeStudioWallpaper(
        user.uid,
        previousPath,
      ).catch(() => undefined);

      setMessage('Wallpaper removed.');
    } finally {
      setBusy(false);
    }
  }

  const transparency =
    Math.max(
      0,
      Math.min(
        40,
        100 - settings.cardOpacity,
      ),
    );

  return (
    <section
      className="theme-wallpaper-assistant"
      aria-labelledby="theme-wallpaper-title"
    >
      <div className="theme-wallpaper-heading">
        <div>
          <strong id="theme-wallpaper-title">
            Wallpaper
          </strong>
          <small>
            Upload a photo and let BajetBN make the interface readable around it.
          </small>
        </div>

        {settings.wallpaperPath && (
          <span className="status-badge">
            Active
          </span>
        )}
      </div>

      <div className="theme-wallpaper-actions">
        <label className="button secondary compact theme-wallpaper-upload">
          <span>
            {busy
              ? 'Working...'
              : settings.wallpaperPath
                ? 'Replace wallpaper'
                : 'Upload wallpaper'}
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={busy || !user}
            onChange={(event) =>
              void chooseWallpaper(event)
            }
          />
        </label>

        {settings.wallpaperPath && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() =>
              void removeWallpaper()
            }
          >
            Remove
          </button>
        )}
      </div>

      <div className="theme-wallpaper-auto-grid">
        <label className="theme-wallpaper-toggle">
          <input
            type="checkbox"
            checked={
              settings.wallpaperAutoMatch
            }
            onChange={(event) => {
              const enabled =
                event.target.checked;

              update({
                wallpaperAutoMatch: enabled,
                ...(enabled
                && settings.wallpaperPalette[0]
                  ? {
                      accentColor:
                        settings
                          .wallpaperPalette[0],
                    }
                  : {}),
              });
            }}
          />

          <span>
            <strong>
              Match colours to wallpaper
            </strong>
            <small>
              Uses a suggested accent from the image. Financial status colours do not change.
            </small>
          </span>
        </label>

        <label className="theme-wallpaper-toggle">
          <input
            type="checkbox"
            checked={
              settings.wallpaperAutoCards
            }
            onChange={(event) =>
              update({
                wallpaperAutoCards:
                  event.target.checked,
              })
            }
          />

          <span>
            <strong>
              Automatic card transparency
            </strong>
            <small>
              Busy or bright images get stronger cards; quieter images show more wallpaper.
            </small>
          </span>
        </label>
      </div>

      {settings.wallpaperPalette.length > 0 && (
        <div className="theme-wallpaper-palette">
          <div>
            <strong>Suggested colours</strong>
            <small>
              Choose one to override automatic colour matching.
            </small>
          </div>

          <div
            className="theme-wallpaper-swatches"
            aria-label="Suggested wallpaper colours"
          >
            {settings.wallpaperPalette.map(
              (colour) => (
                <button
                  key={colour}
                  type="button"
                  className={
                    settings.accentColor === colour
                      ? 'active'
                      : ''
                  }
                  style={{
                    '--wallpaper-swatch':
                      colour,
                  } as React.CSSProperties}
                  aria-label={
                    'Use ' + colour
                    + ' as accent colour'
                  }
                  title={colour}
                  onClick={() =>
                    update({
                      accentColor: colour,
                      wallpaperAutoMatch: false,
                    })
                  }
                />
              ),
            )}
          </div>
        </div>
      )}

      {settings.wallpaperPath
        && !settings.wallpaperAutoCards
        && (
          <label className="theme-wallpaper-transparency">
            <span>
              <strong>
                Card transparency
              </strong>
              <b>{transparency}%</b>
            </span>

            <input
              type="range"
              min="0"
              max="40"
              value={transparency}
              onChange={(event) =>
                update({
                  cardOpacity:
                    100
                    - Number(
                        event.target.value,
                      ),
                })
              }
            />

            <small>
              Increase only if text remains easy to read over your wallpaper.
            </small>
          </label>
        )}

      {settings.wallpaperPath
        && settings.wallpaperAutoCards
        && (
          <div className="theme-wallpaper-auto-result">
            <span>Automatic readability</span>
            <strong>
              {100 - settings.cardOpacity}% transparent cards
            </strong>
            <small>
              Blur {settings.wallpaperBlur}px - dim {settings.wallpaperDim}%
            </small>
          </div>
        )}

      {!settings.wallpaperPath
        && settings.wallpaperPalette.length === 0
        && (
          <p className="theme-wallpaper-empty">
            No wallpaper selected. BajetBN will use your chosen theme normally.
          </p>
        )}

      {message && (
        <div className="notice success compact-notice">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error compact-notice">
          {error}
        </div>
      )}

      <p className="theme-wallpaper-privacy">
        Colour matching is analysed on this device. The wallpaper itself is stored in your private BajetBN user storage so it can be used by your account.
      </p>
    </section>
  );
}
