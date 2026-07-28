export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="BajetBN">
      <span className="brand-mark">B</span>
      {!compact && (
        <span>
          <strong>BajetBN</strong>
          <small>Life, connected by money</small>
        </span>
      )}
    </div>
  );
}
