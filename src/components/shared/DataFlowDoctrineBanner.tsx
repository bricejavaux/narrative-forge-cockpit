import { Database, HardDrive, CloudUpload, Pencil } from 'lucide-react';

// Doctrine: OneDrive = source repository, Supabase = active record,
// edits update Supabase only, OneDrive is never auto-overwritten.
export default function DataFlowDoctrineBanner({ compact = false }: { compact?: boolean }) {
  const items = [
    { icon: HardDrive, label: 'Source : OneDrive', detail: 'Documents bruts et archives techniques' },
    { icon: Database, label: 'Enregistrement actif : Supabase', detail: 'Source de vérité de l’application' },
    { icon: Pencil, label: 'Les modifications mettent à jour Supabase', detail: 'Aucune écriture automatique vers OneDrive' },
    { icon: CloudUpload, label: 'Export vers OneDrive : manuel uniquement', detail: 'Action explicite requise' },
  ];

  if (compact) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <it.icon className="w-3 h-3" />
            <span className="text-foreground">{it.label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="cockpit-card space-y-3">
      <div>
        <p className="editorial-eyebrow">Doctrine de flux de données</p>
        <h3 className="text-base editorial-heading text-foreground">OneDrive → Supabase → (export manuel)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-border/40 bg-card/40 px-3 py-2">
            <it.icon className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground">{it.label}</p>
              <p className="text-[11px] text-muted-foreground">{it.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
