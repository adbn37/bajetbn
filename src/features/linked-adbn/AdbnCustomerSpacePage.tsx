import {
  useCallback,
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
  useAuth,
} from '../../contexts/AuthContext';

import {
  listMyAdbnCustomerLinks,
  type AdbnCustomerLink,
} from '../../repositories/adbnCustomerLinkRepository';

import {
  getSpace,
} from '../../repositories/spaceRepository';

import type {
  Space,
} from '../../types/models';

import {
  getErrorMessage,
} from '../../utils/errors';

export function AdbnCustomerSpacePage() {
  const { user } = useAuth();
  const { spaceId = '' } = useParams();

  const [space, setSpace] =
    useState<Space | null>(null);

  const [link, setLink] =
    useState<AdbnCustomerLink | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load =
    useCallback(
      async () => {
        if (!user || !spaceId) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError('');

        try {
          const [
            nextSpace,
            links,
          ] =
            await Promise.all([
              getSpace(spaceId),
              listMyAdbnCustomerLinks(),
            ]);

          setSpace(nextSpace);

          setLink(
            links.find(
              (item) =>
                item.status === 'accepted'
                && item.targetSpaceId === spaceId,
            )
            || null,
          );
        } catch (nextError) {
          setError(
            getErrorMessage(
              nextError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [spaceId, user],
    );

  useEffect(
    () => {
      void load();
    },
    [load],
  );

  if (loading) {
    return (
      <main className="page">
        <div className="loading-panel">
          Loading ADBN TECH Space…
        </div>
      </main>
    );
  }

  const validSpace =
    Boolean(
      space
      && user
      && space.ownerId === user.uid
      && space.type === 'custom'
      && space.externalIntegrationProvider
        === 'adbn_tech'
      && space.externalIntegrationRole
        === 'customer',
    );

  if (!validSpace) {
    return (
      <main className="page">
        <PageHeader
          eyebrow="ADBN TECH"
          title="ADBN TECH Space unavailable"
          description="This Space is not linked to your ADBN TECH customer account."
        />

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <Link
          className="button primary"
          to="/adbn-links"
        >
          Customer links
        </Link>
      </main>
    );
  }

  return (
    <main
      className="page"
      data-adbn-customer-space
    >
      <PageHeader
        eyebrow="ADBN TECH"
        title="ADBN TECH"
        description="Your private ADBN TECH customer portal in BajetBN."
        action={
          <Link
            className="button secondary"
            to="/adbn-links"
          >
            Customer link
          </Link>
        }
      />

      <div className="info-banner">
        <strong>
          Separate from your Personal money.
        </strong>
        <span>
          This dedicated Space is only for your ADBN TECH relationship. ADBN TECH cannot view your other BajetBN Spaces, bank accounts, balances or transactions.
        </span>
      </div>

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <div className="summary-grid">
        <article className="summary-card featured">
          <span>Customer</span>
          <strong>
            {link?.customerName
              || space?.externalIntegrationCustomerName
              || 'ADBN customer'}
          </strong>
          <small>
            {link?.customerNo
              || space?.externalIntegrationCustomerNo
              || 'Connected'}
          </small>
        </article>

        <article className="summary-card">
          <span>Connection</span>
          <strong>Connected</strong>
          <small>
            Secure ADBN TECH customer link
          </small>
        </article>

        <article className="summary-card">
          <span>Billing sync</span>
          <strong>Next slice</strong>
          <small>
            Monthly plans and balances are not copied yet
          </small>
        </article>
      </div>

      <section
        className="panel"
        data-adbn-customer-space-billing-placeholder
      >
        <span className="eyebrow">
          Monthly payments
        </span>

        <h2>
          Your ADBN TECH Space is ready
        </h2>

        <p className="muted">
          The next integration slice will sync your ADBN TECH monthly-payment plan, outstanding balance, next due date, payment history and Bills & Instalments into this Space. ADBN TECH remains the source of truth.
        </p>

        <div className="modal-actions">
          <Link
            className="button secondary"
            to="/bills"
          >
            Bills & Instalments
          </Link>

          <Link
            className="button primary"
            to="/adbn-links"
          >
            View connection
          </Link>
        </div>
      </section>
    </main>
  );
}
