import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, CheckCircle2, AlertTriangle, Circle, Ban } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

type ActionStatus = 'wired' | 'disabled' | 'stubbed' | 'future' | 'mock';

type ActionEntry = {
  id: string;
  label: string;
  page: string;
  route: string;
  handler: string;
  status: ActionStatus;
  dependencies: string[];
  failureReason?: string;
};

const STATUS_STYLE: Record<ActionStatus, string> = {
  wired: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  disabled: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  stubbed: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  future: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  mock: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
};

const STATUS_ICON: Record<ActionStatus, JSX.Element> = {
  wired: <CheckCircle2 size={11} />,
  disabled: <AlertTriangle size={11} />,
  stubbed: <Circle size={11} />,
  future: <Circle size={11} />,
  mock: <Ban size={11} />,
};

function buildRegistry(r: ConnectionReadiness | null): ActionEntry[] {
  const openai = !!r?.openai?.api_key_configured;
  const onedrive = !!r?.onedrive?.oauth_configured;
  const audioLive = r?.openai?.transcription_pipeline_status === 'transcription_live';
  const pgv = !!r?.indexes?.pgvector_ready;

  const w = (cond: boolean, dep: string): ActionStatus => (cond ? 'wired' : 'disabled');

  return [
    { id: 'generate_recommendations', label: 'Générer les recommandations', page: 'Diagnostics', route: '/diagnostics',
      handler: 'openai-generate-diagnostic', status: w(openai, 'OpenAI'),
      dependencies: ['OpenAI'], failureReason: openai ? undefined : 'OpenAI non configuré.' },
    { id: 'generate_live_diagnostic', label: 'Générer un diagnostic live', page: 'Diagnostics', route: '/diagnostics',
      handler: 'openai-generate-diagnostic', status: w(openai, 'OpenAI'),
      dependencies: ['OpenAI'], failureReason: openai ? undefined : 'OpenAI non configuré.' },
    { id: 'open_risky_chapters', label: 'Ouvrir les chapitres à risque', page: 'Diagnostics', route: '/diagnostics',
      handler: 'route filter score<60', status: 'wired', dependencies: ['—'] },
    { id: 'voice_review_diagnostic', label: 'Relecture vocale du diagnostic', page: 'Diagnostics', route: '/audio',
      handler: 'audio pipeline', status: audioLive ? 'wired' : 'disabled',
      dependencies: ['Whisper pipeline'], failureReason: audioLive ? undefined : 'Pipeline audio pending — note texte disponible.' },
    { id: 'structure_text_note', label: 'Structurer note texte (OpenAI)', page: 'Audio / pages', route: '/audio',
      handler: 'openai-structure-note', status: w(openai, 'OpenAI'),
      dependencies: ['OpenAI'], failureReason: openai ? undefined : 'OpenAI non configuré.' },
    { id: 'upload_transcribe_audio', label: 'Upload + transcription audio', page: 'Audio', route: '/audio',
      handler: 'openai-transcribe-audio', status: audioLive ? 'wired' : 'disabled',
      dependencies: ['Storage audio', 'OpenAI'], failureReason: audioLive ? undefined : 'Pipeline upload/transcription en attente.' },
    { id: 'import_articulation', label: 'Importer articulation', page: 'Assets', route: '/assets',
      handler: 'import-source + openai-extract-canon', status: w(openai && onedrive, 'OneDrive+OpenAI'),
      dependencies: ['OneDrive', 'OpenAI'] },
    { id: 'import_personnages', label: 'Importer personnages', page: 'Assets', route: '/assets',
      handler: 'import-source + openai-extract-characters', status: w(openai && onedrive, 'OneDrive+OpenAI'),
      dependencies: ['OneDrive', 'OpenAI'] },
    { id: 'sync_vector_packages', label: 'Sync vector packages', page: 'Indexes', route: '/indexes',
      handler: 'vector-package-sync', status: 'wired', dependencies: ['OneDrive'] },
    { id: 'export_txt_md_json', label: 'Export txt / md / json', page: 'Exports', route: '/exports',
      handler: 'export-text', status: 'wired', dependencies: ['—'] },
    { id: 'generate_planned_beats', label: 'Générer beats prévus', page: 'Production', route: '/production',
      handler: 'beats-plan', status: w(openai, 'OpenAI'), dependencies: ['OpenAI', 'Chapter'] },
    { id: 'validate_planned_beats', label: 'Valider beats prévus', page: 'Production', route: '/production',
      handler: 'BeatValidationPanel', status: 'wired', dependencies: ['Beats prévus'] },
    { id: 'generate_chapter_from_beats', label: 'Générer chapitre depuis beats validés', page: 'Production', route: '/production',
      handler: 'chapter-generate (gated)', status: w(openai, 'OpenAI + beats validés'),
      dependencies: ['OpenAI', 'Beats validés', 'Canon', 'Personnages'] },
    { id: 'extract_observed_beats', label: 'Extraire beats observés', page: 'Production', route: '/production',
      handler: 'beats-extract-observed', status: w(openai, 'OpenAI + chapter full_text'),
      dependencies: ['OpenAI', 'Chapter full_text'] },
    { id: 'audit_chapter_vs_beats', label: 'Auditer chapitre vs beats', page: 'Production', route: '/production',
      handler: 'BeatComparisonPanel', status: 'wired', dependencies: ['Beats prévus + observés'] },
    { id: 'create_rewrite_tasks', label: 'Créer rewrite tasks', page: 'Production', route: '/production',
      handler: 'RewriteTasksPanel', status: 'stubbed', dependencies: ['—'],
      failureReason: 'Création manuelle uniquement — génération automatique pending.' },
    { id: 'lock_chapter', label: 'Verrouiller chapitre', page: 'Production', route: '/production',
      handler: 'chapter-lock', status: 'wired', dependencies: ['Chapter audité'] },
    { id: 'autonomous_rewrite', label: 'Réécriture autonome', page: 'Runs', route: '/runs',
      handler: '—', status: 'disabled', dependencies: ['Validation humaine'],
      failureReason: 'Désactivé intentionnellement — validation humaine requise.' },
    { id: 'run_persistence', label: 'Persistance des runs (live)', page: 'Runs', route: '/runs',
      handler: '—', status: 'future', dependencies: ['Orchestrateur'],
      failureReason: 'Edge function de run live + écriture runs/run_outputs non implémentée.' },
  ];
}

export default function QAActionRegistryPanel() {
  const [r, setR] = useState<ConnectionReadiness | null>(null);
  const [filter, setFilter] = useState<'all' | ActionStatus>('all');
  useEffect(() => { supabaseService.getReadiness().then(setR).catch(() => setR(null)); }, []);
  const entries = buildRegistry(r);
  const visible = filter === 'all' ? entries : entries.filter(e => e.status === filter);

  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1; return acc;
  }, {});

  return (
    <div className="cockpit-card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground">QA actions &amp; boutons</h3>
          <p className="text-[11px] text-muted-foreground">État réel de chaque action déclencheur côté UI. Aucun bouton « live » ne doit apparaître sans handler.</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(['all', 'wired', 'disabled', 'stubbed', 'future', 'mock'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-1.5 py-0.5 rounded border ${filter === s ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {s}{s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-1.5 pr-3">Action</th>
              <th className="text-left py-1.5 pr-3">Page</th>
              <th className="text-left py-1.5 pr-3">Handler</th>
              <th className="text-left py-1.5 pr-3">Statut</th>
              <th className="text-left py-1.5 pr-3">Dépendances</th>
              <th className="text-left py-1.5">Raison / blocage</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(e => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-foreground">{e.label}</td>
                <td className="py-1.5 pr-3 text-muted-foreground">
                  <Link to={e.route} className="inline-flex items-center gap-1 hover:text-primary">
                    {e.page} <ExternalLink size={9} />
                  </Link>
                </td>
                <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground">{e.handler}</td>
                <td className="py-1.5 pr-3">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${STATUS_STYLE[e.status]} text-[10px] font-mono`}>
                    {STATUS_ICON[e.status]}{e.status}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-[10px] text-muted-foreground">{e.dependencies.join(', ')}</td>
                <td className="py-1.5 text-[10px] text-muted-foreground">{e.failureReason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Tout bouton « primaire » sans handler doit être désactivé et labellé. Cette table sert de référence QA pour les tests.
      </p>
    </div>
  );
}
