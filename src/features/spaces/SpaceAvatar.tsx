import {
  useEffect,
  useState,
} from 'react';
import type {
  Space,
  SpaceType,
} from '../../types/models';
import {
  getSpaceAvatarUrl,
} from '../../repositories/spaceAvatarRepository';

function SpaceFallbackIcon({
  type,
}: {
  type: SpaceType;
}) {
  if (
    type === 'personal'
    || type === 'household'
    || type === 'property'
  ) {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M4 11.2 12 4l8 7.2V20h-5v-5H9v5H4v-8.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'sme') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7m4 4v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7m0 0V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2m0 0c-5.3 2.5-10.7 2.5-16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'trip') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="m3 13 7-2 3-7 2 1-1 6 6-1 1 2-7 3-2 6-2-1v-5l-5 1-2-3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'vehicle') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="m5 14 2-5h10l2 5v5h-2v-2H7v2H5v-5Zm2 0h10M8 14h.01M16 14h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'goal') {
    return (
      <svg viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (type === 'event') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Zm2-2v4m8-4v4M4 9h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'collection') {
    return (
      <svg viewBox="0 0 24 24">
        <rect
          x="5"
          y="5"
          width="6"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <rect
          x="13"
          y="5"
          width="6"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <rect
          x="5"
          y="13"
          width="6"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <rect
          x="13"
          y="13"
          width="6"
          height="6"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (type === 'asset') {
    return (
      <svg viewBox="0 0 24 24">
        <path
          d="m12 4 6 8-6 8-6-8 6-8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M4 7h6l2 2h8v10H4V7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpaceAvatar({
  space,
  size = 'normal',
}: {
  space: Space;
  size?: 'normal' | 'large';
}) {
  const [url, setUrl] =
    useState('');

  useEffect(
    () => {
      let active = true;
      setUrl('');

      if (!space.avatarPath) {
        return () => {
          active = false;
        };
      }

      void getSpaceAvatarUrl(
        space.avatarPath,
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
    [space.avatarPath],
  );

  return (
    <span
      className={
        'space-avatar '
        + (size === 'large'
          ? 'space-avatar-large '
          : '')
        + space.type
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
        <SpaceFallbackIcon
          type={space.type}
        />
      )}
    </span>
  );
}
