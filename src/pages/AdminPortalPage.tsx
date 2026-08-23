import { PageHeader } from '../components/PageHeader';
import { BAJETBN_SUBSCRIPTION_ADMIN_EMAIL } from '../config/subscription';
import { useAuth } from '../contexts/AuthContext';
import { BASIC_PLAN_LIMITS } from '../services/entitlements';

export function AdminPortalPage() {
  const { profile } = useAuth();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="BajetBN Platform Admin"
        title="Admin Portal"
        description="Manage BajetBN users and subscriptions."
      />

      <section className="card stack">
        <span className="eyebrow">Administrator</span>
        <h2>{profile?.email || 'Platform administrator'}</h2>

        <p>
          Subscription administrator:{' '}
          <strong>
            {BAJETBN_SUBSCRIPTION_ADMIN_EMAIL}
          </strong>
        </p>

        <p>
          Secure activation, renewal and expiry controls
          are connected in the next backend slice.
        </p>
      </section>

      <section className="card stack">
        <span className="eyebrow">Basic plan</span>
        <h2>Default limits</h2>

        <ul>
          <li>1 Household Space</li>
          <li>1 Trip Space</li>
          <li>1 SME Space</li>
          <li>{BASIC_PLAN_LIMITS.smeInventoryItems} SME inventory items</li>
          <li>{BASIC_PLAN_LIMITS.smeCustomers} SME customers</li>
          <li>{BASIC_PLAN_LIMITS.smeSellers} SME sellers</li>
          <li>
            Owner + {BASIC_PLAN_LIMITS.smeAdditionalMembers}
            {' '}additional SME member
          </li>
        </ul>
      </section>
    </div>
  );
}
