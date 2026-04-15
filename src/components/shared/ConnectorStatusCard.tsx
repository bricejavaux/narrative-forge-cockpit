import { type ConnectorStatus } from '@/data/dummyData';
import { Plug, PlugZap, AlertTriangle, Sparkles } from 'lucide-react';

interface ConnectorStatusCardProps {
  name: string;
  description: string;
  status: ConnectorStatus;
  note?: string;
}

const statusConfig: Record<ConnectorStatus, { label: string; classes: string; icon: typeof Plug }> = {
  connected: { label: 'Connecté', classes: 'status-connected', icon: PlugZap },
  not_connected: { label: 'Non branché', classes: 'status-disconnected', icon: Plug },
  simulated: { label: 'Simulé', classes: 'status-simulated', icon: Sparkles },
  warning: { label: 'Warning', classes: 'status-simulated', icon: AlertTriangle },
  critical: { label: 'Critique', classes: 'status-disconnected', icon: AlertTriangle },
};

export default function ConnectorStatusCard({ name, description, status, note }: ConnectorStatusCardProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div className="cockpit-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-display font-semibold text-sm text-foreground">{name}</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border font-mono ${cfg.classes}`}>
          <Icon size={10} />
          {cfg.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {note && <p className="text-xs font-mono text-muted-foreground/70">→ {note}</p>}
      {status === 'not_connected' && (
        <button className="mt-auto text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-not-allowed opacity-60">
          Connecter — future connexion
        </button>
      )}
    </div>
  );
}
