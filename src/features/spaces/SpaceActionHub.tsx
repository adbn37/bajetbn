import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineSync } from '../../contexts/OfflineSyncContext';
import { listAccounts } from '../../repositories/accountRepository';
import { listAllCustomCategories } from '../../repositories/categoryRepository';
import { postTransaction } from '../../repositories/transactionRepository';
import type { Account, Space, SpaceMember, TransactionCategory } from '../../types/models';
import { getSpaceHomeExperience } from './spaceExperience';
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
  const experience = getSpaceHomeExperience(space, currentMember);
  const isPrimary = (action: SpaceTool | 'expense' | 'income') => experience.primary === action;
  const toolTitle: Record<SpaceTool, string> = {
    fund: fundLabel,
    expenses: 'Shared expenses',
    balances: 'Settlements',
    bills: 'Shared bills',
  };

  return (
    <>
      <section className="panel space-action-hub">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Quick Space actions</span>
            <h2>Stay inside {space.name}</h2>
            <p>{experience.context}</p>
          </div>
        </div>
        {feedback && <div className="notice success compact-notice">{feedback}</div>}
        {error && <div className="notice warning compact-notice">{error}</div>}
        <div className="space-action-buttons">
          <button type="button" className={`space-action-button expense ${isPrimary('expense') ? 'primary-action' : ''}`} onClick={() => setMoneyType('expense')}>
            <span>−</span><div><strong>{isPrimary('expense') ? experience.label : '+ Expense'}</strong><small>{isPrimary('expense') ? experience.detail : 'Add money out to this Space'}</small></div>
          </button>
          <button type="button" className={`space-action-button income ${isPrimary('income') ? 'primary-action' : ''}`} onClick={() => setMoneyType('income')}>
            <span>+</span><div><strong>+ Income</strong><small>Add money in to this Space</small></div>
          </button>
          {shared && supportsGroupFund && (
            <button type="button" className={`space-action-button ${isPrimary('fund') ? 'primary-action' : ''}`} onClick={() => setTool('fund')}>
              <span>◉</span><div><strong>{fundLabel}</strong><small>Contribute and manage the shared fund</small></div>
            </button>
          )}
          {shared && (
            <>
              <button type="button" className={`space-action-button ${isPrimary('expenses') ? 'primary-action' : ''}`} onClick={() => setTool('expenses')}>
                <span>↔</span><div><strong>{isPrimary('expenses') ? experience.label : 'Shared expenses'}</strong><small>{isPrimary('expenses') ? experience.detail : 'Add, split and review expenses'}</small></div>
              </button>
              <button type="button" className={`space-action-button ${isPrimary('balances') ? 'primary-action' : ''}`} onClick={() => setTool('balances')}>
                <span>⇄</span><div><strong>Settlements</strong><small>See balances and settle up</small></div>
              </button>
              <button type="button" className={`space-action-button ${isPrimary('bills') ? 'primary-action' : ''}`} onClick={() => setTool('bills')}>
                <span>◷</span><div><strong>{isPrimary('bills') ? experience.label : 'Shared bills'}</strong><small>{isPrimary('bills') ? experience.detail : 'Assign, pay and review shared bills'}</small></div>
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
