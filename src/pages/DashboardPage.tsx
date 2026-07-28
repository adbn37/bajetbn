import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { listAccounts } from '../repositories/accountRepository';
import { listSpaces } from '../repositories/spaceRepository';
import type { Account, Space } from '../types/models';
import { formatMoney } from '../utils/money';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDataUnavailable(false);
    Promise.all([listAccounts(user.uid), listSpaces(user.uid)])
      .then(([nextAccounts, nextSpaces]) => { setAccounts(nextAccounts); setSpaces(nextSpaces); })
      .catch(() => setDataUnavailable(true))
      .finally(() => setLoading(false));
  }, [user]);

  const total = accounts.filter((item) => item.type !== 'credit_card').reduce((sum, item) => sum + item.ledgerBalanceMinor, 0);
  return (
    <main className="page">
      <PageHeader eyebrow="Overview" title={`Good day, ${profile?.fullName?.split(' ')[0] || 'there'}`} description="A clear view of the accounts and Spaces connected to your life." action={<Link className="button primary" to="/accounts">Add account</Link>} />
      {dataUnavailable && <div className="notice">Cloud data is unavailable. Reconnect to refresh Accounts and Spaces.</div>}
      <section className="summary-grid">
        <article className="summary-card featured"><span>Available across accounts</span><strong>{loading ? '—' : formatMoney(total, profile?.currency || 'BND')}</strong><small>Ledger-backed balances</small></article>
        <article className="summary-card"><span>Active Spaces</span><strong>{loading ? '—' : spaces.filter((item) => !item.archivedAt).length}</strong><small>Personal and life contexts</small></article>
        <article className="summary-card"><span>Accounts</span><strong>{loading ? '—' : accounts.length}</strong><small>Bank, cash, e-wallet, cards</small></article>
        <article className="summary-card"><span>This month</span><strong>Coming in v0.5</strong><small>Income and expenses</small></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Accounts</span><h2>Your money sources</h2></div><Link to="/accounts">View all</Link></div>
          {accounts.length ? <div className="account-list compact-list">{accounts.slice(0, 4).map((account) => <div key={account.id} className="account-row"><span className={`account-symbol ${account.type}`}>{account.name.charAt(0)}</span><div><strong>{account.name}</strong><small>{account.institution || account.type.replace('_', ' ')}</small></div><b>{formatMoney(account.ledgerBalanceMinor, account.currency)}</b></div>)}</div> : <div className="mini-empty"><p>Create BIBD, Baiduri, Cash, or another account to begin.</p><Link to="/accounts">Create your first account →</Link></div>}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Spaces</span><h2>Life contexts</h2></div><Link to="/spaces">Manage</Link></div>
          <div className="space-chip-grid">{spaces.filter((item) => !item.archivedAt).slice(0, 6).map((space) => <div key={space.id} className="space-chip"><span className={`space-icon ${space.type}`}>{space.name.charAt(0)}</span><div><strong>{space.name}</strong><small>{space.type}</small></div></div>)}</div>
        </article>
      </section>
      <section className="roadmap-strip"><div><span className="eyebrow">Foundation status</span><h2>BajetBN v0.1.1</h2><p>Application shell, onboarding, Spaces, Accounts, PWA, Firebase rules, and staging configuration.</p></div><div className="progress"><span style={{ width: '10%' }} /><small>Road to public MVP</small></div></section>
    </main>
  );
}
