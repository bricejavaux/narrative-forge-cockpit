import { useState } from 'react';
import { runs, agents, chapters } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Play, Save, Download, ExternalLink, AlertTriangle, Zap } from 'lucide-react';

const modes = ['SAFE_BATCH', 'Audit complet', 'Génération chapitre', 'Audit tome', 'Réécriture ciblée', 'Réécriture profonde', 'Pré-export', 'Export final', 'Vérification cross-chapitres', 'Vérification notes audio'];

export default function RunsPage() {
  const [selectedMode, setSelectedMode] = useState(modes[0]);

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Run Designer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="cockpit-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-foreground">Configuration du Run</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Mode</label>
                <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)}
                  className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground">
                  {modes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Périmètre</label>
                <select className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>Tome entier</option>
                  <option>Chapitres sélectionnés</option>
                  <option>Arc spécifique</option>
                  <option>Personnage spécifique</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Objet cible</label>
                <select className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>Tous les chapitres</option>
                  {chapters.slice(0, 5).map(ch => <option key={ch.id}>Ch.{ch.number} — {ch.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Politique réécriture</label>
                <select className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>Lecture seule</option>
                  <option>Suggestions uniquement</option>
                  <option>Réécriture avec validation</option>
                  <option>Réécriture automatique</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Agents sélectionnés</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {agents.slice(0, 8).map(a => (
                  <button key={a.id} className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Budget max</label>
                <input type="text" value="$5.00" readOnly className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Politique persistance</label>
                <select className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground">
                  <option>Sauvegarder en DB</option>
                  <option>Export seulement</option>
                  <option>Dry run</option>
                </select>
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="cockpit-card border-amber/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber" />
              <span className="text-xs text-amber font-display font-semibold uppercase">Warnings pré-run</span>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>⚠ OpenAI API non branchée — exécution impossible</li>
              <li>⚠ Supabase non branché — aucune persistance</li>
              <li>⚠ Indexes simulés — résultats non fiables</li>
              <li>⚠ 9 notes audio non traitées</li>
            </ul>
          </div>

          {/* Simulation */}
          <div className="cockpit-card">
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Simulation coût / latence</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-cyan">$2.35</span><p className="text-[10px] text-muted-foreground">Coût estimé</p></div>
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-violet">~12min</span><p className="text-[10px] text-muted-foreground">Durée estimée</p></div>
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-amber">4</span><p className="text-[10px] text-muted-foreground">Agents</p></div>
              <div className="p-3 bg-surface-2 rounded"><span className="text-lg font-display font-bold text-rose">3</span><p className="text-[10px] text-muted-foreground">Dépendances manquantes</p></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-display hover:bg-primary/20 transition-colors cursor-not-allowed opacity-70">
              <Zap size={14} /> Simuler
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-display hover:bg-primary/90 transition-colors cursor-not-allowed opacity-70">
              <Play size={14} /> Lancer le Run
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors cursor-not-allowed opacity-70">
              <Save size={14} /> Sauver preset
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors cursor-not-allowed opacity-70">
              <Download size={14} /> Exporter config
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors cursor-not-allowed opacity-70">
              <ExternalLink size={14} /> Dernier résultat
            </button>
          </div>
        </div>

        {/* Historique runs */}
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-sm text-foreground">Historique des Runs</h2>
          {runs.map(run => (
            <div key={run.id} className="cockpit-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-sm text-foreground">{run.name}</span>
                <StatusBadge status={run.status} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Mode: {run.mode}</p>
                <p>Agents: {run.agents.join(', ')}</p>
                <div className="flex gap-3 font-mono">
                  <span>{run.findings} findings</span>
                  <span>{run.cost}</span>
                  <span>{run.duration}</span>
                </div>
                <p className="text-[10px]">{run.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
