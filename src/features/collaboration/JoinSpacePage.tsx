import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { acceptSpaceInvitation } from '../../repositories/collaborationRepository';
import { getErrorMessage } from '../../utils/errors';

export function JoinSpacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [joinedSpaceId, setJoinedSpaceId] = useState('');
  const accept = async () => { setBusy(true); setError(''); try { const result = await acceptSpaceInvitation(token); setJoinedSpaceId(result.spaceId); } catch (nextError) { setError(getErrorMessage(nextError)); } finally { setBusy(false); } };
  return <main className="page join-space-page"><PageHeader eyebrow="Invitation" title="Join a shared Space" description="Sign in to BajetBN, then use this secure invite link. If the sender added your email, sign in with that email." />{!token ? <div className="notice error">This invite link is incomplete. Ask the sender for a new link.</div> : joinedSpaceId ? <section className="panel join-card"><h2>You joined the Space</h2><p>You can now open this Space and manage shared money there.</p><button className="button primary" onClick={() => navigate(`/spaces/${joinedSpaceId}`)}>Open Space</button></section> : <section className="panel join-card">{error && <div className="notice error">{error}</div>}<h2>Join this Space</h2><p>Joining gives you the access chosen by the Space owner.</p><button className="button primary" disabled={busy} onClick={() => void accept()}>{busy ? 'Joining…' : 'Join this Space'}</button><Link className="button secondary" to="/">Not now</Link></section>}</main>;
}
