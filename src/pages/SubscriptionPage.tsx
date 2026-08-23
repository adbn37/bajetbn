import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  BAJETBN_BASIC_SPACE_SUMMARY,
  BAJETBN_PLUS_PRICES,
  BAJETBN_WHATSAPP_NUMBER,
} from '../config/subscription';
import { useAuth } from '../contexts/AuthContext';
import { getEntitlements } from '../services/entitlements';

function formatExpiry(
  value: { toDate(): Date } | null | undefined,
): string {
  if (!value) return 'Not set';

  return new Intl.DateTimeFormat('en-BN', {
    dateStyle: 'long',
    timeZone: 'Asia/Brunei',
  }).format(value.toDate());
}

function subscribeViaWhatsApp(
  email: string,
  plan: string,
  amountBnd: number,
): boolean {
  if (!BAJETBN_WHATSAPP_NUMBER) {
    return false;
  }

  const reference =
    `BBN-${new Date()
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '')}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

  const message = [
    'Hi BajetBN, I would like to subscribe to BajetBN Plus.',
    '',
    `Account: ${email}`,
    `Plan: ${plan}`,
    `Amount: BND ${amountBnd.toFixed(2)}`,
    `Reference: ${reference}`,
  ].join('\n');

  window.open(
    `https://wa.me/${BAJETBN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer',
  );

  return true;
}

export function SubscriptionPage() {
  const { profile, user } = useAuth();
  const entitlement = getEntitlements(profile);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="BajetBN"
        title="Subscription"
        description="Basic stays free forever. Plus expands your Spaces, collaboration, SME capacity, storage and advanced tools."
      />

      <section className="card stack">
        <span className="eyebrow">Current plan</span>

        <h2>
          {entitlement.plusActive
            ? 'BajetBN Plus'
            : 'BajetBN Basic'}
        </h2>

        {entitlement.plusActive && (
          <p>
            Plus expires:{' '}
            <strong>
              {formatExpiry(profile?.subscriptionExpiresAt)}
            </strong>
          </p>
        )}

        {entitlement.expired && (
          <p>
            Your Plus subscription has ended.
            Your existing information is safe and your
            account is now using Basic access.
          </p>
        )}
      </section>

      <section className="card stack">
        <span className="eyebrow">Free forever</span>
        <h2>BajetBN Basic</h2>

        <ul>
          {BAJETBN_BASIC_SPACE_SUMMARY.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>Basic SME POS</li>
          <li>Up to 20 SME inventory items</li>
          <li>Up to 10 SME customers</li>
          <li>Up to 3 SME sellers</li>
          <li>Owner + 1 additional SME member</li>
          <li>Up to 2 personal accounts</li>
          <li>Existing Plus information stays safe if you return to Basic</li>
        </ul>
      </section>

      <section className="card stack">
        <span className="eyebrow">Full access</span>
        <h2>BajetBN Plus</h2>

        <p>
          Expand Space limits, SME capacity, collaboration,
          advanced reports and automation, plus additional
          storage and personalization. Your existing data is never
          deleted if Plus later expires.
        </p>

        {Object.values(BAJETBN_PLUS_PRICES).map((plan) => (
          <div className="card" key={plan.label}>
            <strong>{plan.label}</strong>
            <p>BND {plan.amountBnd.toFixed(2)}</p>

            <button
              type="button"
              className="primary"
              onClick={() => {
                setSubscriptionMessage('');

                const opened = subscribeViaWhatsApp(
                  profile?.email || user?.email || '',
                  plan.label,
                  plan.amountBnd,
                );

                if (!opened) {
                  setSubscriptionMessage(
                    'Subscription WhatsApp is not configured yet. Please try again later.',
                  );
                }
              }}
            >
              Subscribe via WhatsApp
            </button>
          </div>
        ))}

        {subscriptionMessage && (
          <p role="status" className="muted">
            {subscriptionMessage}
          </p>
        )}
      </section>
    </div>
  );
}
