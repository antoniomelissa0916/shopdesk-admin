import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backLink?: { to: string; label: string };
}

export default function PageHeader({ title, subtitle, actions, backLink }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-heading">
        {backLink && (
          <Link to={backLink.to} className="back-link" aria-label={backLink.label}>
            ←
          </Link>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
