import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Network, Bot, Play,
  Activity, Mic, FolderOpen, Database, FileOutput, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/canon', icon: BookOpen, label: 'Canon' },
  { to: '/characters', icon: Users, label: 'Personnages' },
  { to: '/architecture', icon: Network, label: 'Architecture Tome' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/runs', icon: Play, label: 'Runs' },
  { to: '/diagnostics', icon: Activity, label: 'Diagnostics' },
  { to: '/audio', icon: Mic, label: 'Audio & Reviews' },
  { to: '/assets', icon: FolderOpen, label: 'Assets' },
  { to: '/indexes', icon: Database, label: 'Indexes' },
  { to: '/exports', icon: FileOutput, label: 'Exports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="font-display font-bold text-sm gradient-text-cyan tracking-wider">
            NARRATIVE COCKPIT
          </span>
        )}
        {collapsed && <span className="font-display font-bold text-lg gradient-text-cyan">NC</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative group ${
                isActive
                  ? 'text-primary bg-primary/10 border-r-2 border-primary'
                  : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-primary' : ''} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-surface-3 text-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
