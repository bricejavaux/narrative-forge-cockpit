import { STATUS_LABEL_FR, statusColor, type ProductionStatus } from '@/lib/productionDoctrine';

const COLOR_CLASSES: Record<ReturnType<typeof statusColor>, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  red: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
  blue: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
  grey: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
};

export default function ProductionStatusBadge({ status, className = '' }: { status: ProductionStatus; className?: string }) {
  const c = statusColor(status);
  const label = STATUS_LABEL_FR[status] ?? status;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${COLOR_CLASSES[c]} ${className}`}>
      {label}
    </span>
  );
}
