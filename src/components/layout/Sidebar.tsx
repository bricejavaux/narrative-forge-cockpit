import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Network, Bot, Play,
  Activity, Mic, FolderOpen, Database, FileOutput, Settings,
  ChevronLeft, ChevronRight, Workflow,
} from 'lucide-react';
import { useState } from 'react';

const sections: { label: string; items: { to: string; icon: any; label: string }[] }[] = [
  {
    label: 'Pilotage',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/production', icon: Workflow, label: 'Production' },
      { to: '/architecture', icon: Network, label: 'Architecture tome' },
    ],
  },
  {
    label: 'Narration',
    items: [
      { to: '/canon', icon: BookOpen, label: 'Canon' },
      { to: '/characters', icon: Users, label: 'Personnages' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/agents', icon: Bot, label: 'Agents' },
      { to: '/runs', icon: Play, label: 'Runs' },
      { to: '/diagnostics', icon: Activity, label: 'Diagnostics' },
    ],
  },
  {
    label: 'Atelier',
    items: [
      { to: '/audio', icon: Mic, label: 'Audio & relectures' },
      { to: '/assets', icon: FolderOpen, label: 'Assets' },
      { to: '/indexes', icon: Database, label: 'Indexes' },
      { to: '/exports', icon: FileOutput, label: 'Exports' },
    ],
  },
  {
    label: 'Système',
    items: [{ to: '/settings', icon: Settings, label: 'Réglages' }],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex flex-col">
            <span className="font-display text-base text-foreground leading-tight" style={{ fontWeight: 500 }}>
              Les Portes du Monde
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cockpit narratif</span>
          </div>
        ) : (
          <span className="font-display text-xl text-foreground">P</span>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="px-5 mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map((item) => {
              const isActive =
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-3 px-5 py-2 text-sm transition-colors group ${
                    isActive
                      ? 'text-foreground bg-sidebar-accent'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                  )}
                  <item.icon size={16} className={isActive ? 'text-primary' : 'opacity-70'} strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border text-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
