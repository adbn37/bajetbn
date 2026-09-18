import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type {
  Account,
} from '../../types/models';
import {
  getAccountAvatarUrl,
  removeAccountAvatar,
  uploadAccountAvatar,
} from '../../repositories/accountAvatarRepository';
import {
  getErrorMessage,
} from '../../utils/errors';
import {
  AccountAvatar,
} from './AccountAvatar';

export function AccountAvatarSettings({
  account,
  onSaved,
}: {
  account: Account;
  onSaved: () => Promise<void>;
}) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  useEffect(
    () => {
      let active = true;
      setPreviewUrl('');

      if (account.avatarPath) {
        void getAccountAvatarUrl(
          account.avatarPath,
        )
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
    },
    [account.avatarPath],
  );

  async function chooseAvatar(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result =
        await uploadAccountAvatar({
          accountId: account.id,
          file,
        });

      const url =
        await getAccountAvatarUrl(
          result.avatarPath,
        );

      setPreviewUrl(url);
      await onSaved();
      setMessage(
        'Account icon updated.',
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      await removeAccountAvatar(
        account.id,
      );

      setPreviewUrl('');
      await onSaved();
      setMessage(
        'Custom account icon removed.',
      );
    } catch (nextError) {
      setError(
        getErrorMessage(nextError),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-avatar-settings span-2">
      <div className="account-avatar-settings-copy">
        <strong>Account icon</strong>
        <small>
          Upload your own bank logo or account image.
          BajetBN will use the same icon on Accounts,
          Home and money forms.
        </small>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {message && (
        <div className="notice success">
          {message}
        </div>
      )}

      <div className="account-avatar-settings-row">
        {previewUrl ? (
          <span className="account-avatar account-avatar-large account-avatar-preview">
            <img
              src={previewUrl}
              alt=""
            />
          </span>
        ) : (
          <AccountAvatar
            account={account}
            size="large"
          />
        )}

        <div>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={
              (event) =>
                void chooseAvatar(event)
            }
          />

          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                inputRef.current?.click()
              }
            >
              {busy
                ? 'Working…'
                : account.avatarPath
                  || previewUrl
                  ? 'Replace icon'
                  : 'Upload icon'}
            </button>

            {(account.avatarPath
              || previewUrl) && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void remove()
                }
              >
                Remove
              </button>
            )}
          </div>

          <small className="muted">
            Square centre crop · 512 × 512 JPEG
          </small>
        </div>
      </div>
    </section>
  );
}
