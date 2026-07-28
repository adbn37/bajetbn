import { Brand } from '../components/Brand';

export function SetupRequiredPage() {
  return (
    <main className="setup-page">
      <Brand />
      <section className="setup-card">
        <span className="eyebrow">Configuration required</span>
        <h1>Connect the staging Firebase project</h1>
        <p>The source package is healthy, but Firebase credentials have not been supplied in this environment.</p>
        <ol>
          <li>Copy <code>.env.staging.example</code> to <code>.env.staging</code>.</li>
          <li>Add the BajetBN staging Firebase web app values.</li>
          <li>Copy <code>.firebaserc.example</code> to <code>.firebaserc</code> and set both project IDs.</li>
          <li>Run <code>npm run dev -- --mode staging</code>.</li>
        </ol>
        <div className="notice">Do not add production credentials until the staging build has been tested and approved.</div>
      </section>
    </main>
  );
}
