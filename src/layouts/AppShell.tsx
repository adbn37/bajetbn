import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  ['/', 'Overview', '⌂'],
  ['/spaces', 'Spaces', '◫'],
  ['/accounts', 'Accounts', '◉'],
  ['/transactions', 'Transactions', '↔'],
  ['/budgets', 'Budgets', '▤'],
  ['/goals', 'Goals', '◇'],
  ['/bills', 'Bills', '◷'],
  ['/reports', 'Reports', '⌁'],
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, user, logOut } = useAuth();

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
          <span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span>
        </header>
        <div className="desktop-environment"><span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span></div>
        <ConnectivityBanner />
        <Outlet />
      </div>
    </div>
  );
}
