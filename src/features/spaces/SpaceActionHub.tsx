import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import { listAccounts } from '../../repositories/accountRepository';
import { getBusinessProfile } from '../../repositories/businessAdvancedRepository';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { postTransaction } from '../../repositories/transactionRepository';
import type {
  Account,
  BusinessIndustry,
  SmePosRole,
  Space,
  SpaceMember,
  TransactionCategory,
} from '../../types/models';
import { getSpaceHomeExperience } from './spaceExperience';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';
import { CollaborationPage } from '../collaboration/CollaborationPage';
import { MoneyActivityModal } from '../transactions/TransactionsPage';
import { SharedExpensesPanel } from './SharedExpensesPanel';
import { SpaceFundPanel } from './SpaceFundPanel';
import { TripPlanningPanel } from './TripPlanningPanel';
import { SpaceWorkPanel } from './SpaceWorkPanel';

type SpaceTool =
  | 'fund'
  | 'expenses'
  | 'balances'
  | 'bills'
  | 'trip_planning'
  | 'tasks'
  | 'shopping';

const shortcutGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
  gap: '0.5rem',
};

const shortcutStyle: CSSProperties = {
  minHeight: '48px',
  width: '100%',
  padding: '0.6rem 0.7rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  textAlign: 'left',
};

function ShortcutLink({
  to,
  label,
  badge,
  primary = false,
  onClick,
}: {
  to: string;
  label: string;
  badge?: string | number;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      className={`button ${primary ? 'primary primary-action' : 'secondary'} compact`}
      style={shortcutStyle}
      to={to}
      onClick={onClick}
    >
      <span>{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="type-badge">{badge}</span>
      )}
    </Link>
  );
}

function ShortcutButton({
  label,
  badge,
  primary = false,
  onClick,
}: {
  label: string;
  badge?: string | number;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`button ${primary ? 'primary primary-action' : 'secondary'} compact`}
      style={shortcutStyle}
      onClick={onClick}
    >
      <span>{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="type-badge">{badge}</span>
      )}
    </button>
  );
}

function smePosLabel(role: SmePosRole | null) {
  if (role === 'cashier') return 'Open POS';
  if (role === 'stock_staff') return 'Inventory / POS';
  if (role === 'seller') return 'Seller / POS';
  if (role === 'viewer') return 'View POS';
  return 'POS & Operations';
}

export function SpaceActionHub({
  space,
  members,
  currentMember,
  supportsGroupFund,
  fundLabel,
  smePosRole = null,
  canViewSmeFinancials = false,
  onRefresh,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  supportsGroupFund: boolean;
  fundLabel: string;
  smePosRole?: SmePosRole | null;
  canViewSmeFinancials?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { user, profile } = useAuth();
  const { online } = useOfflineSync();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customCategories, setCustomCategories] = useState<TransactionCategory[]>([]);
  const [moneyType, setMoneyType] = useState<'income' | 'expense' | null>(null);
  const [tool, setTool] = useState<SpaceTool | null>(null);
  const [spaceMoreOpen, setSpaceMoreOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [businessIndustry, setBusinessIndustry] =
    useState<BusinessIndustry>('general');

  useEffect(() => {
    if (space.type !== 'sme') {
      return;
    }

    let active = true;

    void getBusinessProfile(space.id)
      .then((nextProfile) => {
        if (active) {
          setBusinessIndustry(
            nextProfile?.industry
            || 'general',
          );
        }
      })
      .catch(() => {
        if (active) {
          setBusinessIndustry(
            'general',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [space.id, space.type]);

  const loadMoneyOptions = useCallback(async () => {
    if (!user || space.type === 'sme') return;

    try {
      const [nextAccounts, nextCategories] = await Promise.all([
        listAccounts(user.uid),
        listAllCustomCategories(user.uid),
      ]);

      setAccounts(
        nextAccounts.filter((item) => !item.archivedAt && !item.closedAt),
      );
      setCustomCategories(nextCategories);
      setError('');
    } catch {
      setError(
        'Money shortcuts could not load your accounts or categories. Other Space tools are still available.',
      );
    }
  }, [space.type, user]);

  async function openMoney(
    type: 'income' | 'expense',
  ) {
    await loadMoneyOptions();
    setMoneyType(type);
  }

  const allCategories = useMemo(
    () => [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...customCategories.filter((item) => !item.archivedAt),
    ],
    [customCategories],
  );

  async function reloadCategories(): Promise<TransactionCategory[]> {
    if (!user) return allCategories;

    const next = await listAllCustomCategories(user.uid);
    setCustomCategories(next);

    return [
      ...DEFAULT_TRANSACTION_CATEGORIES,
      ...next.filter((item) => !item.archivedAt),
    ];
  }

  const shared = space.type !== 'personal';
  const canManage =
    currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const experience = getSpaceHomeExperience(
    space,
    space.ownerId === user?.uid
      && currentMember
      ? {
          ...currentMember,
          role: 'owner' as const,
        }
      : currentMember,
  );

  const isPrimary = (
    action: 'expense' | 'income' | 'fund' | 'expenses' | 'balances' | 'bills',
  ) => experience.primary === action;

  const toolTitle: Record<SpaceTool, string> = {
    fund: fundLabel,
    expenses: space.type === 'trip' ? 'Trip Expenses' : 'Shared expenses',
    balances: space.type === 'trip' ? 'Settle Up' : 'Settlements',
    bills: 'Shared Bills',
    trip_planning: 'Trip Plan',
    tasks: space.type === 'household' ? 'To-Do' : 'Tasks',
    shopping: space.type === 'sme' ? 'Purchase List' : 'To-Buy',
  };

  const isBusinessOwner =
    space.type === 'sme'
    && space.ownerId === user?.uid;

  const salesFocusedBusiness =
    businessIndustry === 'retail'
    || businessIndustry === 'marketplace';

  const businessWorkflowLabel =
    businessIndustry === 'service'
      ? 'Service Workflow'
      : businessIndustry === 'rental'
        ? 'Rental Workflow'
        : businessIndustry === 'transport_delivery'
          ? 'Delivery Workflow'
          : 'Operations';

  const businessAdminLabel =
    businessIndustry === 'rental'
      ? 'Renters & Admin'
      : 'Customers & Admin';

  const showBusinessInvoices =
    isBusinessOwner
    && (
      businessIndustry === 'service'
      || businessIndustry === 'rental'
      || businessIndustry === 'transport_delivery'
    );

  return (
    <>
      <section
        className="space-action-hub"
        aria-label={`${space.name} shortcuts`}
        style={{ marginBottom: '0.75rem' }}
      >
        <div
          className="space-home-access"
          aria-label="Your access in this Space"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.45rem 0.6rem',
            marginBottom: '0.55rem',
          }}
        >
          <div>
            <span className="muted">Your access</span>{' '}
            <strong>{experience.roleLabel}</strong>
          </div>

          <small className="muted">
            {experience.accessSummary}
          </small>
        </div>

        {feedback && (
          <div className="notice success compact-notice">{feedback}</div>
        )}

        {error && (
          <div className="notice warning compact-notice">{error}</div>
        )}


        {space.type === 'sme' ? (
          <div
            className="space-action-buttons sme-space-actions-v111"
            data-space-launcher="sme"
            data-secondary-label="Business Space tools"
            data-business-industry={businessIndustry}
            style={shortcutGridStyle}
          >
            <ShortcutLink
              to={`/spaces/${space.id}?details=1`}
              label="Business Overview"
              primary
            />

            {salesFocusedBusiness ? (
              <ShortcutLink
                to={`/spaces/${space.id}/pos`}
                label={
                  businessIndustry === 'marketplace'
                    ? 'POS & Marketplace'
                    : smePosLabel(smePosRole)
                }
              />
            ) : (
              <ShortcutLink
                to={`/spaces/${space.id}/business/industry`}
                label={businessWorkflowLabel}
              />
            )}

            {isBusinessOwner && (
              <ShortcutLink
                to={`/spaces/${space.id}?section=accounts`}
                label="Business Accounts"
              />
            )}

            {isBusinessOwner && (
              <ShortcutLink
                to={`/spaces/${space.id}/business`}
                label={businessAdminLabel}
              />
            )}

            {showBusinessInvoices && (
              <ShortcutLink
                to={`/spaces/${space.id}/business/invoices`}
                label={
                  businessIndustry === 'rental'
                    ? 'Rent & Collections'
                    : 'Invoices & Collections'
                }
              />
            )}

            <ShortcutButton
              label="Tasks"
              onClick={() => setTool('tasks')}
            />

            {salesFocusedBusiness && (
              <ShortcutButton
                label="Purchase List"
                onClick={() => setTool('shopping')}
              />
            )}

            <ShortcutLink
              to={`/spaces/${space.id}?tab=activity`}
              label="Activity"
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'trip' ? (
          <div
            className="space-action-buttons trip-space-actions-v111"
            data-space-launcher="trip"
            data-secondary-label="Trip Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Trip Plan"
              primary
              onClick={() => setTool('trip_planning')}
            />

            <ShortcutButton
              label="Trip Fund"
              onClick={() => setTool('fund')}
            />

            <ShortcutButton
              label="Trip Expenses"
              onClick={() => setTool('expenses')}
            />

            <ShortcutButton
              label="Settle Up"
              onClick={() => setTool('balances')}
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'household' ? (
          <div
            className="space-action-buttons household-space-actions-v111"
            data-space-launcher="household"
            data-secondary-label="Household Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Household Fund"
              primary
              onClick={() => setTool('fund')}
            />

            <ShortcutButton
              label="Add Expense"
              onClick={() => void openMoney('expense')}
            />

            <ShortcutButton
              label="To-Do"
              onClick={() => setTool('tasks')}
            />

            <ShortcutButton
              label="To-Buy"
              onClick={() => setTool('shopping')}
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : space.type === 'personal' ? (
          <div
            className="space-action-buttons personal-space-actions-v111"
            data-personal-home-v111
            data-space-launcher="personal"
            data-secondary-label="Personal money tools"
            style={shortcutGridStyle}
          >
            <ShortcutLink
              to={`/spaces/${space.id}?section=accounts`}
              label="Accounts"
              primary
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=income`}
              label="Income"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=expenses`}
              label="Expenses"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=budgets`}
              label="Budget"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=goals`}
              label="Goals"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=bills`}
              label="Bills"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=instalments`}
              label="Instalments"
            />

            <ShortcutLink
              to={`/spaces/${space.id}?section=reports`}
              label="Reports"
            />

            <ShortcutButton
              label="More"
              onClick={() => setSpaceMoreOpen(true)}
            />
          </div>
        ) : (
          <div
            className="space-action-buttons"
            data-secondary-label="More Space tools"
            style={shortcutGridStyle}
          >
            <ShortcutButton
              label="Add Expense"
              primary={isPrimary('expense')}
              onClick={() => void openMoney('expense')}
            />

            <ShortcutButton
              label="Add Income"
              primary={isPrimary('income')}
              onClick={() => void openMoney('income')}
            />

            {shared && supportsGroupFund && (
              <ShortcutButton
                label={fundLabel}
                primary={isPrimary('fund')}
                onClick={() => setTool('fund')}
              />
            )}

            {shared && (
              <>
                <ShortcutButton
                  label="Shared expenses"
                  primary={isPrimary('expenses')}
                  onClick={() => setTool('expenses')}
                />

                <ShortcutButton
                  label="Settlements"
                  primary={isPrimary('balances')}
                  onClick={() => setTool('balances')}
                />

                <ShortcutButton
                  label="Shared Bills"
                  primary={isPrimary('bills')}
                  onClick={() => setTool('bills')}
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=members`}
                  label="Members"
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=chat`}
                  label="Chat"
                />

                <ShortcutLink
                  to={`/spaces/${space.id}?tab=activity`}
                  label="Activity"
                />
              </>
            )}
          </div>
        )}

      </section>


      {spaceMoreOpen && (
        <Modal
          title={`${space.name} — More`}
          onClose={() => setSpaceMoreOpen(false)}
        >
          <div
            className="space-more-sheet-v111"
            data-space-more-v111
          >
            <div className="space-more-context-v111">
              <strong>{space.name}</strong>
              <span>
                These tools belong to this Space.
                Global More remains in the bottom navigation.
              </span>
            </div>

            <div
              className="space-action-buttons space-more-actions-v111"
              style={shortcutGridStyle}
            >
              {space.type === 'personal' && (
                <>
                  <ShortcutLink
                    to={`/spaces/${space.id}?section=money`}
                    label="Money Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=calendar`}
                    label="Calendar"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=settings`}
                    label="Space Settings"
                    onClick={() => setSpaceMoreOpen(false)}
                  />
                </>
              )}

              {space.type === 'household' && (
                <>
                  <ShortcutButton
                    label="Shared Expenses"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('expenses');
                    }}
                  />

                  <ShortcutButton
                    label="Shared Bills"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('bills');
                    }}
                  />

                  <ShortcutButton
                    label="Settlements"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('balances');
                    }}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=budgets`}
                    label="Budget"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=reports`}
                    label="Reports"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?section=calendar`}
                    label="Calendar"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {currentMember?.role === 'owner' && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}

              {space.type === 'trip' && (
                <>
                  <ShortcutLink
                    to={`/spaces/${space.id}?section=budgets`}
                    label="Trip Budget"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutButton
                    label="Shared Bills"
                    onClick={() => {
                      setSpaceMoreOpen(false);
                      setTool('bills');
                    }}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {currentMember?.role === 'owner' && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}

              {space.type === 'sme' && (
                <>
                  <ShortcutLink
                    to={`/spaces/${space.id}/business/industry`}
                    label="Industry Workflow"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}/business/guide`}
                    label="Staff Guide"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=updates`}
                    label="Updates"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=approvals`}
                    label="Approvals"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {canViewSmeFinancials && (
                    <>

                      <ShortcutLink
                        to={`/spaces/${space.id}?section=reports`}
                        label="Reports"
                        onClick={() => setSpaceMoreOpen(false)}
                      />

                      <ShortcutButton
                        label="Expenses"
                        onClick={() => {
                          setSpaceMoreOpen(false);
                          setTool('expenses');
                        }}
                      />

                      <ShortcutButton
                        label="Shared Bills"
                        onClick={() => {
                          setSpaceMoreOpen(false);
                          setTool('bills');
                        }}
                      />
                    </>
                  )}

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=members`}
                    label="Members"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=chat`}
                    label="Chat"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  <ShortcutLink
                    to={`/spaces/${space.id}?tab=activity`}
                    label="Activity"
                    onClick={() => setSpaceMoreOpen(false)}
                  />

                  {(smePosRole === 'owner'
                    || currentMember?.role === 'owner') && (
                    <ShortcutLink
                      to={`/spaces/${space.id}?tab=settings`}
                      label="Space Settings"
                      onClick={() => setSpaceMoreOpen(false)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {moneyType && (
        <MoneyActivityModal
          accounts={accounts}
          spaces={[space]}
          categories={allCategories}
          timezone={profile?.timezone || space.timezone || 'Asia/Brunei'}
          online={online}
          initialType={moneyType}
          lockedSpaceId={space.id}
          onCategoriesChanged={reloadCategories}
          onClose={() => setMoneyType(null)}
          onSubmit={postTransaction}
          onComplete={async (message, refresh) => {
            setMoneyType(null);
            setFeedback(message);

            if (refresh) {
              await onRefresh();
            }
          }}
        />
      )}

      {tool && (
        <Modal
          title={`${space.name} - ${toolTitle[tool]}`}
          onClose={() => setTool(null)}
        >
          <div className="space-tool-modal">
            {tool === 'trip_planning' && space.type === 'trip' && (
              <TripPlanningPanel
                space={space}
                members={members}
                currentMember={currentMember}
              />
            )}

            {(tool === 'tasks' || tool === 'shopping')
              && (space.type === 'household' || space.type === 'sme') && (
                <SpaceWorkPanel
                  space={space}
                  members={members}
                  currentMember={currentMember}
                  initialView={tool === 'tasks' ? 'tasks' : 'shopping'}
                />
              )}

            {tool === 'fund' && supportsGroupFund && (
              <SpaceFundPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
              />
            )}

            {tool === 'expenses' && (
              <SharedExpensesPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
                view="expenses"
              />
            )}

            {tool === 'balances' && (
              <SharedExpensesPanel
                space={space}
                members={members}
                currentMember={currentMember}
                canManage={canManage}
                view="balances"
              />
            )}

            {tool === 'bills' && (
              <CollaborationPage
                embedded
                spaceIdOverride={space.id}
                activeTab="bills"
                onSpaceUpdated={onRefresh}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
