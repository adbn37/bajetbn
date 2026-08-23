import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type { Space } from '../../types/models';
import {
  getSpaceAvatarUrl,
  removeSpaceAvatar,
  uploadSpaceAvatar,
} from '../../repositories/spaceAvatarRepository';
import { getErrorMessage } from '../../utils/errors';

export function SpaceAvatarSettings({
  space,
  onSaved,
}: {
  space: Space;
  onSaved: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setPreviewUrl('');

    if (space.avatarPath) {
      void getSpaceAvatarUrl(space.avatarPath)
        .then((url) => {
          if (active) {
            setPreviewUrl(url);
          }
        })
        .catch(() => {
          if (active) {
            setPreviewUrl('');
          }
        });
    }

    return () => {
      active = false;
    };
  }, [space.avatarPath]);

  async function chooseAvatar(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await uploadSpaceAvatar({
        spaceId: space.id,
        file,
      });

      await onSaved();
      setMessage('Space icon updated.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      await removeSpaceAvatar(space.id);
      await onSaved();
      setPreviewUrl('');
      setMessage('Custom Space icon removed.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  const fallback =
    space.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <section className="panel space-settings-panel space-avatar-settings">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Personalise</span>
          <h2>Space icon</h2>
        </div>
      </div>

      <p className="muted">
        Add a photo or logo to make this Space easier to recognise.
        BajetBN automatically crops it square and compresses it for mobile.
      </p>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice success">{message}</div>}

      <div className="space-avatar-settings-row">
        <div className="space-avatar space-avatar-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="" />
          ) : (
            fallback
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(event) => void chooseAvatar(event)}
          />

          <div className="button-row">
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy
                ? 'Working…'
                : space.avatarPath
                  ? 'Replace icon'
                  : 'Add icon'}
            </button>

            {space.avatarPath && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void remove()}
              >
                Remove
              </button>
            )}
          </div>

          <small className="muted">
            Camera or photo library · square centre crop · 512 × 512 JPEG
          </small>
        </div>
      </div>
    </section>
  );
}
