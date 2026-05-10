import { useState } from 'react';
import { runs, agents, chapters } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import { Play, Save, Download, ExternalLink, AlertTriangle, Zap, CheckCircle2, XCircle, Database } from 'lucide-react';

const modes = ['Dry run (simulation seule)', 'SAFE_BATCH', 'Audit complet', 'Génération chapitre', 'Audit tome', 'Réécriture ciblée', 'Réécriture profonde', 'Pré-export', 'Export final', 'Vérification cross-chapitres', 'Vérification notes audio'];

const checklist = [
  { label: 'OpenAI disponible', ok: false },
  { label: 'Supabase disponible', ok: false },
  { label: 'OneDrive disponible', ok: false },
  { label: 'Indexes requis disponibles', ok: true, note: 'simulés' },
  { label: 'Notes audio non traitées revues', ok: false, note: '9 ouvertes' },
  { label: 'Objets cibles sélectionnés', ok: true },
  { label: 'Format de sortie sélectionné', ok: true },
];

export default function RunsPage() {
  const [selectedMode, setSelectedMode] = useState(modes[0]);
  const ready = checklist.every((c) => c.ok);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Orchestration</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Run Designer</h1>
      </div>

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

          {/* Pre-run checklist */}
          <div className="cockpit-card space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="editorial-eyebrow">Checklist pré-run</h3>
              <span className={`text-[11px] font-mono ${ready ? 'text-emerald-600' : 'text-amber'}`}>
                {ready ? 'prêt' : 'non prêt — Lancer désactivé'}
              </span>
            </div>
            <ul className="text-xs space-y-1">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.ok
                    ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    : <XCircle size={12} className="text-rose shrink-0" />}
                  <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                  {c.note && <span className="text-[10px] font-mono text-muted-foreground">· {c.note}</span>}
                </li>
              ))}
            </ul>
          </div>

          {/* Future payload simulé */}
          <div className="cockpit-card space-y-3">
            <h3 className="editorial-eyebrow flex items-center gap-2"><Database size={11} /> Payload futur — simulé</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Objets envoyés</p>
                <p className="font-mono text-foreground/80">3 chapitres · 2 personnages · 1 arc</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Indexes consultés</p>
                <p className="font-mono text-primary">world_index · arc_index · style_index</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Agents appelés</p>
                <p className="font-mono text-foreground/80">audit_hierarchie_lagrange_walvis · audit_phrase_couteau</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Outputs attendus</p>
                <p className="font-mono text-foreground/80">findings + diff + score révisé</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Tables Supabase futures touchées</p>
                <p className="font-mono text-accent">runs · run_findings · diagnostics_scores · audit_logs</p>
              </div>
            </div>
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
          <div className="flex gap-3 flex-wrap">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-display hover:bg-primary/20 transition-colors">
              <Zap size={14} /> Simuler (dry run)
            </button>
            <button
              disabled
              title="OpenAI et Supabase non branchés"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-display cursor-not-allowed opacity-50"
            >
              <Play size={14} /> Lancer le Run
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
              <Save size={14} /> Sauver preset
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
              <Download size={14} /> Exporter config
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
              <ExternalLink size={14} /> Dernier résultat
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber">
            <AlertTriangle size={11} />
            « Lancer le Run » désactivé tant que OpenAI et Supabase ne sont pas branchés. Mode par défaut : dry run.
          </div>
        </div>

        {/* Historique runs */}
        <div className="space-y-4">
          <h2 className="editorial-eyebrow">Historique des Runs</h2>
          <NoteComposer target="run en préparation" compact />
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
