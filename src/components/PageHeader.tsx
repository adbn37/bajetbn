import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  leading,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {leading}
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      {action && <div className="page-actions">{action}</div>}
    </header>
  );
}
