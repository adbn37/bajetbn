import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n?/g, '\n');

const models =
  read('src/types/models.ts');

const spaceRepo =
  read('src/repositories/spaceRepository.ts');

const syncRepo =
  read('src/repositories/adbnTechPaymentSyncRepository.ts');

const payments =
  read('src/features/business/AdbnTechPaymentsWorkspace.tsx');

const home =
  read('src/features/business/BusinessHomePage.tsx');

const adbnRepo =
  read('src/repositories/adbnTechIntegrationRepository.ts');

const checks = [];

function need(condition, label) {
  checks.push(label);

  if (!condition) {
    throw new Error(label);
  }
}

need(
  models.includes(
    'externalIntegrationPaymentAutoSyncEnabled?: boolean;',
  )
    && models.includes(
      'externalIntegrationPaymentAutoSyncCutoffIso?: string | null;',
    ),
  'Business Space stores future-payment auto-sync activation and cutoff.',
);

need(
  spaceRepo.includes(
    'setAdbnTechPaymentAutoSync',
  )
    && spaceRepo.includes(
      'externalIntegrationPaymentAutoSyncEnabled:',
    )
    && spaceRepo.includes(
      'externalIntegrationPaymentAutoSyncCutoffIso:',
    ),
  'Auto-sync preference persists in the BajetBN Business Space.',
);

need(
  syncRepo.includes(
    'adbnPaymentIsAfterCutoff',
  )
    && syncRepo.includes(
      'payment.createdAt',
    )
    && /createdMillis\s*>=\s*cutoffMillis/
      .test(syncRepo),
  'Auto-sync eligibility uses ADBN payment creation time against the stored cutoff.',
);

need(
  syncRepo.includes(
    'autoSyncNewAdbnTechPaymentsToBajetBn',
  )
    && syncRepo.includes(
      'beforeCutoff += 1',
    )
    && syncRepo.includes(
      'mappedAccountId',
    ),
  'Future-only auto-sync skips historical payments and requires account mapping.',
);

need(
  syncRepo.includes(
    'adbnPaymentSyncLabel',
  )
    && syncRepo.includes(
      'syncAdbnTechPaymentToBajetBn',
    )
    && syncRepo.includes(
      'postTransactionWithIdempotencyKey',
    ),
  'Manual and automatic payment posting share the same duplicate-safe path.',
);

need(
  payments.includes(
    'Enable auto-sync from now',
  )
    && payments.includes(
      'Turn off auto-sync',
    )
    && payments.includes(
      'Sync to BajetBN',
    ),
  'Payments UI supports one-time future auto-sync activation while retaining manual historical sync.',
);

need(
  payments.includes(
    'runFuturePaymentAutoSync',
  )
    && payments.includes(
      'snapshot.loadedAt',
    ),
  'Payments Refresh triggers a guarded future-payment auto-sync check.',
);

need(
  home.includes(
    'autoSyncNewAdbnTechPaymentsToBajetBn',
  )
    && home.includes(
      'externalIntegrationPaymentAutoSyncEnabled',
    )
    && home.includes(
      'externalIntegrationPaymentAutoSyncCutoffIso',
    ),
  'Business Home checks for new eligible ADBN payments on open/refresh.',
);

need(
  !syncRepo.includes(
    "addDoc(",
  )
    && !syncRepo.includes(
      "setDoc(",
    )
    && !syncRepo.includes(
      "updateDoc(",
    )
    && !syncRepo.includes(
      "deleteDoc(",
    ),
  'Payment auto-sync does not write to the ADBN TECH Firestore project.',
);

for (const forbidden of [
  'addDoc(',
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
]) {
  need(
    !adbnRepo.includes(forbidden),
    `ADBN TECH mirror repository stays read-only: ${forbidden}`,
  );
}

console.log(
  `ADBN TECH future payment auto-sync verification PASS (${checks.length} checks).`,
);
