import type { Language } from '../types/models';

const messages = {
  en: { appName: 'BajetBN', personalSpace: 'Personal Space', accounts: 'Accounts', spaces: 'Spaces' },
  ms: { appName: 'BajetBN', personalSpace: 'Ruang Peribadi', accounts: 'Akaun', spaces: 'Ruang' },
} as const;

export type MessageKey = keyof typeof messages.en;

export function translate(language: Language, key: MessageKey): string {
  return messages[language]?.[key] ?? messages.en[key];
}
