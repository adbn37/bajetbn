import { useEffect, useMemo, useState } from 'react';
import type { Account } from '../../types/models';
import { getAccountAvatarUrl } from '../../repositories/accountAvatarRepository';
import {
  accountBrandVisual,
  accountFallbackArt,
} from '../../services/financialVisualAssets';

/** All account cards and selectors share this provider-aware visual. */
export function AccountAvatar({
  account,
  size = 'normal',
  className = '',
}: {
  account: Account;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}) {
  const [custom, setCustom] = useState({ path: '', url: '' });
  const [failedBrandUrl, setFailedBrandUrl] = useState('');
  const [failedCustomUrl, setFailedCustomUrl] = useState('');
  const brand = useMemo(
    () => accountBrandVisual(account),
    [account.institution, account.institutionCode, account.name, account.type, account.classification],
  );

  useEffect(() => {
    let active = true;
    if (!account.avatarPath) return () => { active = false; };
    void getAccountAvatarUrl(account.avatarPath)
      .then((url) => { if (active) setCustom({ path: account.avatarPath || '', url }); })
      .catch(() => { if (active) setCustom({ path: '', url: '' }); });
    return () => { active = false; };
  }, [account.avatarPath]);

  // A stale URL from a different account must never override its own brand.
  const customEnabled = Boolean(account.avatarPath)
    && custom.path === account.avatarPath
    && Boolean(custom.url)
    && failedCustomUrl !== custom.url;
  const brandEnabled = !customEnabled && Boolean(brand) && failedBrandUrl !== brand?.src;
  const fallbackSrc = accountFallbackArt(account.type);
  const mark = brand?.fallback || '';

  return (
    <span
      className={
        'account-avatar account-symbol bajetbn-v103-account-avatar'
        + ' account-avatar-' + size
        + (brand ? ' account-institution-' + brand.key + ' account-brand-' + brand.key + '-' + brand.variant : '')
        + (className ? ' ' + className : '')
      }
      aria-hidden="true"
    >
      {customEnabled ? (
        <img
          className="bajetbn-v103-custom-logo"
          src={custom.url}
          alt=""
          loading="lazy"
          onError={() => setFailedCustomUrl(custom.url)}
        />
      ) : brandEnabled && brand ? (
        <img
          className="bajetbn-v103-brand-logo"
          src={brand.src}
          alt=""
          loading="lazy"
          onError={() => setFailedBrandUrl(brand.src)}
        />
      ) : brand ? (
        <span className="bajetbn-v103-brand-fallback">{mark}</span>
      ) : (
        <img className="bajetbn-v103-neon-art" src={fallbackSrc} alt="" loading="lazy" />
      )}
    </span>
  );
}
