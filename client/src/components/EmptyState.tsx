import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-space-600 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-50 text-orbit-600">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-space-50">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-space-300">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
