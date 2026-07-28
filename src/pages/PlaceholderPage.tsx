import { PageHeader } from '../components/PageHeader';

export function PlaceholderPage({ title, version, description }: { title: string; version: string; description: string }) {
  return <main className="page"><PageHeader eyebrow={`Planned for ${version}`} title={title} description={description} /><section className="placeholder-panel"><span>Coming next</span><h2>The foundation is ready for this module.</h2><p>Navigation and responsive layouts are already in place, so the feature can be added without changing the application shell.</p><div className="placeholder-lines"><i/><i/><i/></div></section></main>;
}
