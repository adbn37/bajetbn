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

function AccountFallbackIcon({
  account,
  institutionCode,
}: {
  account: Account;
  institutionCode: InstitutionCode | 'other';
}) {
  const bankMark =
    institutionCode === 'baiduri' ? 'B'
      : institutionCode === 'bibd' ? 'BIBD'
        : institutionCode === 'taib' ? 'TAIB'
          : institutionCode === 'standard_chartered_brunei' ? 'SC'
            : '';

  if (account.type === 'bank' && bankMark) {
    return <span className="account-bank-mark">{bankMark}</span>;
  }
  if (account.type === 'cash') {
    return (
      <svg viewBox="0 0 24 24">
        <rect
          x="4"
          y="6"
          width="16"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle
          cx="12"
          cy="12"
          r="2.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M7 9h.01M17 15h.01"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (account.type === 'e_wallet') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M5 7.5h11.5A2.5 2.5 0 0 1 19 10v7H6a2 2 0 0 1-2-2V7.5A2.5 2.5 0 0 1 6.5 5H17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 11h5v4h-5a2 2 0 0 1 0-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (account.type === 'credit_card') {
    return (
      <svg viewBox="0 0 24 24">
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M4 9h16M7 15h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <path
        d="m4 9 8-4 8 4M5.5 10.5h13M7 11v6M11 11v6M15 11v6M19 11v6M4.5 18.5h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
        <AccountFallbackIcon
          account={account}
          institutionCode={visualCode}
        />
      )}
    </span>
  );
}
