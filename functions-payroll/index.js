const { getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { randomBytes } = require('node:crypto');

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const region = 'asia-southeast1';

function requireUid(request) {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in is required.');
  }
  return uid;
}

function requiredText(value, field, max = 160) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  const result = value.trim();
  if (result.length > max) {
    throw new HttpsError('invalid-argument', `${field} is too long.`);
  }
  return result;
}

function optionalText(value, max = 500) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new HttpsError('invalid-argument', 'Invalid text value.');
  }
  return value.trim();
}

function localDate(value) {
  const result = requiredText(value, 'Transaction date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new HttpsError('invalid-argument', 'Transaction date must use YYYY-MM-DD.');
  }
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new HttpsError('invalid-argument', 'Transaction date is invalid.');
  }
  return result;
}

function idempotencyKey(value) {
  const result = requiredText(value, 'Idempotency key', 64);
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(result)) {
    throw new HttpsError('invalid-argument', 'Invalid idempotency key.');
  }
  return result;
}

function displayId(prefix) {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function assertSmeSpace(snapshot) {
  if (!snapshot.exists || snapshot.data()?.archivedAt || snapshot.data()?.type !== 'sme') {
    throw new HttpsError('not-found', 'Business Space not found.');
  }
  return snapshot.data() || {};
}

function payrollRole(space, member, uid) {
  if (String(space.ownerId || '') === uid) return 'owner';

  if (
    !member
    || ['suspended', 'removed'].includes(String(member.status || ''))
    || member.role !== 'admin'
  ) {
    return null;
  }

  return 'admin';
}

function requirePayrollRole(space, member, uid) {
  const role = payrollRole(space, member, uid);
  if (!role) {
    throw new HttpsError(
      'permission-denied',
      'Only the Business Owner or an authorised Business Admin can delete payroll.',
    );
  }
  return role;
}

function positiveMinor(value, label) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0 || Number(value) > 99_999_999_999) {
    throw new HttpsError('failed-precondition', `${label} is invalid.`);
  }
  return Number(value);
}

function signedMinor(value, label) {
  if (!Number.isSafeInteger(value) || Math.abs(Number(value)) > 99_999_999_999) {
    throw new HttpsError('failed-precondition', `${label} is invalid.`);
  }
  return Number(value);
}

function reverseExpenseDelta(accountType, amountMinor) {
  if (!['bank', 'cash', 'e_wallet', 'credit_card'].includes(accountType)) {
    throw new HttpsError('failed-precondition', 'The payroll account type is invalid.');
  }

  const originalDelta =
    accountType === 'credit_card'
      ? amountMinor
      : -amountMinor;

  return -originalDelta;
}

exports.getBusinessPayrollWorkspace = onCall(
  { region },
  async (request) => {
    const uid = requireUid(request);
    const spaceId = requiredText(request.data?.spaceId, 'Business Space', 100);

    const [spaceSnapshot, memberSnapshot] = await Promise.all([
      db.collection('spaces').doc(spaceId).get(),
      db.collection('spaceMembers').doc(`${spaceId}_${uid}`).get(),
    ]);

    const space = assertSmeSpace(spaceSnapshot);
    const ownerId = requiredText(space.ownerId, 'Business Owner', 160);
    const member = memberSnapshot.exists ? (memberSnapshot.data() || {}) : null;
    const role = payrollRole(space, member, uid);

    if (!role) {
      return {
        ownerId,
        spaceId,
        spaceName: String(space.name || 'Business'),
        currency: String(space.currency || 'BND'),
        role: 'member',
        isOwner: false,
        isAdmin: false,
        canViewPayroll: false,
        canDeletePayroll: false,
        employees: [],
        runs: [],
      };
    }

    const [employeeSnapshot, runSnapshot] = await Promise.all([
      db.collection('businessEmployees').where('spaceId', '==', spaceId).get(),
      db.collection('businessPayrollRuns').where('spaceId', '==', spaceId).get(),
    ]);

    const employees = employeeSnapshot.docs
      .filter((item) => item.data()?.ownerId === ownerId)
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    const runs = runSnapshot.docs
      .filter((item) => item.data()?.ownerId === ownerId)
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const dateCompare = String(b.payDate || '').localeCompare(String(a.payDate || ''));
        if (dateCompare !== 0) return dateCompare;
        const aMillis = Number(a.createdAt?.toMillis?.() || 0);
        const bMillis = Number(b.createdAt?.toMillis?.() || 0);
        return bMillis - aMillis;
      });

    return {
      ownerId,
      spaceId,
      spaceName: String(space.name || 'Business'),
      currency: String(space.currency || 'BND'),
      role,
      isOwner: role === 'owner',
      isAdmin: role === 'admin',
      canViewPayroll: true,
      canDeletePayroll: true,
      employees,
      runs,
    };
  },
);

exports.deleteBusinessPayrollRun = onCall(
  { region },
  async (request) => {
    const uid = requireUid(request);
    const runId = requiredText(request.data?.runId, 'Payroll run', 160);
    const transactionDate = localDate(request.data?.transactionDate);
    const reason = optionalText(request.data?.reason, 500)
      || 'Deleted from Payroll by an authorised Business manager.';
    const key = idempotencyKey(request.data?.idempotencyKey);

    const commandRef = db.collection('financialCommands').doc(`${uid}_${key}`);
    const runRef = db.collection('businessPayrollRuns').doc(runId);
    const offerRef = db.collection('linkedMoneyOffers').doc(`business_payroll_run_${runId}`);

    return db.runTransaction(async (transaction) => {
      const [commandSnapshot, runSnapshot] = await Promise.all([
        transaction.get(commandRef),
        transaction.get(runRef),
      ]);

      if (commandSnapshot.exists) {
        const command = commandSnapshot.data() || {};
        if (
          command.kind === 'delete_business_payroll_run'
          && command.runId === runId
        ) {
          return command.result;
        }

        throw new HttpsError(
          'failed-precondition',
          'This payroll delete request conflicts with an earlier financial command.',
        );
      }

      if (!runSnapshot.exists) {
        throw new HttpsError('not-found', 'Payroll run not found.');
      }

      const run = runSnapshot.data() || {};
      const spaceId = requiredText(run.spaceId, 'Business Space', 100);
      const ownerId = requiredText(run.ownerId, 'Business Owner', 160);

      const spaceRef = db.collection('spaces').doc(spaceId);
      const memberRef = db.collection('spaceMembers').doc(`${spaceId}_${uid}`);
      const payslipQuery = db.collection('businessPrivateDocuments')
        .where('sourceId', '==', runId);

      const [spaceSnapshot, memberSnapshot, offerSnapshot, payslipSnapshot] =
        await Promise.all([
          transaction.get(spaceRef),
          transaction.get(memberRef),
          transaction.get(offerRef),
          transaction.get(payslipQuery),
        ]);

      const space = assertSmeSpace(spaceSnapshot);
      const member = memberSnapshot.exists ? (memberSnapshot.data() || {}) : null;
      const actorRole = requirePayrollRole(space, member, uid);

      if (String(space.ownerId || '') !== ownerId) {
        throw new HttpsError(
          'failed-precondition',
          'Payroll ownership no longer matches this Business Space.',
        );
      }

      const linkedOffer = offerSnapshot.exists ? (offerSnapshot.data() || {}) : null;
      if (
        run.linkedMoneyStatus === 'accepted'
        || linkedOffer?.status === 'accepted'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'This salary was already added to the recipient Personal Money. Resolve the linked salary first before deleting this payroll run.',
        );
      }

      if (run.status === 'cancelled') {
        throw new HttpsError(
          'failed-precondition',
          'This payroll run has already been deleted.',
        );
      }

      if (!['pending', 'posted'].includes(String(run.status || ''))) {
        throw new HttpsError(
          'failed-precondition',
          'This payroll run is not in a deletable state.',
        );
      }

      let originalRef = null;
      let original = null;
      let accountRef = null;
      let account = null;
      let budgetSnapshots = [];
      let amountMinor = 0;

      if (run.status === 'posted') {
        const originalTransactionId = requiredText(
          run.transactionId,
          'Payroll transaction',
          160,
        );

        originalRef = db.collection('transactions').doc(originalTransactionId);
        const originalSnapshot = await transaction.get(originalRef);

        if (!originalSnapshot.exists) {
          throw new HttpsError(
            'failed-precondition',
            'The linked wage transaction could not be found.',
          );
        }

        original = originalSnapshot.data() || {};

        amountMinor = positiveMinor(run.netMinor, 'Payroll net amount');

        if (
          original.ownerId !== ownerId
          || original.spaceId !== spaceId
          || original.accountId !== run.accountId
          || original.type !== 'expense'
          || original.status !== 'posted'
          || original.reversalOf
          || original.reversedBy
          || Number(original.amountMinor) !== amountMinor
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The linked wage transaction no longer matches this payroll run, so it was not changed.',
          );
        }

        accountRef = db.collection('accounts').doc(
          requiredText(run.accountId, 'Payroll account', 160),
        );

        const accountSnapshot = await transaction.get(accountRef);

        if (!accountSnapshot.exists) {
          throw new HttpsError(
            'failed-precondition',
            'The Business Account for this payroll run is unavailable.',
          );
        }

        account = accountSnapshot.data() || {};

        if (
          account.ownerId !== ownerId
          || account.archivedAt
          || account.closedAt
          || account.currency !== run.currency
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The Business Account no longer matches this payroll run.',
          );
        }

        const budgetIds = Array.isArray(original.budgetIds)
          ? original.budgetIds.filter((value) => typeof value === 'string' && value)
          : [];

        budgetSnapshots = await Promise.all(
          budgetIds.map((budgetId) =>
            transaction.get(db.collection('budgets').doc(budgetId))),
        );
      }

      const now = FieldValue.serverTimestamp();
      const reversalRef = run.status === 'posted'
        ? db.collection('transactions').doc()
        : null;
      const ledgerRef = run.status === 'posted'
        ? db.collection('ledgerEntries').doc()
        : null;
      const auditRef = db.collection('businessPayrollDeletionAudit').doc();

      let reversalTransactionId = null;

      if (
        run.status === 'posted'
        && originalRef
        && original
        && accountRef
        && account
        && reversalRef
        && ledgerRef
      ) {
        const currentBalance = signedMinor(
          account.ledgerBalanceMinor,
          'Business Account balance',
        );
        const currentVersion = Number(account.balanceVersion);

        if (!Number.isSafeInteger(currentVersion) || currentVersion < 0) {
          throw new HttpsError(
            'failed-precondition',
            'The Business Account balance version is invalid.',
          );
        }

        const delta = reverseExpenseDelta(account.type, amountMinor);
        const nextBalance = currentBalance + delta;

        if (!Number.isSafeInteger(nextBalance)) {
          throw new HttpsError(
            'failed-precondition',
            'Reversing this payroll would create an invalid account balance.',
          );
        }

        transaction.update(accountRef, {
          ledgerBalanceMinor: nextBalance,
          balanceVersion: currentVersion + 1,
          updatedAt: now,
        });

        transaction.create(ledgerRef, {
          displayId: displayId('LED'),
          accountId: String(run.accountId),
          ownerId,
          spaceId,
          transactionId: reversalRef.id,
          entryType: 'reversal',
          amountMinor: delta,
          currency: String(run.currency || account.currency || 'BND'),
          direction: delta >= 0 ? 'debit' : 'credit',
          counterAccountId: null,
          status: 'posted',
          idempotencyKey: key,
          postedAt: now,
          createdAt: now,
        });

        const budgetIds = Array.isArray(original.budgetIds)
          ? original.budgetIds.filter((value) => typeof value === 'string' && value)
          : [];

        budgetSnapshots.forEach((snapshot, index) => {
          if (!snapshot.exists) {
            throw new HttpsError(
              'failed-precondition',
              `Payroll budget ${budgetIds[index] || ''} is unavailable.`,
            );
          }

          const budget = snapshot.data() || {};
          if (budget.ownerId !== ownerId) {
            throw new HttpsError(
              'failed-precondition',
              'A payroll budget no longer belongs to the Business Owner.',
            );
          }

          const spentMinor = signedMinor(
            budget.spentMinor,
            'Payroll budget spent amount',
          );

          transaction.update(snapshot.ref, {
            spentMinor: Math.max(0, spentMinor - amountMinor),
            updatedAt: now,
          });
        });

        transaction.create(reversalRef, {
          displayId: displayId('TXN'),
          ownerId,
          createdBy: uid,
          type: 'reversal',
          originalType: 'expense',
          status: 'posted',
          spaceId,
          accountId: String(run.accountId),
          destinationAccountId: null,
          amountMinor,
          currency: String(run.currency || original.currency || 'BND'),
          category: 'Reversal',
          categoryId: 'system-reversal',
          categoryIcon: 'repeat',
          categoryColor: 'slate',
          categoryScope: original.categoryScope || 'business',
          categoryIsSystem: true,
          counterparty: original.counterparty || run.employeeName || '',
          note: reason,
          labels: ['payroll', 'payroll-reversal'],
          paymentMethod: original.paymentMethod || null,
          paymentMethodLabel: original.paymentMethodLabel || null,
          transactionDate,
          reversalOf: originalRef.id,
          reversedBy: null,
          budgetIds,
          commitmentId: null,
          commitmentPaymentId: null,
          businessInvoiceId: null,
          businessInvoicePaymentId: null,
          createdAt: now,
          postedAt: now,
          updatedAt: now,
        });

        transaction.update(originalRef, {
          status: 'reversed',
          reversedBy: reversalRef.id,
          reversedAt: now,
          updatedAt: now,
        });

        reversalTransactionId = reversalRef.id;
      }

      let cancelledPayslips = 0;

      for (const document of payslipSnapshot.docs) {
        const data = document.data() || {};

        if (
          data.sourceType !== 'business_payroll_run'
          || data.spaceId !== spaceId
          || data.ownerId !== ownerId
          || data.status === 'cancelled'
        ) {
          continue;
        }

        cancelledPayslips += 1;

        transaction.update(document.ref, {
          status: 'cancelled',
          cancelledBy: uid,
          cancelledAt: now,
          updatedAt: now,
        });
      }

      let nextLinkedMoneyStatus =
        typeof run.linkedMoneyStatus === 'string'
          ? run.linkedMoneyStatus
          : null;

      if (offerSnapshot.exists && linkedOffer) {
        if (linkedOffer.status === 'pending') {
          nextLinkedMoneyStatus = 'declined';

          transaction.update(offerRef, {
            status: 'declined',
            declinedAt: now,
            sourceCancelledAt: now,
            updatedAt: now,
          });
        } else {
          transaction.update(offerRef, {
            sourceCancelledAt: now,
            updatedAt: now,
          });
        }
      }

      transaction.update(runRef, {
        status: 'cancelled',
        failureReason: null,
        linkedMoneyStatus: nextLinkedMoneyStatus,
        deletedBy: uid,
        deletedByRole: actorRole,
        deletedAt: now,
        deleteReason: reason,
        reversalTransactionId,
        updatedAt: now,
      });

      transaction.create(auditRef, {
        displayId: displayId('PDA'),
        runId,
        ownerId,
        spaceId,
        employeeId: String(run.employeeId || ''),
        employeeName: String(run.employeeName || 'Employee'),
        period: String(run.period || ''),
        payDate: String(run.payDate || ''),
        grossMinor: Number(run.grossMinor || 0),
        deductionsMinor: Number(run.deductionsMinor || 0),
        netMinor: Number(run.netMinor || 0),
        currency: String(run.currency || 'BND'),
        accountId: String(run.accountId || ''),
        accountName: String(run.accountName || ''),
        originalTransactionId: run.transactionId || null,
        reversalTransactionId,
        actorUid: uid,
        actorRole,
        reason,
        payslipsCancelled: cancelledPayslips,
        createdAt: now,
      });

      const result = {
        runId,
        status: 'cancelled',
        reversalTransactionId,
        auditId: auditRef.id,
        payslipsCancelled: cancelledPayslips,
      };

      transaction.create(commandRef, {
        uid,
        kind: 'delete_business_payroll_run',
        runId,
        idempotencyKey: key,
        result,
        createdAt: now,
      });

      return result;
    });
  },
);
