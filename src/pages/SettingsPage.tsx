import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';

export function SettingsPage() {
  const { profile, user } = useAuth();
  return <main className="page"><PageHeader eyebrow="Preferences" title="Settings" description="Change your profile, language, currency, time zone, privacy, and data options." /><section className="settings-grid"><article className="panel"><h2>Profile</h2><dl><div><dt>Name</dt><dd>{profile?.fullName}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Language</dt><dd>{profile?.language === 'ms' ? 'Bahasa Melayu' : 'English'}</dd></div><div><dt>Currency</dt><dd>{profile?.currency}</dd></div><div><dt>Timezone</dt><dd>{profile?.timezone}</dd></div></dl></article><article className="panel"><h2>Privacy and data</h2><p>Every user will be able to download their data or delete their account, even without a paid plan.</p><button className="button secondary" disabled>Download my data — coming later</button><button className="button danger-outline" disabled>Delete my account — coming later</button></article></section></main>;
}
