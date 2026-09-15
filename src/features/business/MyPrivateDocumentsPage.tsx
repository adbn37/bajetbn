import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  listMyPrivateDocuments,
} from '../../repositories/privateDocumentRepository';

import type {
  BusinessPrivateDocument,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

function money(
  amountMinor: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    'en-BN',
    {
      style: 'currency',
      currency,
    },
  ).format(
    amountMinor / 100,
  );
}

export function MyPrivateDocumentsPage() {
  const [documents, setDocuments] =
    useState<BusinessPrivateDocument[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(
    () => {
      let active = true;

      const load = async () => {
        setLoading(true);
        setError('');

        try {
          const next =
            await listMyPrivateDocuments();

          if (active) {
            setDocuments(next);
          }
        } catch (nextError) {
          if (active) {
            setError(
              getErrorMessage(nextError),
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void load();

      return () => {
        active = false;
      };
    },
    [],
  );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading private documents...
        </div>
      </main>
    );
  }

  return (
    <main
      className="page"
      data-my-private-documents
    >
      <PageHeader
        eyebrow="Private documents"
        title="My Documents"
        description="Payslips and other confidential documents linked specifically to your BajetBN account."
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="mini-empty">
          <h3>
            No private documents yet
          </h3>

          <p>
            A linked payslip or seller payout statement will appear here when it is issued to your BajetBN account.
          </p>
        </div>
      ) : (
        <div className="business-contact-list">
          {documents.map(
            (document) => (
              <article
                className="business-contact-card"
                key={document.id}
              >
                <div>
                  <small>
                    {document.type === 'payslip'
                      ? 'Payslip'
                      : 'Seller payout statement'}
                    {' · '}
                    {document.period}
                  </small>

                  <h3>
                    {document.title}
                  </h3>

                  <p>
                    {document.businessName}
                  </p>

                  <strong>
                    {money(
                      document.amountMinor,
                      document.currency,
                    )}
                  </strong>
                </div>

                <Link
                  className="button secondary"
                  to={'/documents/' + document.id}
                >
                  Open
                </Link>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}
