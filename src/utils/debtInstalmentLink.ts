import type {
  Commitment,
  DebtRecord,
  Space,
} from '../types/models';

export function canLinkDebtAndInstalment(
  debt: DebtRecord,
  commitment: Commitment,
  spaces: Space[],
): boolean {
  const space =
    spaces.find(
      (item) =>
        item.id
        === commitment.spaceId,
    );

  return Boolean(
    debt.direction === 'owe'
    && debt.status !== 'archived'
    && commitment.type === 'instalment'
    && !commitment.archivedAt
    && !commitment.stoppedAt
    && commitment.externalIntegrationProvider
      !== 'adbn_tech'
    && space
    && space.type !== 'sme'
    && commitment.currency
      === debt.currency
    && Number(
      commitment.totalAmountMinor
      || 0,
    ) === debt.totalMinor
    && commitment.amountPaidMinor
      === debt.paidMinor
    && (
      !commitment.linkedDebtId
      || commitment.linkedDebtId
        === debt.id
    )
    && (
      !debt.linkedCommitmentId
      || debt.linkedCommitmentId
        === commitment.id
    )
    && (
      !debt.spaceId
      || debt.spaceId
        === commitment.spaceId
    )
  );
}
