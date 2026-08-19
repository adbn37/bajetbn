import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { postTransaction } from '../../repositories/transactionRepository';
import type { Account, Space, SpaceMember, TransactionCategory } from '../../types/models';
import { DEFAULT_TRANSACTION_CATEGORIES } from '../categories/defaultCategories';
import { CollaborationPage } from '../collaboration/CollaborationPage';
import { MoneyActivityModal } from '../transactions/TransactionsPage';
import { SharedExpensesPanel } from './SharedExpensesPanel';
import { SpaceFundPanel } from './SpaceFundPanel';

type SpaceTool = 'fund' | 'expenses' | 'balances' | 'bills';

export function SpaceActionHub({
  space,
  members,
  currentMember,
  supportsGroupFund,
  fundLabel,
  onRefresh,
}: {
  space: Space;
  members: SpaceMember[];
  currentMember: SpaceMember | null;
  supportsGroupFund: boolean;
  fundLabel: string;
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
      setAccounts(nextAccounts.filter((item) => !item.archivedAt && !item.closedAt));
      setCustomCategories(nextCategories);
      setError('');
    } catch {
      setError('Money shortcuts could not load your accounts or categories. You can still use the other Space tools.');
    }
  }, [space.type, user]);

  useEffect(() => {
    void loadMoneyOptions();
  }, [loadMoneyOptions]);

  const allCategories = useMemo(
    () => [...DEFAULT_TRANSACTION_CATEGORIES, ...customCategories.filter((item) => !item.archivedAt)],
    [customCategories],
  );

  async function reloadCategories(): Promise<TransactionCategory[]> {
    if (!user) return allCategories;
    const next = await listAllCustomCategories(user.uid);
    setCustomCategories(next);
    return [...DEFAULT_TRANSACTION_CATEGORIES, ...next.filter((item) => !item.archivedAt)];
  }

  if (space.type === 'sme') return null;

  const shared = space.type !== 'personal';
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const toolTitle: Record<SpaceTool, string> = {
    fund: fundLabel,
    expenses: 'Shared expenses',
    balances: 'Who owes whom',
    bills: 'Shared bills',
  };

  return (
    <>
      <section className="panel space-action-hub">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Quick Space actions</span>
            <h2>Stay inside {space.name}</h2>
            <p>New activity is automatically saved to this Space. Shared tools open here without sending you to a global page.</p>
          </div>
        </div>
        {feedback && <div className="notice success compact-notice">{feedback}</div>}
        {error && <div className="notice warning compact-notice">{error}</div>}
        <div className="space-action-buttons">
          <button type="button" className="space-action-button expense" onClick={() => setMoneyType('expense')}>
            <span>−</span><div><strong>+ Expense</strong><small>Add money out to this Space</small></div>
          </button>
          <button type="button" className="space-action-button income" onClick={() => setMoneyType('income')}>
            <span>+</span><div><strong>+ Income</strong><small>Add money in to this Space</small></div>
          </button>
          {shared && supportsGroupFund && (
            <button type="button" className="space-action-button" onClick={() => setTool('fund')}>
              <span>◉</span><div><strong>{fundLabel}</strong><small>Contribute and manage the shared fund</small></div>
            </button>
          )}
          {shared && (
            <>
              <button type="button" className="space-action-button" onClick={() => setTool('expenses')}>
                <span>↔</span><div><strong>Shared expenses</strong><small>Add, split and review expenses</small></div>
              </button>
              <button type="button" className="space-action-button" onClick={() => setTool('balances')}>
                <span>⇄</span><div><strong>Who owes whom</strong><small>See balances and settle up</small></div>
              </button>
              <button type="button" className="space-action-button" onClick={() => setTool('bills')}>
                <span>◷</span><div><strong>Shared bills</strong><small>Assign, pay and review shared bills</small></div>
              </button>
            </>
          )}
        </div>
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
            if (refresh) await onRefresh();
          }}
        />
      )}

      {tool && (
        <Modal title={`${space.name} — ${toolTitle[tool]}`} onClose={() => setTool(null)}>
          <div className="space-tool-modal">
            <div className="space-scoped-context">
              <strong>{space.name}</strong>
              <span>You stay inside this Space while using this tool.</span>
            </div>
            {tool === 'fund' && supportsGroupFund && (
              <SpaceFundPanel space={space} members={members} currentMember={currentMember} canManage={canManage} />
            )}
            {tool === 'expenses' && (
              <SharedExpensesPanel space={space} members={members} currentMember={currentMember} canManage={canManage} view="expenses" />
            )}
            {tool === 'balances' && (
              <SharedExpensesPanel space={space} members={members} currentMember={currentMember} canManage={canManage} view="balances" />
            )}
            {tool === 'bills' && (
              <CollaborationPage embedded spaceIdOverride={space.id} activeTab="bills" onSpaceUpdated={onRefresh} />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
