import { Link } from 'react-router-dom';
export function NotFoundPage() { return <main className="center-screen"><h1>Page not found</h1><p>We could not find this page.</p><Link className="button primary" to="/">Go to home</Link></main>; }
