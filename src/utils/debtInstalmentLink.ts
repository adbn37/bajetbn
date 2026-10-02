import type {
  Commitment,
  DebtRecord,
  Space,
} from '../types/models';

export function getDebtInstalmentLinkIssues(
  debt: DebtRecord,
  commitment: Commitment,
  spaces: Space[],
): string[] {
  const issues: string[] = [];

  const space =
    spaces.find(
      (item) =>
        item.id === commitment.spaceId,
    );

  if (debt.direction !== 'owe') {
    issues.push('Only I Owe Debt can be linked.');
  }

  if (debt.status === 'archived') {
    issues.push('Debt is archived.');
  }

  if (commitment.type !== 'instalment') {
    issues.push('This record is not an Instalment.');
  }

  if (commitment.archivedAt) {
    issues.push('Instalment is archived.');
  }

  if (commitment.stoppedAt) {
    issues.push('Instalment is stopped.');
  }

  if (
    commitment.externalIntegrationProvider
      === 'adbn_tech'
  ) {
    issues.push(
      'ADBN-managed Instalments cannot be linked.',
    );
  }

  if (!space) {
    issues.push(
      'Instalment Space is unavailable.',
    );
  } else if (space.type === 'sme') {
    issues.push(
      'Business Instalments cannot be linked to personal Debt.',
    );
  }

  if (commitment.currency !== debt.currency) {
    issues.push('Different currency.');
  }

  if (
    Number(
      commitment.totalAmountMinor || 0,
    ) !== debt.totalMinor
  ) {
    issues.push('Different total amount.');
  }

  if (
    commitment.amountPaidMinor
      !== debt.paidMinor
  ) {
    issues.push(
      'Paid progress does not match.',
    );
  }

  if (
    commitment.linkedDebtId
    && commitment.linkedDebtId !== debt.id
  ) {
    issues.push(
      'Instalment is already linked to another Debt.',
    );
  }

  if (
    debt.linkedCommitmentId
    && debt.linkedCommitmentId
      !== commitment.id
  ) {
    issues.push(
      'Debt is already linked to another Instalment.',
    );
  }

  if (
    debt.spaceId
    && debt.spaceId !== commitment.spaceId
  ) {
    issues.push('Different Space.');
  }

  return issues;
}

export function canLinkDebtAndInstalment(
  debt: DebtRecord,
  commitment: Commitment,
  spaces: Space[],
): boolean {
  return (
    getDebtInstalmentLinkIssues(
      debt,
      commitment,
      spaces,
    ).length === 0
  );
}
