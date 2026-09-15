import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  PageHeader,
} from '../../components/PageHeader';

import {
  getBusinessPrivateDocument,
  markBusinessPrivateDocumentShared,
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

function whatsappPhone(
  value: string,
): string {
  const digits =
    value.replace(
      /[^0-9]/g,
      '',
    );

  if (!digits) {
    return '';
  }

  if (
    digits.startsWith(
      '673',
    )
  ) {
    return digits;
  }

  if (digits.length === 7) {
    return '673' + digits;
  }

  return digits;
}

export function PrivateBusinessDocumentPage() {
  const {
    documentId = '',
  } = useParams();

  const [
    document,
    setDocument,
  ] =
    useState<
      BusinessPrivateDocument
      | null
    >(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(
    () => {
      let active = true;

      const load =
        async () => {
          if (!documentId) {
            setLoading(false);
            return;
          }

          setLoading(true);
          setError('');

          try {
            const nextDocument =
              await getBusinessPrivateDocument(
                documentId,
              );

            if (active) {
              setDocument(
                nextDocument,
              );
            }
          } catch (
            nextError
          ) {
            if (active) {
              setError(
                getErrorMessage(
                  nextError,
                ),
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
    [
      documentId,
    ],
  );

  async function shareWhatsApp() {
    if (
      !document
      || !document.recipientPhone
    ) {
      return;
    }

    const phone =
      whatsappPhone(
        document.recipientPhone,
      );

    if (!phone) {
      return;
    }

    try {
      await markBusinessPrivateDocumentShared(
        document.id,
        'whatsapp',
      );
    } catch {
      // Sharing can still continue if audit recording
      // is temporarily unavailable.
    }

    const link =
      window.location.origin
      + '/documents/'
      + document.id;

    const message =
      [
        'Payslip from '
          + document.businessName,
        '',
        'Period: '
          + document.period,
        'Net pay: '
          + money(
              document.amountMinor,
              document.currency,
            ),
        '',
        'Private BajetBN document:',
        link,
        '',
        'Sign in to your authorised BajetBN account to view it.',
      ].join(
        '\n',
      );

    window.open(
      'https://wa.me/'
        + phone
        + '?text='
        + encodeURIComponent(
            message,
          ),
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function copyPrivateLink() {
    if (!document) {
      return;
    }

    const link =
      window.location.origin
      + '/documents/'
      + document.id;

    await navigator.clipboard.writeText(
      link,
    );

    try {
      await markBusinessPrivateDocumentShared(
        document.id,
        'copy_link',
      );
    } catch {
      // Link copy already succeeded.
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading private document...
        </div>
      </main>
    );
  }

  if (
    error
    || !document
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Private document"
          title="Document unavailable"
          description="This document does not exist or your account is not authorised to view it."
        />

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <Link
          className="button secondary"
          to="/"
        >
          Back to BajetBN
        </Link>
      </main>
    );
  }

  if (
    document.type !== 'payslip'
    || !document.payslip
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Private document"
          title={document.title}
          description="This protected document type is not available in this viewer yet."
        />
      </main>
    );
  }

  const payslip =
    document.payslip;

  return (
    <main
      className="page"
      data-private-business-document
    >
      <PageHeader
        eyebrow="Private BajetBN document"
        title={document.title}
        description="Only the authorised recipient, Business Owner, or an explicitly authorised Business Manager can view this document."
        action={
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={
                () =>
                  window.print()
              }
            >
              Print / Save PDF
            </button>

            {document.recipientPhone && (
              <button
                type="button"
                className="button secondary"
                onClick={
                  () =>
                    void shareWhatsApp()
                }
              >
                WhatsApp
              </button>
            )}

            <button
              type="button"
              className="button secondary"
              onClick={
                () =>
                  void copyPrivateLink()
              }
            >
              Copy Private Link
            </button>
          </div>
        }
      />

      {document.status !== 'issued' && (
        <div className="notice">
          Document status:{' '}
          <strong>
            {document.status}
          </strong>
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Payslip
            </span>

            <h2>
              {document.businessName}
            </h2>

            <p>
              {document.businessAddress
                || 'Business address not provided'}
            </p>
          </div>

          <div>
            <strong>
              {document.displayId}
            </strong>

            <p>
              Period{' '}
              {document.period}
            </p>
          </div>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>
              Employee
            </span>

            <strong>
              {payslip.employeeName}
            </strong>

            <small>
              {payslip.employeeNumber
                || 'No employee number'}
            </small>
          </article>

          <article className="summary-card">
            <span>
              Position
            </span>

            <strong>
              {payslip.roleTitle
                || 'Employee'}
            </strong>

            <small>
              Paid{' '}
              {payslip.paymentDate}
            </small>
          </article>

          <article className="summary-card featured">
            <span>
              Net pay
            </span>

            <strong>
              {money(
                payslip.netMinor,
                document.currency,
              )}
            </strong>

            <small>
              {payslip.paymentMethod}
            </small>
          </article>
        </div>

        <div className="business-contact-list">
          <article className="business-contact-card">
            <div>
              <small>
                Earnings
              </small>

              <h3>
                Salary
              </h3>
            </div>

            <strong>
              {money(
                payslip.salaryMinor,
                document.currency,
              )}
            </strong>
          </article>

          <article className="business-contact-card">
            <div>
              <small>
                Earnings
              </small>

              <h3>
                Allowance
              </h3>
            </div>

            <strong>
              {money(
                payslip.allowanceMinor,
                document.currency,
              )}
            </strong>
          </article>

          <article className="business-contact-card">
            <div>
              <small>
                Earnings
              </small>

              <h3>
                Overtime
              </h3>
            </div>

            <strong>
              {money(
                payslip.overtimeMinor,
                document.currency,
              )}
            </strong>
          </article>

          <article className="business-contact-card">
            <div>
              <small>
                Earnings
              </small>

              <h3>
                Bonus
              </h3>
            </div>

            <strong>
              {money(
                payslip.bonusMinor,
                document.currency,
              )}
            </strong>
          </article>

          <article className="business-contact-card">
            <div>
              <small>
                Deduction
              </small>

              <h3>
                Total deductions
              </h3>
            </div>

            <strong>
              {money(
                payslip.deductionsMinor,
                document.currency,
              )}
            </strong>
          </article>
        </div>

        <div className="notice">
          <strong>
            Payment reference
          </strong>

          <span>
            {payslip.paymentReference
              || 'No reference recorded'}
          </span>
        </div>

        {payslip.note && (
          <div className="notice">
            <strong>
              Note
            </strong>

            <span>
              {payslip.note}
            </span>
          </div>
        )}
      </section>

      <div className="notice">
        This is an immutable private BajetBN document snapshot.
        Use Print / Save PDF if you need a PDF copy.
      </div>
    </main>
  );
}
