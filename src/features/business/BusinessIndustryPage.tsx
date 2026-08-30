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
  getBusinessProfile,
} from '../../repositories/businessAdvancedRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  BusinessIndustry,
  BusinessProfile,
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

interface IndustryWorkflow {
  label: string;
  headline: string;
  description: string;
  priorities: string[];
  daily: string[];
}

const workflows:
  Record<
    BusinessIndustry,
    IndustryWorkflow
  > = {
    general: {
      label:
        'General business',
      headline:
        'Flexible business operations',
      description:
        'A simple workflow for business money, customers, invoices, tasks and purchasing.',
      priorities: [
        'Keep Business Accounts separate from personal money.',
        'Use reusable customer and vendor records.',
        'Record income and expenses inside this SME Space.',
        'Review Accounting regularly.',
      ],
      daily: [
        'Check outstanding tasks and purchases.',
        'Record sales, income and expenses.',
        'Review customer payments and invoices.',
        'Confirm Business Account balances.',
      ],
    },

    retail: {
      label:
        'Retail / shop',
      headline:
        'Stock, checkout and daily sales',
      description:
        'Prioritise POS, barcode inventory, stock control, checkout and daily reconciliation.',
      priorities: [
        'Register products with a clear item name and barcode when available.',
        'Use POS for checkout so sales and stock stay connected.',
        'Maintain selling price, cost price and quantity accurately.',
        'Review low-stock items before they run out.',
      ],
      daily: [
        'Check stock and low-stock items.',
        'Use POS for every checkout.',
        'Process returns from the original sale.',
        'Compare daily sales with the Business Account.',
      ],
    },

    service: {
      label:
        'Service business',
      headline:
        'Customers, jobs and invoicing',
      description:
        'Prioritise customer records, tasks, invoices, payments and operating expenses.',
      priorities: [
        'Create reusable customer records.',
        'Use Space Tasks for active jobs or work orders.',
        'Create invoices for billable work.',
        'Record invoice payments into the correct Business Account.',
      ],
      daily: [
        'Review active jobs and due tasks.',
        'Update customer information when needed.',
        'Issue invoices for completed work.',
        'Check overdue or unpaid invoices.',
      ],
    },

    marketplace: {
      label:
        'Marketplace / consignment',
      headline:
        'Seller inventory and payouts',
      description:
        'Prioritise seller-linked inventory, commission, checkout, returns and payout history.',
      priorities: [
        'Attach consignment stock to the correct seller.',
        'Confirm commission before selling the item.',
        'Use POS so seller earnings remain traceable.',
        'Use seller payout records instead of informal balance changes.',
      ],
      daily: [
        'Check seller-linked stock.',
        'Confirm commission before checkout.',
        'Review returns and seller adjustments.',
        'Review seller balances before payouts.',
      ],
    },

    rental: {
      label:
        'Rental business',
      headline:
        'Customers, rental collections and follow-up',
      description:
        'Use customer records, tasks, invoices and business accounting to manage rental activity.',
      priorities: [
        'Keep renter details reusable.',
        'Use tasks for handover, collection and follow-up.',
        'Use invoices for rental charges when appropriate.',
        'Record payments and operating costs in this SME Space.',
      ],
      daily: [
        'Review upcoming rental tasks.',
        'Check overdue customer payments.',
        'Record rental-related expenses.',
        'Update completed collections and handovers.',
      ],
    },

    transport_delivery: {
      label:
        'Transport / delivery',
      headline:
        'Jobs, customers and collections',
      description:
        'Use tasks for active jobs, customers for repeat clients, and invoices for completed transport or delivery work.',
      priorities: [
        'Use Space Tasks for jobs and deliveries.',
        'Keep repeat client details in Business Admin.',
        'Record collections into the correct Business Account.',
        'Track fuel and operating costs as business expenses.',
      ],
      daily: [
        'Review today’s jobs and assignments.',
        'Confirm completed deliveries.',
        'Record customer collections.',
        'Record fuel and operating expenses.',
      ],
    },

    other: {
      label:
        'Other business',
      headline:
        'Build around your actual operation',
      description:
        'Start with the core business tools, then use the workflows that match how the business actually runs.',
      priorities: [
        'Keep business money inside this SME Space.',
        'Use customer and vendor records when repeat contact matters.',
        'Use tasks and purchase lists for operational work.',
        'Review Accounting before adding unnecessary process.',
      ],
      daily: [
        'Review unfinished work.',
        'Record business money activity.',
        'Check invoices and customer payments.',
        'Review Business Account balances.',
      ],
    },
  };

export function BusinessIndustryPage() {
  const {
    spaceId = '',
  } = useParams();

  const [
    space,
    setSpace,
  ] = useState<Space | null>(
    null,
  );

  const [
    profile,
    setProfile,
  ] = useState<BusinessProfile | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  useEffect(
    () => {
      let active = true;

      void (
        async () => {
          if (!spaceId) {
            setLoading(false);
            return;
          }

          setLoading(true);
          setError('');

          try {
            const nextSpace =
              await getSpace(
                spaceId,
              );

            if (!active) {
              return;
            }

            setSpace(
              nextSpace,
            );

            if (
              !nextSpace
              || nextSpace.type !== 'sme'
            ) {
              return;
            }

            const nextProfile =
              await getBusinessProfile(
                spaceId,
              );

            if (active) {
              setProfile(
                nextProfile,
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
        }
      )();

      return () => {
        active = false;
      };
    },
    [
      spaceId,
    ],
  );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading business workflow...
        </div>
      </main>
    );
  }

  if (
    !space
    || space.type !== 'sme'
  ) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="Business workflow"
          title="SME Space not found"
          description="Open an SME Space to view its business workflow."
        />
      </main>
    );
  }

  const industry =
    profile?.industry
    || 'general';

  const workflow =
    workflows[industry];

  return (
    <main
      className="page"
      data-business-industry-profile
    >
      <PageHeader
        eyebrow="Industry workflow"
        title={workflow.label}
        description={workflow.description}
        action={
          <Link
            className="button secondary"
            to={`/spaces/${space.id}`}
          >
            Back to Business
          </Link>
        }
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      {!profile && (
        <div className="notice warning">
          The Business Profile has not been configured yet.
          BajetBN is showing the General business workflow.
        </div>
      )}

      <section className="panel">
        <span className="eyebrow">
          Recommended setup
        </span>

        <h2>
          {workflow.headline}
        </h2>

        <div className="business-contact-list">
          {workflow.priorities.map(
            (
              priority,
              index,
            ) => (
              <article
                className="business-contact-card"
                key={priority}
              >
                <div>
                  <small>
                    Priority {index + 1}
                  </small>

                  <h3>
                    {priority}
                  </h3>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">
          Daily routine
        </span>

        <h2>
          Suggested operating checklist
        </h2>

        <div className="business-contact-list">
          {workflow.daily.map(
            (
              item,
              index,
            ) => (
              <article
                className="business-contact-card"
                key={item}
              >
                <div>
                  <small>
                    Step {index + 1}
                  </small>

                  <h3>
                    {item}
                  </h3>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">
          Business tools
        </span>

        <h2>
          Open the tool you need
        </h2>

        <div className="button-row">
          <Link
            className="button primary"
            to={`/spaces/${space.id}/pos`}
          >
            POS & Operations
          </Link>

          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business/invoices`}
          >
            Invoices
          </Link>

          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business/guide`}
          >
            Staff Guide
          </Link>

          <Link
            className="button secondary"
            to={`/spaces/${space.id}`}
          >
            Tasks & Purchase List
          </Link>
        </div>
      </section>
    </main>
  );
}