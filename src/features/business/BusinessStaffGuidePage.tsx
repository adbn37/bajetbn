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
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

const sections = [
  {
    title:
      '1. Start the shift',
    items: [
      'Open the correct SME Space before doing any business work.',
      'Open POS & Operations and confirm you are working in the correct business.',
      'Review Tasks, Purchase List and anything that needs attention.',
      'Confirm the correct Business Account is being used for collections.',
    ],
  },

  {
    title:
      '2. Register inventory',
    items: [
      'Use Register Item / Existing Stock for stock that does not come from a purchase record.',
      'Enter a clear item name, quantity and selling price.',
      'Add optional cost price when profit tracking is needed.',
      'Keep one clear item photo where the inventory flow supports it.',
      'For consignment stock, select the correct seller before saving.',
    ],
  },

  {
    title:
      '3. Barcode workflow',
    items: [
      'Scan the manufacturer barcode when the item already has one.',
      'If no barcode exists, save an internal SKU or barcode for future scanning.',
      'Test the barcode after registration so staff can find the correct item quickly.',
      'Do not reuse the same barcode for unrelated products.',
    ],
  },

  {
    title:
      '4. Checkout and sales',
    items: [
      'Scan or select the correct product.',
      'Confirm item quantity and selling price before completing checkout.',
      'Select the correct Business Account and payment method.',
      'Add the customer when customer history or follow-up is required.',
      'Complete the sale only after the payment amount has been checked.',
    ],
  },

  {
    title:
      '5. Returns and corrections',
    items: [
      'Open the original sale before processing a return.',
      'Return only the quantity actually received back.',
      'Use the proper return or void action instead of creating a fake negative sale.',
      'Confirm the refund destination and reason.',
      'Check that stock and seller commission are updated correctly after the return.',
    ],
  },

  {
    title:
      '6. Marketplace and seller stock',
    items: [
      'Attach consignment inventory to the correct seller.',
      'Confirm percentage or fixed commission before the item is sold.',
      'Use the seller payout workflow for amounts owed to sellers.',
      'Archive or deactivate seller records when appropriate instead of deleting financial history.',
    ],
  },

  {
    title:
      '7. Daily close',
    items: [
      'Review the day’s completed sales and returns.',
      'Compare business cash or bank collections with the Business Account in BajetBN.',
      'Review low stock and Purchase List items.',
      'Review unfinished Tasks.',
      'Report a mismatch before more transactions are added.',
    ],
  },
];

export function BusinessStaffGuidePage() {
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

            if (active) {
              setSpace(
                nextSpace,
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
          Loading Staff Operations Guide...
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
          eyebrow="Staff operations"
          title="SME Space not found"
          description="Open an SME Space to view its staff operations guide."
        />
      </main>
    );
  }

  return (
    <main
      className="page"
      data-business-staff-guide
    >
      <PageHeader
        eyebrow="Staff Operations Guide"
        title={space.name}
        description="Practical instructions for POS, inventory, barcode, sales, returns and daily business operations."
        action={
          <Link
            className="button primary"
            to={`/spaces/${space.id}/pos`}
          >
            Open POS & Operations
          </Link>
        }
      />

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="notice">
        Always confirm that you are inside the correct Business Space.
        Sales, stock, tasks and business money should stay attached to this SME.
      </div>

      {sections.map(
        (section) => (
          <section
            className="panel"
            key={section.title}
          >
            <h2>
              {section.title}
            </h2>

            <div className="business-contact-list">
              {section.items.map(
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
        ),
      )}

      <section className="panel">
        <span className="eyebrow">
          Quick access
        </span>

        <h2>
          Continue working
        </h2>

        <div className="button-row">
          <Link
            className="button primary"
            to={`/spaces/${space.id}/pos`}
          >
            POS & Inventory
          </Link>

          <Link
            className="button secondary"
            to={`/spaces/${space.id}/business/industry`}
          >
            Business Workflow
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