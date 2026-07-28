import { Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Brand />
        <div>
          <span className="eyebrow">Built for Brunei</span>
          <h1>One place for the money behind your life.</h1>
          <p>Organise personal finances, households, trips, goals, custom projects, and SME activity through Spaces.</p>
        </div>
        <div className="auth-points">
          <span>Default currency: BND</span>
          <span>English &amp; Malay-ready</span>
          <span>Private by design</span>
        </div>
      </section>
      <section className="auth-panel"><Outlet /></section>
    </main>
  );
}
