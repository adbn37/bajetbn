import type { Account, AccountType, SpaceType } from '../types/models';

/** Official user-supplied PNG artwork; self-hosted by BajetBN, no external requests. */
export type AccountVisualBrand = 'bibd' | 'baiduri' | 'taib' | 'standard_chartered_brunei' | 'tng';
export type BrandVariant = 'personal' | 'business' | 'standard';
export interface AccountBrandVisual {
  key: AccountVisualBrand;
  label: string;
  src: string;
  fallback: string;
  variant: BrandVariant;
}

const ASSET_ROOT = '/bank-logos-v103/';
const PROVIDERS: Record<AccountVisualBrand, { label: string; fallback: string; personal: string; business: string }> = {
  bibd: {
    label: 'BIBD', fallback: 'BIBD',
    personal: 'bibd-personal.png', business: 'bibd-business.png',
  },
  baiduri: {
    label: 'Baiduri Bank', fallback: 'B',
    personal: 'baiduri-personal.png', business: 'baiduri-business.png',
  },
  taib: {
    label: 'Perbadanan TAIB', fallback: 'TAIB',
    personal: 'taib.png', business: 'taib.png',
  },
  standard_chartered_brunei: {
    label: 'Standard Chartered', fallback: 'SC',
    personal: 'standard-chartered.png', business: 'standard-chartered.png',
  },
  tng: {
    label: 'Touch ’n Go eWallet', fallback: 'TNG',
    personal: 'tng.png', business: 'tng.png',
  },
};

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Keep Firestore institutionCode unchanged; TNG is resolved without new codes. */
export function accountBrandVisual(
  account: Pick<Account, 'institutionCode' | 'institution' | 'name' | 'type' | 'classification'>,
): AccountBrandVisual | null {
  const bank = account.type === 'bank' || account.type === 'credit_card';
  const wallet = account.type === 'e_wallet';
  if (!bank && !wallet) return null;
  const code = account.institutionCode || '';
  const provider = normalized(account.institution || '');
  const displayName = normalized(account.name || '');
  const combined = `${provider} ${displayName}`;
  let key: AccountVisualBrand | null = null;

  // The stored bank code takes precedence over a casual account nickname.
  if (bank && (code === 'bibd' || code === 'baiduri' || code === 'taib' || code === 'standard_chartered_brunei')) {
    key = code;
  } else if (wallet && /\b(tng|touch n go|touchngo|touch go)\b/.test(combined)) {
    key = 'tng';
  } else if (bank && /\b(baiduri)\b/.test(combined)) {
    key = 'baiduri';
  } else if (bank && /\b(bibd|bank islam brunei)\b/.test(combined)) {
    key = 'bibd';
  } else if (bank && /\b(taib|tabung amanah islam|perbadanan taib)\b/.test(combined)) {
    key = 'taib';
  } else if (bank && /\b(standard chartered|scb)\b/.test(combined)) {
    key = 'standard_chartered_brunei';
  }
  if (!key) return null;

  // Classification, not the current screen, determines the logo. An account
  // classified Business that is also usable in Personal retains one logo.
  const variant: BrandVariant = (key === 'bibd' || key === 'baiduri')
    ? (account.classification === 'business' ? 'business' : 'personal')
    : 'standard';
  const definition = PROVIDERS[key];
  return {
    key,
    label: definition.label,
    fallback: definition.fallback,
    variant,
    src: ASSET_ROOT + (variant === 'business' ? definition.business : definition.personal),
  };
}

export function accountFallbackArt(type: AccountType): string {
  const names: Record<AccountType, string> = {
    bank: 'bank', cash: 'cash', e_wallet: 'wallet', credit_card: 'card',
  };
  return `/category-icons-v102/${names[type]}.svg`;
}

export function spaceFallbackArt(type: SpaceType): string {
  const names: Record<SpaceType, string> = {
    personal: 'wallet', household: 'family', sme: 'briefcase', trip: 'plane',
    goal: 'target', collection: 'inventory', vehicle: 'car', property: 'home',
    project: 'tools', event: 'calendar', asset: 'equipment', custom: 'dots',
  };
  return `/category-icons-v102/${names[type]}.svg`;
}
