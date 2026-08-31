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

interface IndustryTool {
  label: string;
  to: string;
  primary?: boolean;
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
        'Record income and expenses inside this Business Space.',
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
        'Renters, collections and day-to-day rental operations',
      description:
        'Manage renter records, rent collections, Business Accounts, accounting and rental activity without forcing a POS workflow.',
      priorities: [
        'Keep renter details reusable.',
        'Use tasks for handover, maintenance, collection and follow-up.',
        'Use invoices for rental charges when appropriate.',
        'Record payments and operating costs in this Business Space.',
      ],
      daily: [
        'Review upcoming rental tasks.',
        'Check overdue rent and outstanding collections.',
        'Record rental-related expenses.',
        'Update completed collections, maintenance and handovers.',
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
        'Keep business money inside this Business Space.',
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

function getIndustryTools(
  industry: BusinessIndustry,
  spaceId: string,
): IndustryTool[] {
  const home =
    '/spaces/' + spaceId;

  const admin =
    home + '/business';

  const invoices =
    home + '/business/invoices';

  const accounting =
    home + '/business/accounting';

  const accounts =
    home + '?section=accounts';

  const activity =
    home + '?tab=activity';

  switch (industry) {
    case 'retail':
      return [
        {
          label: 'POS & Operations',
          to: home + '/pos',
          primary: true,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Customers & Admin',
          to: admin,
        },
        {
          label: 'Accounting',
          to: accounting,
        },
        {
          label: 'Activity',
          to: activity,
        },
        {
          label: 'Staff Guide',
          to: home + '/business/guide',
        },
      ];

    case 'marketplace':
      return [
        {
          label: 'POS & Marketplace',
          to: home + '/pos',
          primary: true,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Customers & Admin',
          to: admin,
        },
        {
          label: 'Accounting',
          to: accounting,
        },
        {
          label: 'Activity',
          to: activity,
        },
        {
          label: 'Staff Guide',
          to: home + '/business/guide',
        },
      ];

    case 'service':
      return [
        {
          label: 'Invoices & Collections',
          to: invoices,
          primary: true,
        },
        {
          label: 'Customers & Admin',
          to: admin,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Accounting',
          to: accounting,
        },
        {
          label: 'Activity',
          to: activity,
        },
      ];

    case 'rental':
      return [
        {
          label: 'Rent & Collections',
          to: invoices,
          primary: true,
        },
        {
          label: 'Renters & Admin',
          to: admin,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Rental Accounting',
          to: accounting,
        },
        {
          label: 'Rental Activity',
          to: activity,
        },
      ];

    case 'transport_delivery':
      return [
        {
          label: 'Invoices & Collections',
          to: invoices,
          primary: true,
        },
        {
          label: 'Customers & Admin',
          to: admin,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Accounting',
          to: accounting,
        },
        {
          label: 'Delivery Activity',
          to: activity,
        },
      ];

    case 'general':
    case 'other':
    default:
      return [
        {
          label: 'Business Admin',
          to: admin,
          primary: true,
        },
        {
          label: 'Invoices & Collections',
          to: invoices,
        },
        {
          label: 'Business Accounts',
          to: accounts,
        },
        {
          label: 'Accounting',
          to: accounting,
        },
        {
          label: 'Activity',
          to: activity,
        },
      ];
  }
}

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
          title="Business Space not found"
          description="Open an Business Space to view its business workflow."
        />
      </main>
    );
  }

  const industry =
    profile?.industry
    || 'general';

  const workflow =
    workflows[industry];

  const tools =
    getIndustryTools(
      industry,
      space.id,
    );

  const isRental =
    industry === 'rental';

  return (
    <main
      className="page"
      data-business-industry-profile
    >
      <PageHeader
        eyebrow={
          isRental
            ? 'Rental operations'
            : 'Industry operations'
        }
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

      {isRental && (
        <section
          className="panel"
          data-rental-operations
        >
          <span className="eyebrow">
            Rental operations
          </span>

          <h2>
            Run the rental from here
          </h2>

          <p>
            POS and inventory tools stay out of the Rental
            workflow. Use the tools that are actually connected
            to this Business Space.
          </p>

          <div className="button-row">
            {tools.map(
              (tool) => (
                <Link
                  key={tool.label}
                  className={
                    'button '
                    + (
                      tool.primary
                        ? 'primary'
                        : 'secondary'
                    )
                  }
                  to={tool.to}
                >
                  {tool.label}
                </Link>
              ),
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <span className="eyebrow">
          {isRental
            ? 'Rental setup tips'
            : 'Recommended setup'}
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
          {isRental
            ? 'Rental routine'
            : 'Daily routine'}
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

      {!isRental && (
        <section className="panel">
          <span className="eyebrow">
            Business tools
          </span>

          <h2>
            Open the tool you need
          </h2>

          <div className="button-row">
            {tools.map(
              (tool) => (
                <Link
                  key={tool.label}
                  className={
                    'button '
                    + (
                      tool.primary
                        ? 'primary'
                        : 'secondary'
                    )
                  }
                  to={tool.to}
                >
                  {tool.label}
                </Link>
              ),
            )}
          </div>
        </section>
      )}
    </main>
  );
}