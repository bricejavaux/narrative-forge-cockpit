import { Bell, ChevronDown, Plug, User, Sparkles } from 'lucide-react';
import { connectors, project } from '@/data/dummyData';

export default function Header() {
  const disconnectedCount = connectors.filter((c) => c.status === 'not_connected').length;

  return (
    <header className="h-16 bg-card/70 backdrop-blur-sm border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-5">
        <button className="flex items-center gap-2 group">
          <span className="font-display text-base text-foreground truncate max-w-[260px]" style={{ fontWeight: 500 }}>
            {project.name}
          </span>
          <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
        <div className="w-px h-5 bg-border" />
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span>{project.currentTome}</span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber/30 bg-amber/5 text-amber text-[11px] font-mono">
          <Sparkles size={11} />
          Prototype simulé
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          <Plug size={12} />
          <span>
            <span className="text-destructive">{disconnectedCount}</span> connecteurs à brancher
          </span>
        </button>

        <button className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose" />
        </button>

        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-secondary transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
            <User size={14} className="text-foreground/70" />
          </div>
        </button>
      </div>
    </header>
  );
}
