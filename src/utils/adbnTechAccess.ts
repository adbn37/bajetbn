import type { Space } from '../types/models';

export const BAJETBN_ADBN_OWNER_EMAIL =
  'zardeerwandy@gmail.com';

export function isBajetBnAdbnOwnerEmail(
  value?: string | null,
) {
  return (
    value?.trim().toLowerCase()
    === BAJETBN_ADBN_OWNER_EMAIL
  );
}

export function isAdbnTechCustomerSpace(
  space?: Space | null,
) {
  return Boolean(
    space
    && space.externalIntegrationProvider
      === 'adbn_tech'
    && space.externalIntegrationRole
      === 'customer',
  );
}

export function isInternalAdbnTechSpace(
  space?: Space | null,
) {
  if (
    !space
    || isAdbnTechCustomerSpace(space)
  ) {
    return false;
  }

  return (
    space.externalIntegrationProvider
      === 'adbn_tech'
    || (
      space.type === 'sme'
      && space.name
        .trim()
        .toLowerCase()
        === 'adbn tech'
    )
  );
}

export function canAccessInternalAdbnTechSpace(
  space: Space | null | undefined,
  user: {
    uid?: string | null;
    email?: string | null;
  },
) {
  if (!isInternalAdbnTechSpace(space)) {
    return true;
  }

  return Boolean(
    space
    && user.uid
    && space.ownerId === user.uid
    && isBajetBnAdbnOwnerEmail(
      user.email,
    ),
  );
}
