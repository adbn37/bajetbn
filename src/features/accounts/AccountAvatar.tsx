import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  Account,
  InstitutionCode,
} from '../../types/models';
import {
  getAccountAvatarUrl,
} from '../../repositories/accountAvatarRepository';

function inferredInstitutionCode(
  account: Account,
): InstitutionCode | null {
  if (account.institutionCode) {
    return account.institutionCode;
  }

  const value =
    (account.institution || '')
      .toLowerCase();

  if (value.includes('baiduri')) {
    return 'baiduri';
  }

  if (
    value.includes('bibd')
    || value.includes(
      'bank islam brunei',
    )
  ) {
    return 'bibd';
  }

  if (value.includes('taib')) {
    return 'taib';
  }

  if (
    value.includes(
      'standard chartered',
    )
    || value === 'scb'
  ) {
    return 'standard_chartered_brunei';
  }

  if (account.type === 'cash') {
    return 'cash';
  }

  if (account.type === 'e_wallet') {
    return 'other_e_wallet';
  }

  return null;
}

function fallbackLabel(
  account: Account,
) {
  const code =
    inferredInstitutionCode(account);

  if (code === 'bibd') return 'BI';
  if (code === 'baiduri') return 'B';
  if (code === 'taib') return 'T';
  if (
    code ===
      'standard_chartered_brunei'
  ) {
    return 'SC';
  }

  if (code === 'cash') return '$';
  if (code === 'other_e_wallet') {
    return 'W';
  }

  return (
    account.name
      .trim()
      .charAt(0)
      .toUpperCase()
    || '?'
  );
}

export function AccountAvatar({
  account,
  size = 'normal',
  className = '',
}: {
  account: Account;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}) {
  const [url, setUrl] =
    useState('');

  useEffect(
    () => {
      let active = true;
      setUrl('');

      if (!account.avatarPath) {
        return () => {
          active = false;
        };
      }

      void getAccountAvatarUrl(
        account.avatarPath,
      )
        .then((nextUrl) => {
          if (active) {
            setUrl(nextUrl);
          }
        })
        .catch(() => {
          if (active) {
            setUrl('');
          }
        });

      return () => {
        active = false;
      };
    },
    [account.avatarPath],
  );

  const visualCode =
    useMemo(
      () =>
        inferredInstitutionCode(
          account,
        )
        || 'other',
      [
        account.institution,
        account.institutionCode,
        account.type,
      ],
    );

  return (
    <span
      className={
        'account-avatar '
        + 'account-symbol '
        + 'account-avatar-'
        + size
        + ' account-institution-'
        + visualCode
        + (className
          ? ' ' + className
          : '')
      }
      aria-hidden="true"
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
        />
      ) : (
        <span>
          {fallbackLabel(account)}
        </span>
      )}
    </span>
  );
}
