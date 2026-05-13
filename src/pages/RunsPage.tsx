import { useEffect, useState } from 'react';
import { runs, agents, chapters } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import { Play, Save, Download, ExternalLink, AlertTriangle, Zap, CheckCircle2, XCircle, Database } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

type ModeDef = { id: string; label: string; live?: boolean; blockers?: string[] };

const PRODUCTION_CHAIN: ModeDef[] = [
  { id: 'p1', label: '1. Préparer / générer les beats prévus', blockers: ['plan chapitre requis'] },
  { id: 'p2', label: '2. Auditer les beats prévus', blockers: ['beats prévus requis'] },
  { id: 'p3', label: '3. Valider les beats', blockers: ['beats prévus requis · validation humaine'] },
  { id: 'p4', label: '4. Générer chapitre depuis beats validés', blockers: ['beats validés', 'canon non stale', 'personnages disponibles', 'chapitre cible sélectionné'] },
  { id: 'p5', label: '5. Extraire beats observés', blockers: ['chapter full_text requis'] },
  { id: 'p6', label: '6. Auditer chapitre vs beats prévus', blockers: ['beats observés requis'] },
  { id: 'p7', label: '7. Créer réécritures ciblées', blockers: ['audit chapitre requis'] },
  { id: 'p8', label: '8. Valider / intégrer réécritures', blockers: ['rewrite_tasks pending'] },
  { id: 'p9', label: '9. Verrouiller chapitre', blockers: ['rewrite_tasks resolved'] },
  { id: 'p10', label: '10. Lancer audit méta-tome', blockers: ['au moins 3 chapitres verrouillés'] },
  { id: 'p11', label: '11. Analyser impact canon', blockers: ['changement canon récent'] },
  { id: 'p12', label: '12. Préparer export', blockers: ['chapitres sélectionnés'] },
];

const PRESETS: ModeDef[] = [
  { id: 's1', label: 'Dry run (simulation seule)' },
  { id: 's2', label: 'SAFE_BATCH' },
  { id: 's3', label: 'Audit complet' },
  { id: 's4', label: 'Pré-export' },
  { id: 's5', label: 'Vérification notes audio' },
];

const LEGACY: ModeDef[] = [
  { id: 'l1', label: 'Génération chapitre (legacy)' },
  { id: 'l2', label: 'Audit tome (legacy)' },
  { id: 'l3', label: 'Réécriture ciblée (legacy)' },
  { id: 'l4', label: 'Réécriture profonde (legacy — désactivé)' },
  { id: 'l5', label: 'Export final (legacy)' },
  { id: 'l6', label: 'Vérification cross-chapitres (legacy)' },
];

const ALL_MODES = [...PRODUCTION_CHAIN, ...PRESETS, ...LEGACY];

export default function RunsPage() {
  const [selectedMode, setSelectedMode] = useState<ModeDef>(PRODUCTION_CHAIN[0]);
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);

  useEffect(() => {
    supabaseService.getReadiness()
      .then(setReadiness)
      .catch(() => setReadiness(null))
      .finally(() => setLoadingReadiness(false));
  }, []);

  const openaiOk = !!readiness?.openai?.api_key_configured;
  const supabaseOk = !!readiness?.supabase?.project_connected;
  const onedriveOk = !!readiness?.onedrive?.oauth_configured;

  const checklist = [
    { label: 'OpenAI disponible', ok: openaiOk, note: openaiOk ? readiness?.openai?.model ?? undefined : 'clé absente' },
    { label: 'Supabase disponible', ok: supabaseOk },
    { label: 'OneDrive disponible', ok: onedriveOk, note: onedriveOk ? undefined : 'optionnel' },
    { label: 'Indexes requis disponibles', ok: true, note: 'mock — pgvector pending' },
    { label: 'Objets cibles sélectionnés', ok: true },
    { label: 'Format de sortie sélectionné', ok: true },
  ];
  const required = [openaiOk, supabaseOk]; // OneDrive optional
  const ready = required.every(Boolean);
  const isDryRun = selectedMode.id === 's1';

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
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Mode (chaîne de production)</label>
                <select
                  value={selectedMode.id}
                  onChange={e => setSelectedMode(ALL_MODES.find(m => m.id === e.target.value) || PRODUCTION_CHAIN[0])}
                  className="mt-1 w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-foreground"
                >
                  <optgroup label="Chaîne de production (numérotée)">
                    {PRODUCTION_CHAIN.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Presets opérationnels">
                    {PRESETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                  <optgroup label="Presets avancés / legacy">
                    {LEGACY.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </optgroup>
                </select>
                {selectedMode.blockers && selectedMode.blockers.length > 0 && (
                  <div className="mt-2 rounded border border-amber/30 bg-amber/5 p-2 text-[11px] text-amber-700">
                    <p className="font-display font-semibold mb-1">Conditions requises :</p>
                    <ul className="space-y-0.5">
                      {selectedMode.blockers.map(b => <li key={b}>· {b}</li>)}
                    </ul>
                    <p className="mt-1 italic opacity-80">Persistance des runs en cours d'implémentation — résultats actuels non sauvegardés.</p>
                  </div>
                )}
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
              <h3 className="editorial-eyebrow">Checklist pré-run {loadingReadiness && <span className="text-[10px] text-muted-foreground">· vérification…</span>}</h3>
              <span className={`text-[11px] font-mono ${ready ? 'text-emerald-600' : 'text-amber'}`}>
                {ready ? (isDryRun ? 'prêt (dry run)' : 'prêt (live)') : 'non prêt — Lancer désactivé'}
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

          {/* Payload preview (mock until live orchestrator) */}
          <div className="cockpit-card space-y-3">
            <h3 className="editorial-eyebrow flex items-center gap-2"><Database size={11} /> Aperçu payload — mock</h3>
            <p className="text-[11px] text-muted-foreground">
              Aperçu indicatif des objets, indexes et tables qui seront mobilisés. Aucune écriture
              tant que la politique de persistance n'est pas validée et qu'un agent n'est pas live.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Objets envoyés</p>
                <p className="font-mono text-foreground/80">selon sélection</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Indexes consultés</p>
                <p className="font-mono text-primary">selon agents</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Modèle OpenAI</p>
                <p className="font-mono text-foreground/80">{readiness?.openai?.model ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Outputs attendus</p>
                <p className="font-mono text-foreground/80">findings · scores · rewrite_tasks</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Tables Supabase potentiellement touchées</p>
                <p className="font-mono text-accent">runs · run_outputs · audit_findings · rewrite_tasks</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-display hover:bg-primary/20 transition-colors">
              <Zap size={14} /> Simuler (dry run)
            </button>
            <button
              disabled={!ready || isDryRun}
              title={!ready ? 'OpenAI ou Supabase non branchés' : isDryRun ? 'Mode Dry Run sélectionné — change de mode pour lancer en live' : 'Lancer en live'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display ${ready && !isDryRun ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer' : 'bg-primary text-primary-foreground opacity-50 cursor-not-allowed'}`}
            >
              <Play size={14} /> Lancer le Run {!isDryRun && ready && '(live)'}
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
          <div className={`flex items-center gap-2 text-[11px] ${ready ? 'text-emerald-600' : 'text-amber'}`}>
            {ready ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            {ready
              ? (isDryRun
                ? 'Dry Run actif — aucun appel OpenAI ne sera effectué.'
                : `Live prêt — provider OpenAI (${readiness?.openai?.model ?? 'défaut'}).`)
              : '« Lancer le Run » désactivé tant que OpenAI et Supabase ne sont pas branchés.'}
          </div>
        </div>

        {/* Historique runs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="editorial-eyebrow">Historique des Runs</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-slate-500/10 text-slate-600 border-slate-500/30">mock history</span>
          </div>
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
