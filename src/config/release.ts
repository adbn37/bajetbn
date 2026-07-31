import release from '../../release.json';

export const APP_VERSION = release.version;
export const APP_RELEASE_LABEL = release.label;
export const APP_RELEASE_CHANNEL = release.channel;
export const APP_RELEASE_DATE = release.releasedAt;

export function appBuildLabel(environment = import.meta.env.VITE_APP_ENV || 'local') {
  return `v${APP_VERSION} · ${APP_RELEASE_LABEL} · ${environment}`;
}
