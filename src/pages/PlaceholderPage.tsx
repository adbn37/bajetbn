import { PageHeader } from '../components/PageHeader';

export function PlaceholderPage({ title, version, description }: { title: string; version: string; description: string }) {
  return <main className="page"><PageHeader eyebrow={`Planned for ${version}`} title={title} description={description} /><section className="placeholder-panel"><span>Coming next</span><h2>This feature is not ready yet.</h2><p>It will be added in a later update.</p><div className="placeholder-lines"><i/><i/><i/></div></section></main>;
}
