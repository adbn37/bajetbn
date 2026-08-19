import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../contexts/OfflineSyncContext';
import { subscribeSpaceActivities, subscribeUserNotifications } from '../repositories/collaborationRepository';
import { listenForForegroundPush } from '../repositories/notificationRepository';
import { listSpaces } from '../repositories/spaceRepository';
import type { Space } from '../types/models';
import { SidebarCustomizer } from '../components/SidebarCustomizer';
import {
  PERSONALISATION_EVENT,
  applyPersonalisation,
  defaultPersonalisation,
  loadPersonalisation,
  navigationIcon,
  orderedNavigation,
  savePersonalisation,
  type PersonalisationSettings,
} from '../services/personalisation';

interface ActivityToast {
  id: string;
  spaceId: string;
  spaceName: string;
  actorName: string;
  summary: string;
  targetPath: string;
}

function NotificationBellIcon() {
  return (
    <svg
      className="notification-bell-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [posSpaces, setPosSpaces] = useState<Space[]>([]);
  const [posPickerOpen, setPosPickerOpen] = useState(false);
  const [posPickerLoading, setPosPickerLoading] = useState(false);
  const [posPickerError, setPosPickerError] = useState('');
  const [personalisation, setPersonalisation] = useState<PersonalisationSettings>(defaultPersonalisation());
  const [menuCustomizerOpen, setMenuCustomizerOpen] = useState(false);
  const [activityToast, setActivityToast] = useState<ActivityToast | null>(null);
  const { profile, user, logOut } = useAuth();
  const { pendingCount, needsAttentionCount, syncing } = useOfflineSync();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPosMatch = location.pathname.match(/^\/spaces\/([^/]+)\/pos(?:\/|$)/);
  const currentPosPath = currentPosMatch ? `/spaces/${currentPosMatch[1]}/pos` : '';
  const visibleNavigation = useMemo(() => orderedNavigation(personalisation), [personalisation]);

  function updatePersonalisation(next: PersonalisationSettings) {
    if (!user) return;
    setPersonalisation(savePersonalisation(user.uid, next));
  }

  useEffect(() => {
    if (!user) {
      const defaults = defaultPersonalisation();
      setPersonalisation(defaults);
      applyPersonalisation(defaults);
      return;
    }

    const initial = loadPersonalisation(user.uid);
    setPersonalisation(initial);
    applyPersonalisation(initial);

    const handlePersonalisation = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string; settings: PersonalisationSettings }>).detail;
      if (!detail || detail.uid !== user.uid) return;
      setPersonalisation(detail.settings);
      applyPersonalisation(detail.settings);
    };
    window.addEventListener(PERSONALISATION_EVENT, handlePersonalisation);
    return () => window.removeEventListener(PERSONALISATION_EVENT, handlePersonalisation);
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/search') setSearchText(new URLSearchParams(location.search).get('q') || '');
  }, [location]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    return subscribeUserNotifications(
      user.uid,
      (items) => setUnreadNotifications(items.filter((item) => !item.readAt).length),
      () => setUnreadNotifications(0),
    );
  }, [user]);
  useEffect(() => {
    if (!user) {
      setActivityToast(null);
      return;
    }

    let active = true;
    const stops: Array<() => void> = [];

    void listSpaces(user.uid).then((spaces) => {
      if (!active) return;
      spaces.filter((space) => !space.archivedAt).forEach((space) => {
        let initialized = false;
        const known = new Set<string>();
        const stop = subscribeSpaceActivities(
          space.id,
          (items) => {
            if (!initialized) {
              items.forEach((item) => known.add(item.id));
              initialized = true;
              return;
            }

            const fresh = items.filter((item) => !known.has(item.id));
            items.forEach((item) => known.add(item.id));
            const newest = fresh.find((item) => item.actorUid !== user.uid);
            if (!newest) return;

            const opensPos = newest.action.includes('pos')
              || newest.action.includes('marketplace')
              || String(newest.targetType || '').toLowerCase().includes('pos');
            setActivityToast({
              id: newest.id,
              spaceId: space.id,
              spaceName: space.name,
              actorName: newest.actorName || 'A Space member',
              summary: newest.summary || newest.action.replaceAll('_', ' '),
              targetPath: opensPos ? `/spaces/${space.id}/pos` : `/spaces/${space.id}?tab=activity`,
            });
          },
          () => undefined,
        );
        stops.push(stop);
      });
    }).catch(() => undefined);

    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [user]);

  useEffect(() => {
    if (!activityToast) return;
    const timer = window.setTimeout(() => setActivityToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [activityToast]);

  useEffect(() => {
    if (!profile?.browserPushEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let active = true;
    let stop: () => void = () => {};
    void listenForForegroundPush((payload) => {
      if (!active) return;
      const title = payload.data?.title || payload.notification?.title || 'BajetBN reminder';
      const body = payload.data?.body || payload.notification?.body || 'Open BajetBN to see the update.';
      const targetPath = payload.data?.targetPath || '/notifications';
      const notification = new Notification(title, { body, icon: '/icons/bajetbn-192.png', tag: payload.data?.notificationId || undefined });
      notification.onclick = () => {
        window.focus();
        navigate(targetPath);
        notification.close();
      };
    }).then((unsubscribe) => { if (active) stop = unsubscribe; else unsubscribe(); });
    return () => { active = false; stop(); };
  }, [navigate, profile?.browserPushEnabled]);

  async function openPosShortcut() {
    if (!user || posPickerLoading) return;

    setPosPickerLoading(true);
    setPosPickerError('');

    try {
      const accessibleSpaces = await listSpaces(user.uid);
      const smeSpaces = accessibleSpaces.filter(
        (space) => space.type === 'sme' && !space.archivedAt,
      );

      if (smeSpaces.length === 0) {
        navigate('/spaces');
        return;
      }

      if (smeSpaces.length === 1) {
        navigate(`/spaces/${smeSpaces[0].id}/pos`);
        return;
      }

      setPosSpaces(smeSpaces);
      setPosPickerOpen(true);
    } catch {
      setPosSpaces([]);
      setPosPickerError(
        'Your SME Spaces could not be loaded. Open Spaces and try again.',
      );
      setPosPickerOpen(true);
    } finally {
      setPosPickerLoading(false);
    }
  }

  function choosePosSpace(space: Space) {
    setPosPickerOpen(false);
    setPosPickerError('');
    navigate(`/spaces/${space.id}/pos`);
  }

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
          {visibleNavigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon">{navigationIcon(personalisation.iconPack, item.id, item.icon)}</span>
              <span className="nav-label">{item.label}</span>
              {item.path === '/offline-sync' && (pendingCount + needsAttentionCount > 0 || syncing) && <span className={`nav-count ${needsAttentionCount > 0 ? 'attention' : ''}`}>{syncing ? '…' : pendingCount + needsAttentionCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-customize-button" onClick={() => setMenuCustomizerOpen(true)}>
            <span className="nav-icon">{navigationIcon(personalisation.iconPack, 'spaces', '☷')}</span>
            <span className="nav-label">Customize menu</span>
          </button>
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
          <div className="mobile-header-actions"><button className="icon-button" onClick={() => navigate('/search')} aria-label="Search">⌕</button><span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span></div>
        </header>
        <div className="desktop-environment">
          <form className="top-search-form" onSubmit={submitSearch}><span>⌕</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search BajetBN" aria-label="Search BajetBN" /></form>
          <button className="icon-button notification-button" onClick={() => navigate('/notifications')} aria-label={`${unreadNotifications} unread notifications`}><NotificationBellIcon />{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button>
          <span className="environment-badge">{import.meta.env.VITE_APP_ENV || 'local'}</span>
        </div>
        <ConnectivityBanner />
        {activityToast && (
          <button
            type="button"
            className="space-activity-live-toast"
            onClick={() => {
              const target = activityToast.targetPath;
              setActivityToast(null);
              navigate(target);
            }}
          >
            <span className="space-activity-live-toast-icon">●</span>
            <span className="space-activity-live-toast-copy">
              <strong>{activityToast.actorName} · {activityToast.spaceName}</strong>
              <span>{activityToast.summary}</span>
              <small>Just updated · Tap to view details</small>
            </span>
            <span className="space-activity-live-toast-arrow" aria-hidden="true">→</span>
          </button>
        )}
        <Outlet />

        <nav className="mobile-bottom-nav" aria-label="Quick navigation">
          <NavLink
            to="/spaces"
            className={() =>
              location.pathname.startsWith('/spaces') && !currentPosPath
                ? 'active'
                : ''
            }
          >
            <span aria-hidden="true">▦</span>
            <small>Spaces</small>
          </NavLink>

          <button
            type="button"
            className={currentPosPath ? 'active' : ''}
            onClick={() => void openPosShortcut()}
            aria-label="Open point of sale"
            aria-busy={posPickerLoading}
            disabled={posPickerLoading}
          >
            <span aria-hidden="true">▣</span>
            <small>POS</small>
          </button>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `mobile-bottom-primary ${isActive ? 'active' : ''}`
            }
          >
            <span aria-hidden="true">⌂</span>
            <small>Home</small>
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="mobile-bottom-alert-icon" aria-hidden="true">
              <NotificationBellIcon />
              {unreadNotifications > 0 && (
                <b>{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>
              )}
            </span>
            <small>Alerts</small>
          </NavLink>

          <button type="button" onClick={() => setMobileOpen(true)}>
            <span aria-hidden="true">☰</span>
            <small>More</small>
          </button>
        </nav>

        {menuCustomizerOpen && (
          <SidebarCustomizer
            settings={personalisation}
            onChange={updatePersonalisation}
            onClose={() => setMenuCustomizerOpen(false)}
          />
        )}

        {posPickerOpen && (
          <Modal
            title="Choose an SME POS"
            onClose={() => {
              setPosPickerOpen(false);
              setPosPickerError('');
            }}
          >
            <div className="pos-space-picker">
              <p>Which SME would you like to open?</p>

              {posPickerError && (
                <div className="notice error">{posPickerError}</div>
              )}

              {!posPickerError && (
                <div className="pos-space-picker-list">
                  {posSpaces.map((space) => (
                    <button
                      className="pos-space-picker-option"
                      type="button"
                      key={space.id}
                      onClick={() => choosePosSpace(space)}
                    >
                      <span>
                        <strong>{space.name}</strong>
                        <small>SME Space · {space.currency}</small>
                      </span>
                      <b>Open POS</b>
                    </button>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                {posPickerError && (
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => {
                      setPosPickerOpen(false);
                      navigate('/spaces');
                    }}
                  >
                    Open Spaces
                  </button>
                )}

                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setPosPickerOpen(false);
                    setPosPickerError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
