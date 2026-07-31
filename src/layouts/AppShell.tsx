import { type FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { useAuth } from '../contexts/AuthContext';
import { listUserNotifications } from '../repositories/collaborationRepository';

const navigation = [
  ['/', 'Overview', '⌂'],
  ['/spaces', 'Spaces', '◫'],
  ['/accounts', 'Accounts', '◉'],
  ['/transactions', 'Money activity', '↔'],
  ['/budgets', 'Budgets', '▤'],
  ['/goals', 'Goals', '◇'],
  ['/bills', 'Bills & instalments', '◷'],
  ['/calendar', 'Calendar', '▦'],
  ['/search', 'Search', '⌕'],
  ['/reports', 'Money reports', '⌁'],
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { profile, user, logOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/search') setSearchText(new URLSearchParams(location.search).get('q') || '');
  }, [location]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void listUserNotifications(user.uid)
      .then((items) => { if (!cancelled) setUnreadNotifications(items.filter((item) => !item.readAt).length); })
      .catch(() => { if (!cancelled) setUnreadNotifications(0); });
    return () => { cancelled = true; };
  }, [location.pathname, user]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = searchText.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Brand compact={collapsed} />
          <button className="icon-button desktop-only" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">⇤</button>
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu">×</button>
        </div>
        <nav>
          {navigation.map(([path, label, icon]) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/settings" onClick={() => setMobileOpen(false)}>
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Settings</span>
          </NavLink>
          <button type="button" className="sidebar-user" onClick={() => void logOut()} title="Sign out">
            <span className="avatar">{(profile?.fullName || user?.email || 'B').charAt(0).toUpperCase()}</span>
            <span className="nav-label">
              <strong>{profile?.fullName || 'BajetBN user'}</strong>
              <small>Sign out</small>
            </span>
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="drawer-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <div className="app-main">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
          <Brand compact />
          <div className="mobile-header-actions"><button className="icon-button notification-button" onClick={() => navigate('/notifications')} aria-label={`${unreadNotifications} unread notifications`}>♢{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button><button className="icon-button" onClick={() => navigate('/search')} aria-label="Search">⌕</button><span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span></div>
        </header>
        <div className="desktop-environment">
          <form className="top-search-form" onSubmit={submitSearch}><span>⌕</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search BajetBN" aria-label="Search BajetBN" /></form>
          <button className="icon-button notification-button" onClick={() => navigate('/notifications')} aria-label={`${unreadNotifications} unread notifications`}>♢{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button>
          <span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span>
        </div>
        <ConnectivityBanner />
        <Outlet />
      </div>
    </div>
  );
}
