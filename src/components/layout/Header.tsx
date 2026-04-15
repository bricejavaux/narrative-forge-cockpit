import { Bell, ChevronDown, Plug, User, AlertTriangle } from 'lucide-react';
import { connectors, project } from '@/data/dummyData';

export default function Header() {
  const disconnectedCount = connectors.filter(c => c.status === 'not_connected').length;

  return (
    <header className="h-14 bg-surface-1 border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Project selector */}
        <button className="flex items-center gap-2 text-sm font-display text-foreground hover:text-primary transition-colors">
          <span className="truncate max-w-[200px]">{project.name}</span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
        <div className="w-px h-6 bg-border" />
        {/* Tome selector */}
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>{project.currentTome}</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Prototype badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber/30 bg-amber/5 text-amber text-xs font-mono">
          <AlertTriangle size={12} />
          Prototype non connecté
        </div>

        {/* Connector status */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Plug size={14} />
          <span className="text-red-400">{disconnectedCount} déconnectés</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center">
            <User size={14} />
          </div>
        </button>
      </div>
    </header>
  );
}
