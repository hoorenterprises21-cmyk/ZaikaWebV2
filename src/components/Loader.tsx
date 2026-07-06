export default function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-brand-500" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="p-3">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton mt-2 h-4 w-3/4" />
            <div className="skeleton mt-1.5 h-3 w-full" />
            <div className="skeleton mt-3 h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
      {icon && <div className="mb-3 text-neutral-300">{icon}</div>}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
