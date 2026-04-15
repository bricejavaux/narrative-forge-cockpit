import { useState } from 'react';
import { canonRules } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import MicButton from '@/components/shared/MicButton';
import { ChevronRight, Edit, Copy, Archive, Database, X } from 'lucide-react';

const tabs = ['Règles du monde', 'Contraintes', 'Modes de panne', 'Organisations', 'Technologies', 'Lieux', 'Glossaire', 'Sources & index'];

export default function CanonPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  const rule = canonRules.find(r => r.id === selectedRule);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Canon</h1>
        <MicButton label="Note audio sur le canon" size="md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${
              activeTab === tab
                ? 'bg-surface-2 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={`${selectedRule ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="cockpit-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Titre</th>
                  <th className="text-left py-2 px-3">Catégorie</th>
                  <th className="text-left py-2 px-3">Criticité</th>
                  <th className="text-left py-2 px-3">Statut</th>
                  <th className="text-left py-2 px-3">V.</th>
                  <th className="text-left py-2 px-3">Index</th>
                  <th className="text-left py-2 px-3">Source</th>
                  <th className="text-left py-2 px-3">MAJ</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {canonRules.map(r => (
                  <tr
                    key={r.id}
                    className={`border-b border-border/50 hover:bg-surface-2 cursor-pointer transition-colors ${selectedRule === r.id ? 'bg-surface-2' : ''}`}
                    onClick={() => setSelectedRule(r.id)}
                  >
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="py-2 px-3 text-foreground">{r.title}</td>
                    <td className="py-2 px-3"><StatusBadge status={r.category} /></td>
                    <td className="py-2 px-3"><StatusBadge status={r.criticality === 'haute' ? 'critical' : r.criticality === 'moyenne' ? 'warning' : 'low'} /></td>
                    <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2 px-3 font-mono text-xs">v{r.version}</td>
                    <td className="py-2 px-3 font-mono text-xs text-cyan">{r.indexAssociated}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{r.source}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{r.lastUpdate}</td>
                    <td className="py-2 px-3"><ChevronRight size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {rule && (
          <div className="w-1/2 cockpit-card space-y-4 animate-slide-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">{rule.title}</h2>
              <button onClick={() => setSelectedRule(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={rule.status} />
              <StatusBadge status={rule.criticality === 'haute' ? 'critical' : 'warning'} />
              <span className="text-xs font-mono text-muted-foreground">Rigidité: {rule.rigidity}</span>
            </div>

            <div className="space-y-3 text-sm">
              <div><span className="text-xs text-muted-foreground uppercase">Résumé</span><p className="text-foreground mt-1">{rule.summary}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase">Description</span><p className="text-muted-foreground mt-1">{rule.description}</p></div>
              <div><span className="text-xs text-muted-foreground uppercase">Exceptions</span><p className="text-muted-foreground mt-1">{rule.exceptions}</p></div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase">Liens</span>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-surface-2 text-cyan font-mono">→ {rule.indexAssociated}</span>
                <span className="px-2 py-1 rounded bg-surface-2 text-muted-foreground">Ch. 1, 3, 8</span>
                <span className="px-2 py-1 rounded bg-surface-2 text-muted-foreground">Audit Canon</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed opacity-70">
                <Edit size={12} /> Éditer
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed opacity-70">
                <Copy size={12} /> Dupliquer
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed opacity-70">
                <Archive size={12} /> Archiver
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed opacity-70">
                <Database size={12} /> Envoyer vers index
              </button>
              <MicButton label="Note audio" size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
