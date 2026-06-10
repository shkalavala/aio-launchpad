interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Consistent page header for v2 surfaces: title, optional blurb, right actions. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <div>
        <h1 className="text-[18px] font-semibold text-fg">{title}</h1>
        {description && <p className="mt-0.5 max-w-2xl text-[13px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
