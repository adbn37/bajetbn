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
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { postTransaction } from '../../repositories/transactionRepository';
import type {
  Account,
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

type SpaceTool =
  | 'fund'
  | 'expenses'
  | 'balances'
  | 'bills'
  | 'trip_planning';

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
}: {
  to: string;
  label: string;
  badge?: string | number;
  primary?: boolean;
}) {
  return (
    <Link
      className={`button ${primary ? 'primary primary-action' : 'secondary'} compact`}
      style={shortcutStyle}
      to={to}
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
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

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

  useEffect(() => {
    void loadMoneyOptions();
  }, [loadMoneyOptions]);

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

  const experience = getSpaceHomeExperience(space, currentMember);

  const isPrimary = (
    action: 'expense' | 'income' | 'fund' | 'expenses' | 'balances' | 'bills',
  ) => experience.primary === action;

  const toolTitle: Record<SpaceTool, string> = {
    fund: fundLabel,
    expenses: space.type === 'trip' ? 'Trip Expenses' : 'Shared expenses',
    balances: 'Settlements',
    bills: 'Shared Bills',
    trip_planning: 'Trip Plan',
  };

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
          <div className="space-action-buttons" data-secondary-label="More Space tools" style={shortcutGridStyle}>
            <ShortcutLink
              to={`/spaces/${space.id}/pos`}
              label={smePosLabel(smePosRole)}
              primary
            />

            {canViewSmeFinancials && (
              <>
                <ShortcutLink to="/accounts" label="Accounts" />

                <ShortcutButton
                  label="Expenses"
                  onClick={() => setTool('expenses')}
                />

                <ShortcutButton
                  label="Shared Bills"
                  onClick={() => setTool('bills')}
                />
              </>
            )}

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

            {(smePosRole === 'owner' || currentMember?.role === 'owner') && (
              <ShortcutLink
                to={`/spaces/${space.id}?tab=settings`}
                label="Settings"
              />
            )}
          </div>
        ) : space.type === 'trip' ? (
          <div className="space-action-buttons" data-secondary-label="More Space tools" style={shortcutGridStyle}>
            <ShortcutButton
              label="Trip Plan"
              primary
              onClick={() => setTool('trip_planning')}
            />

            <ShortcutLink
              to="/budgets"
              label="Trip Budget"
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
              label="Settlements"
              onClick={() => setTool('balances')}
            />

            <ShortcutButton
              label="Shared Bills"
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

            {currentMember?.role === 'owner' && (
              <ShortcutLink
                to={`/spaces/${space.id}?tab=settings`}
                label="Settings"
              />
            )}
          </div>
        ) : space.type === 'household' ? (
          <div className="space-action-buttons" data-secondary-label="More Space tools" style={shortcutGridStyle}>
            <ShortcutButton
              label="Household Fund"
              primary
              onClick={() => setTool('fund')}
            />

            <ShortcutButton
              label="Add Expense"
              onClick={() => setMoneyType('expense')}
            />

            <ShortcutButton
              label="Shared expenses"
              onClick={() => setTool('expenses')}
            />

            <ShortcutButton
              label="Shared Bills"
              onClick={() => setTool('bills')}
            />

            <ShortcutButton
              label="Settlements"
              onClick={() => setTool('balances')}
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

            {currentMember?.role === 'owner' && (
              <ShortcutLink
                to={`/spaces/${space.id}?tab=settings`}
                label="Settings"
              />
            )}
          </div>
        ) : (
          <div className="space-action-buttons" data-secondary-label="More Space tools" style={shortcutGridStyle}>
            <ShortcutButton
              label="Add Expense"
              primary={isPrimary('expense')}
              onClick={() => setMoneyType('expense')}
            />

            <ShortcutButton
              label="Add Income"
              primary={isPrimary('income')}
              onClick={() => setMoneyType('income')}
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
