import { Brand } from './Brand';

export function LoadingScreen() {
  return (
    <main className="center-screen">
      <Brand />
      <div className="spinner" aria-label="Loading" />
    </main>
  );
}
