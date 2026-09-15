import {
  httpsCallable,
} from 'firebase/functions';

import {
  requireFirebase,
} from '../services/firebase';

import type {
  BusinessPrivateDocument,
  BusinessPrivateDocumentType,
} from '../types/models';

export async function listBusinessPrivateDocuments(
  spaceId: string,
  type?: BusinessPrivateDocumentType,
): Promise<BusinessPrivateDocument[]> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'listBusinessPrivateDocuments',
    );

  const result =
    await call({
      spaceId,
      type:
        type || null,
    });

  return (
    (
      result.data as {
        documents?:
          BusinessPrivateDocument[];
      }
    ).documents
    || []
  );
}

export async function issuePayslipDocument(
  spaceId: string,
  payrollRunId: string,
): Promise<{
  documentId: string;
  existing: boolean;
}> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'issuePayslipDocument',
    );

  const result =
    await call({
      spaceId,
      payrollRunId,
    });

  return result.data as {
    documentId: string;
    existing: boolean;
  };
}

export async function getBusinessPrivateDocument(
  documentId: string,
): Promise<BusinessPrivateDocument> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'getBusinessPrivateDocument',
    );

  const result =
    await call({
      documentId,
    });

  return (
    result.data as {
      document:
        BusinessPrivateDocument;
    }
  ).document;
}

export async function markBusinessPrivateDocumentShared(
  documentId: string,
  channel:
    | 'whatsapp'
    | 'copy_link',
): Promise<void> {
  const {
    functions,
  } = requireFirebase();

  const call =
    httpsCallable(
      functions,
      'markBusinessPrivateDocumentShared',
    );

  await call({
    documentId,
    channel,
  });
}
