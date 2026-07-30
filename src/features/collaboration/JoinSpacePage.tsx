import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { acceptSpaceInvitation } from '../../repositories/collaborationRepository';
import { getErrorMessage } from '../../utils/errors';

export function JoinSpacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [joined, setJoined] = useState(false);
  const accept = async () => { setBusy(true); setError(''); try { await acceptSpaceInvitation(token); setJoined(true); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <main className="page join-space-page"><PageHeader eyebrow="Invitation" title="Join a shared Space" description="Sign in with the same email address that received the invite." />{!token ? <div className="notice error">This invite link is incomplete. Ask the sender for a new link.</div> : joined ? <section className="panel join-card"><h2>You joined the Space</h2><p>You can now see this Space in Spaces and Sharing.</p><button className="button primary" onClick={() => navigate('/sharing')}>Open Sharing</button></section> : <section className="panel join-card">{error && <div className="notice error">{error}</div>}<h2>Join this Space</h2><p>Joining gives you the access chosen by the Space owner.</p><button className="button primary" disabled={busy} onClick={() => void accept()}>{busy ? 'Joining…' : 'Join this Space'}</button><Link className="button secondary" to="/">Not now</Link></section>}</main>;
}
