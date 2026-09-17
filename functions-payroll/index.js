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

// -----------------------------------------------------------------------------
// Business Money Activity management
// Owner/Admin safe-detail editing and ledger-preserving undo.
// -----------------------------------------------------------------------------

function businessMoneyManagerRole(space, member, uid) {
  if (String(space.ownerId || '') === uid) return 'owner';

  if (
    member
    && !['suspended', 'removed'].includes(String(member.status || ''))
    && member.role === 'admin'
  ) {
    return 'admin';
  }

  return null;
}

function requireBusinessMoneyManager(space, member, uid) {
  const role = businessMoneyManagerRole(space, member, uid);

  if (!role) {
    throw new HttpsError(
      'permission-denied',
      'Only the Business Owner or Business Admin can edit or undo Business Money Activity.',
    );
  }

  return role;
}

function businessMoneyPositiveMinor(value, label) {
  if (
    !Number.isSafeInteger(value)
    || Number(value) <= 0
    || Number(value) > 99_999_999_999
  ) {
    throw new HttpsError(
      'failed-precondition',
      `${label} is invalid.`,
    );
  }

  return Number(value);
}

function businessMoneySignedMinor(value, label) {
  if (
    !Number.isSafeInteger(value)
    || Math.abs(Number(value)) > 99_999_999_999
  ) {
    throw new HttpsError(
      'failed-precondition',
      `${label} is invalid.`,
    );
  }

  return Number(value);
}

function businessMoneyAccountDelta(
  accountType,
  transactionType,
  amountMinor,
  destination = false,
) {
  if (
    !['bank', 'cash', 'e_wallet', 'credit_card'].includes(
      String(accountType || ''),
    )
  ) {
    throw new HttpsError(
      'failed-precondition',
      'The Business Account type is invalid.',
    );
  }

  let flow;

  if (transactionType === 'income') {
    flow = 'in';
  } else if (transactionType === 'expense') {
    flow = 'out';
  } else if (transactionType === 'transfer') {
    flow = destination ? 'in' : 'out';
  } else {
    throw new HttpsError(
      'failed-precondition',
      'Only original income, expense or transfer records can be undone.',
    );
  }

  const assetEffect =
    flow === 'in'
      ? amountMinor
      : -amountMinor;

  return accountType === 'credit_card'
    ? -assetEffect
    : assetEffect;
}

function businessMoneyManagedSource(data) {
  if (
    data.smePosSaleId
    || data.posSaleId
    || data.smePosReturnId
    || data.smePosPayoutId
    || data.reservationId
  ) {
    return 'Marketplace / POS';
  }

  if (
    data.businessInvoiceId
    || data.businessInvoicePaymentId
  ) {
    return 'Business invoice';
  }

  if (
    data.commitmentId
    || data.commitmentPaymentId
    || data.sharedBillAssignmentId
    || data.sharedBillPaymentId
  ) {
    return 'Bill / instalment';
  }

  if (
    data.recurringTemplateId
    || data.recurringRunId
  ) {
    return 'Recurring money';
  }

  if (data.spaceWorkItemId) {
    return 'Space work item';
  }

  return null;
}

function businessMoneyLabels(value) {
  if (!Array.isArray(value)) return [];

  const result = [];
  const seen = new Set();

  for (const raw of value.slice(0, 8)) {
    if (typeof raw !== 'string') continue;

    const label =
      raw
        .trim()
        .replace(/^#+/, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .slice(0, 32);

    if (!label) continue;

    const key =
      label.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(label);
  }

  return result;
}

async function businessMoneyPayrollSource(transactionId) {
  const snapshot =
    await db.collection('businessPayrollRuns')
      .where('transactionId', '==', transactionId)
      .limit(1)
      .get();

  return snapshot.empty
    ? null
    : snapshot.docs[0];
}

exports.updateBusinessMoneyActivityDetails = onCall(
  { region },
  async (request) => {
    const uid = requireUid(request);
    const transactionId =
      requiredText(
        request.data?.transactionId,
        'Transaction',
        160,
      );

    const transactionRef =
      db.collection('transactions')
        .doc(transactionId);

    const transactionSnapshot =
      await transactionRef.get();

    if (!transactionSnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'Business money activity not found.',
      );
    }

    const current =
      transactionSnapshot.data() || {};

    const spaceId =
      requiredText(
        current.spaceId,
        'Business Space',
        100,
      );

    const [spaceSnapshot, memberSnapshot, payrollSource] =
      await Promise.all([
        db.collection('spaces')
          .doc(spaceId)
          .get(),
        db.collection('spaceMembers')
          .doc(`${spaceId}_${uid}`)
          .get(),
        businessMoneyPayrollSource(
          transactionId,
        ),
      ]);

    const space =
      assertSmeSpace(spaceSnapshot);

    const member =
      memberSnapshot.exists
        ? memberSnapshot.data() || {}
        : null;

    requireBusinessMoneyManager(
      space,
      member,
      uid,
    );

    const ownerId =
      requiredText(
        space.ownerId,
        'Business Owner',
        160,
      );

    if (
      current.ownerId !== ownerId
      || current.spaceId !== spaceId
    ) {
      throw new HttpsError(
        'failed-precondition',
        'This record no longer belongs to the selected Business Space.',
      );
    }

    if (
      current.status !== 'posted'
      || current.type === 'reversal'
      || current.reversalOf
      || current.reversedBy
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Only an active original Business money record can be edited.',
      );
    }

    const managedSource =
      businessMoneyManagedSource(
        current,
      );

    if (
      managedSource
      || payrollSource
    ) {
      throw new HttpsError(
        'failed-precondition',
        `This record is managed by ${managedSource || 'Payroll'}. Change it from the original workflow.`,
      );
    }

    const counterparty =
      optionalText(
        request.data?.counterparty,
        120,
      );

    const note =
      optionalText(
        request.data?.note,
        500,
      );

    const labels =
      businessMoneyLabels(
        request.data?.labels,
      );

    const allowedMethods = [
      'bank_transfer',
      'cash',
      'debit_card',
      'credit_card',
      'e_wallet',
      'qr_payment',
      'bank_deposit',
      'cheque',
      'other',
    ];

    let paymentMethod = null;
    let paymentMethodLabel = null;

    if (
      request.data?.paymentMethod
      != null
      && request.data?.paymentMethod !== ''
    ) {
      paymentMethod =
        String(
          request.data.paymentMethod,
        );

      if (
        !allowedMethods.includes(
          paymentMethod,
        )
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid payment method.',
        );
      }

      if (paymentMethod === 'other') {
        paymentMethodLabel =
          optionalText(
            request.data?.paymentMethodLabel,
            80,
          );

        if (!paymentMethodLabel) {
          throw new HttpsError(
            'invalid-argument',
            'Type the other payment method.',
          );
        }
      }
    }

    const now =
      FieldValue.serverTimestamp();

    await transactionRef.update({
      counterparty,
      note,
      labels,
      paymentMethod,
      paymentMethodLabel,
      editCount:
        Number(current.editCount || 0) + 1,
      editedAt: now,
      editedBy: uid,
      updatedAt: now,
    });

    await db.collection(
      'businessMoneyActivityAudit',
    ).add({
      action:
        'details_updated',
      transactionId,
      spaceId,
      ownerId,
      actorUid: uid,
      counterparty,
      note,
      labels,
      createdAt: now,
    });

    return {
      transactionId,
      updated: true,
    };
  },
);

exports.reverseBusinessMoneyActivity = onCall(
  { region },
  async (request) => {
    const uid = requireUid(request);

    const transactionId =
      requiredText(
        request.data?.transactionId,
        'Transaction',
        160,
      );

    const reversalDate =
      localDate(
        request.data?.transactionDate,
      );

    const reason =
      optionalText(
        request.data?.reason,
        500,
      )
      || 'Deleted / undone from Business Money Activity.';

    const key =
      idempotencyKey(
        request.data?.idempotencyKey,
      );

    const commandRef =
      db.collection('financialCommands')
        .doc(`${uid}_${key}`);

    const originalRef =
      db.collection('transactions')
        .doc(transactionId);

    const payrollSource =
      await businessMoneyPayrollSource(
        transactionId,
      );

    return db.runTransaction(
      async (transaction) => {
        const [
          commandSnapshot,
          originalSnapshot,
        ] = await Promise.all([
          transaction.get(commandRef),
          transaction.get(originalRef),
        ]);

        if (commandSnapshot.exists) {
          const command =
            commandSnapshot.data() || {};

          if (
            command.kind
              === 'reverse_business_money_activity'
            && command.transactionId
              === transactionId
          ) {
            return command.result;
          }

          throw new HttpsError(
            'failed-precondition',
            'This Business Money Activity request conflicts with an earlier financial command.',
          );
        }

        if (!originalSnapshot.exists) {
          throw new HttpsError(
            'not-found',
            'Business money activity not found.',
          );
        }

        const original =
          originalSnapshot.data() || {};

        const spaceId =
          requiredText(
            original.spaceId,
            'Business Space',
            100,
          );

        const spaceRef =
          db.collection('spaces')
            .doc(spaceId);

        const memberRef =
          db.collection('spaceMembers')
            .doc(`${spaceId}_${uid}`);

        const [
          spaceSnapshot,
          memberSnapshot,
        ] = await Promise.all([
          transaction.get(spaceRef),
          transaction.get(memberRef),
        ]);

        const space =
          assertSmeSpace(
            spaceSnapshot,
          );

        const member =
          memberSnapshot.exists
            ? memberSnapshot.data() || {}
            : null;

        const actorRole =
          requireBusinessMoneyManager(
            space,
            member,
            uid,
          );

        const ownerId =
          requiredText(
            space.ownerId,
            'Business Owner',
            160,
          );

        if (
          original.ownerId !== ownerId
          || original.spaceId !== spaceId
        ) {
          throw new HttpsError(
            'failed-precondition',
            'This record no longer belongs to the selected Business Space.',
          );
        }

        if (
          ![
            'income',
            'expense',
            'transfer',
          ].includes(
            String(
              original.type || '',
            ),
          )
          || original.status !== 'posted'
          || original.reversalOf
          || original.reversedBy
        ) {
          throw new HttpsError(
            'failed-precondition',
            'Only an active original Business money record can be undone.',
          );
        }

        const managedSource =
          businessMoneyManagedSource(
            original,
          );

        if (
          managedSource
          || payrollSource
        ) {
          throw new HttpsError(
            'failed-precondition',
            `This record is managed by ${managedSource || 'Payroll'}. Change or delete it from the original workflow so linked records stay correct.`,
          );
        }

        const amountMinor =
          businessMoneyPositiveMinor(
            original.amountMinor,
            'Transaction amount',
          );

        const sourceRef =
          db.collection('accounts')
            .doc(
              requiredText(
                original.accountId,
                'Business Account',
                160,
              ),
            );

        const destinationRef =
          original.type === 'transfer'
          && original.destinationAccountId
            ? db.collection('accounts')
              .doc(
                requiredText(
                  original.destinationAccountId,
                  'Destination Account',
                  160,
                ),
              )
            : null;

        const budgetIds =
          Array.isArray(
            original.budgetIds,
          )
            ? original.budgetIds
              .filter(
                (value) =>
                  typeof value === 'string'
                  && value,
              )
            : [];

        const reads = [
          transaction.get(sourceRef),
          ...budgetIds.map(
            (budgetId) =>
              transaction.get(
                db.collection('budgets')
                  .doc(budgetId),
              ),
          ),
        ];

        if (destinationRef) {
          reads.splice(
            1,
            0,
            transaction.get(
              destinationRef,
            ),
          );
        }

        const snapshots =
          await Promise.all(reads);

        const sourceSnapshot =
          snapshots[0];

        if (!sourceSnapshot.exists) {
          throw new HttpsError(
            'failed-precondition',
            'The Business Account is unavailable.',
          );
        }

        const source =
          sourceSnapshot.data() || {};

        let destination = null;
        let budgetOffset = 1;

        if (destinationRef) {
          const destinationSnapshot =
            snapshots[1];

          if (
            !destinationSnapshot
            || !destinationSnapshot.exists
          ) {
            throw new HttpsError(
              'failed-precondition',
              'The destination Business Account is unavailable.',
            );
          }

          destination =
            destinationSnapshot.data() || {};

          budgetOffset = 2;
        }

        if (
          source.ownerId !== ownerId
          || source.archivedAt
          || source.closedAt
          || source.currency
            !== original.currency
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The source Business Account no longer matches this transaction.',
          );
        }

        if (
          destination
          && (
            destination.ownerId
              !== ownerId
            || destination.archivedAt
            || destination.closedAt
            || destination.currency
              !== original.currency
          )
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The destination Business Account no longer matches this transaction.',
          );
        }

        const now =
          FieldValue.serverTimestamp();

        const reversalRef =
          db.collection('transactions')
            .doc();

        const sourceLedgerRef =
          db.collection('ledgerEntries')
            .doc();

        const sourceCurrent =
          businessMoneySignedMinor(
            source.ledgerBalanceMinor,
            'Business Account balance',
          );

        const sourceVersion =
          Number(
            source.balanceVersion,
          );

        if (
          !Number.isSafeInteger(
            sourceVersion,
          )
          || sourceVersion < 0
        ) {
          throw new HttpsError(
            'failed-precondition',
            'The source Business Account balance version is invalid.',
          );
        }

        const sourceOriginalDelta =
          businessMoneyAccountDelta(
            source.type,
            original.type,
            amountMinor,
            false,
          );

        const sourceUndoDelta =
          -sourceOriginalDelta;

        transaction.update(
          sourceRef,
          {
            ledgerBalanceMinor:
              sourceCurrent
              + sourceUndoDelta,
            balanceVersion:
              sourceVersion + 1,
            updatedAt: now,
          },
        );

        transaction.create(
          sourceLedgerRef,
          {
            displayId:
              displayId('LED'),
            accountId:
              String(
                original.accountId,
              ),
            ownerId,
            spaceId,
            transactionId:
              reversalRef.id,
            entryType:
              'reversal',
            amountMinor:
              sourceUndoDelta,
            currency:
              String(
                original.currency
                || source.currency
                || 'BND',
              ),
            direction:
              sourceUndoDelta >= 0
                ? 'debit'
                : 'credit',
            counterAccountId:
              original.destinationAccountId
              || null,
            status: 'posted',
            idempotencyKey: key,
            postedAt: now,
            createdAt: now,
          },
        );

        if (
          destinationRef
          && destination
        ) {
          const destinationCurrent =
            businessMoneySignedMinor(
              destination.ledgerBalanceMinor,
              'Destination Account balance',
            );

          const destinationVersion =
            Number(
              destination.balanceVersion,
            );

          if (
            !Number.isSafeInteger(
              destinationVersion,
            )
            || destinationVersion < 0
          ) {
            throw new HttpsError(
              'failed-precondition',
              'The destination Business Account balance version is invalid.',
            );
          }

          const destinationOriginalDelta =
            businessMoneyAccountDelta(
              destination.type,
              'transfer',
              amountMinor,
              true,
            );

          const destinationUndoDelta =
            -destinationOriginalDelta;

          transaction.update(
            destinationRef,
            {
              ledgerBalanceMinor:
                destinationCurrent
                + destinationUndoDelta,
              balanceVersion:
                destinationVersion + 1,
              updatedAt: now,
            },
          );

          const destinationLedgerRef =
            db.collection('ledgerEntries')
              .doc();

          transaction.create(
            destinationLedgerRef,
            {
              displayId:
                displayId('LED'),
              accountId:
                String(
                  original.destinationAccountId,
                ),
              ownerId,
              spaceId,
              transactionId:
                reversalRef.id,
              entryType:
                'reversal_transfer',
              amountMinor:
                destinationUndoDelta,
              currency:
                String(
                  original.currency
                  || destination.currency
                  || 'BND',
                ),
              direction:
                destinationUndoDelta >= 0
                  ? 'debit'
                  : 'credit',
              counterAccountId:
                String(
                  original.accountId,
                ),
              status: 'posted',
              idempotencyKey: key,
              postedAt: now,
              createdAt: now,
            },
          );
        }

        if (
          original.type === 'expense'
          && budgetIds.length
        ) {
          budgetIds.forEach(
            (budgetId, index) => {
              const snapshot =
                snapshots[
                  budgetOffset + index
                ];

              if (
                !snapshot
                || !snapshot.exists
              ) {
                throw new HttpsError(
                  'failed-precondition',
                  `Budget ${budgetId} is unavailable.`,
                );
              }

              const budget =
                snapshot.data() || {};

              if (
                budget.ownerId
                  !== ownerId
              ) {
                throw new HttpsError(
                  'failed-precondition',
                  'A linked Budget no longer belongs to the Business Owner.',
                );
              }

              const spent =
                businessMoneySignedMinor(
                  budget.spentMinor,
                  'Budget spent amount',
                );

              transaction.update(
                snapshot.ref,
                {
                  spentMinor:
                    Math.max(
                      0,
                      spent - amountMinor,
                    ),
                  updatedAt: now,
                },
              );
            },
          );
        }

        transaction.create(
          reversalRef,
          {
            displayId:
              displayId('TXN'),
            ownerId,
            createdBy: uid,
            type: 'reversal',
            originalType:
              original.type,
            status: 'posted',
            spaceId,
            accountId:
              String(
                original.accountId,
              ),
            destinationAccountId:
              original.destinationAccountId
              || null,
            amountMinor,
            currency:
              String(
                original.currency
                || 'BND',
              ),
            categoryId:
              original.categoryId
              || null,
            category:
              original.category
              || null,
            categoryIcon:
              original.categoryIcon
              || null,
            categoryColor:
              original.categoryColor
              || null,
            categoryScope:
              original.categoryScope
              || 'business',
            labels:
              original.labels
              || [],
            paymentMethod:
              original.paymentMethod
              || null,
            paymentMethodLabel:
              original.paymentMethodLabel
              || null,
            counterparty:
              original.counterparty
              || '',
            note: reason,
            transactionDate:
              reversalDate,
            reversalOf:
              transactionId,
            reversedBy: null,
            budgetIds:
              original.budgetIds
              || [],
            createdAt: now,
            postedAt: now,
            updatedAt: now,
          },
        );

        transaction.update(
          originalRef,
          {
            status: 'reversed',
            reversedBy:
              reversalRef.id,
            reversedAt: now,
            updatedAt: now,
          },
        );

        const auditRef =
          db.collection(
            'businessMoneyActivityAudit',
          ).doc();

        transaction.create(
          auditRef,
          {
            action:
              'transaction_reversed',
            transactionId,
            reversalTransactionId:
              reversalRef.id,
            spaceId,
            ownerId,
            actorUid: uid,
            actorRole,
            amountMinor,
            currency:
              String(
                original.currency
                || 'BND',
              ),
            reason,
            createdAt: now,
          },
        );

        const result = {
          transactionId,
          reversalTransactionId:
            reversalRef.id,
          status: 'reversed',
        };

        transaction.create(
          commandRef,
          {
            uid,
            kind:
              'reverse_business_money_activity',
            transactionId,
            idempotencyKey: key,
            result,
            createdAt: now,
          },
        );

        return result;
      },
    );
  },
);
