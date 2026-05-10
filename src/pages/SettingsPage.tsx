import { useState } from 'react';
import { connectors } from '@/data/dummyData';
import ConnectorStatusCard from '@/components/shared/ConnectorStatusCard';
import ConnectionReadinessPanel from '@/components/shared/ConnectionReadinessPanel';
import OneDriveRepositoryPanel from '@/components/shared/OneDriveRepositoryPanel';
import OpenAITestPanel from '@/components/shared/OpenAITestPanel';
import DataFlowDoctrineBanner from '@/components/shared/DataFlowDoctrineBanner';
import { getRuntimeMode, setRuntimeMode, type RuntimeMode } from '@/lib/runtimeMode';
import { Sliders, Mic } from 'lucide-react';

function NarrativeSlider({ label, value, min = 0, max = 100 }: { label: string; value: number; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value} readOnly
        className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
    </div>
  );
}

function Toggle({ label, value, hint }: { label: string; value: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {hint && !value && <span className="text-[10px] font-mono text-muted-foreground">{hint}</span>}
        <div className={`w-9 h-5 rounded-full ${value ? 'bg-primary/80' : 'bg-secondary'} relative cursor-not-allowed border border-border`}>
          <div className={`w-4 h-4 rounded-full bg-card shadow-sm absolute top-0 transition-all ${value ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
    </div>
  );
}

function RuntimeModeSwitch() {
  const [mode, setMode] = useState<RuntimeMode>(getRuntimeMode());
  const update = (m: RuntimeMode) => { setRuntimeMode(m); setMode(m); };
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 flex items-center justify-between">
      <div>
        <p className="editorial-eyebrow">Mode runtime</p>
        <h4 className="text-sm font-medium text-foreground mt-1">
          {mode === 'connected' ? 'Connected — lecture Supabase + fallback mock par fonction' : 'Mock — dummy data uniquement'}
        </h4>
        <p className="text-[11px] text-muted-foreground mt-1">
          Les Edge Functions OpenAI dégradent automatiquement en mock si la clé n'est pas configurée.
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <button
          onClick={() => update('mock')}
          className={`px-3 py-1.5 rounded-md border ${mode === 'mock' ? 'bg-secondary border-border text-foreground' : 'border-transparent text-muted-foreground'}`}
        >mock</button>
        <button
          onClick={() => update('connected')}
          className={`px-3 py-1.5 rounded-md border ${mode === 'connected' ? 'bg-primary/10 border-primary/40 text-foreground' : 'border-transparent text-muted-foreground'}`}
        >connected</button>
      </div>
    </div>
  );
}

const sections = [
  'Connecteurs',
  'Readiness Supabase / OpenAI / OneDrive',
  'Paramètres narratifs',
  'Gouvernance réécriture',
  'Indexes & sync',
  'Audio & transcription',
  'Diagnostics',
  'Exports',
  'Logs & validation humaine',
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(sections[0]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Système</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Réglages</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Architecture cible : <span className="text-foreground">OneDrive</span> pour le référentiel
          documentaire long terme, <span className="text-foreground">Supabase</span> pour la couche
          narrative active, <span className="text-foreground">OpenAI</span> pour l'orchestration
          et l'intelligence.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeSection === s ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'Connecteurs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((c) => (
            <ConnectorStatusCard key={c.id} name={c.name} description={c.description} status={c.status} note={c.note} />
          ))}
        </div>
      )}

      {activeSection === 'Readiness Supabase / OpenAI / OneDrive' && (
        <div className="space-y-5">
          <RuntimeModeSwitch />
          <div className="cockpit-card space-y-2">
            <p className="editorial-eyebrow">Runtime AI Provider</p>
            <h3 className="text-base editorial-heading text-foreground">OpenAI via Supabase Edge Functions</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mt-2">
              <li>• <span className="text-foreground">Attendu :</span> OpenAI uniquement (clé stockée en secret Edge Function).</li>
              <li>• <span className="text-foreground">Actuel :</span> OpenAI si <code>OPENAI_API_KEY</code> présent, sinon <em>not configured</em>.</li>
              <li>• <span className="text-foreground">Références Gemini en runtime :</span> doivent être à zéro.</li>
              <li>• <span className="text-foreground">Lovable AI Gateway :</span> usage interne Lovable, jamais runtime application.</li>
              <li>• <span className="text-foreground">RLS :</span> activé sans policies — écritures via Edge Functions, lectures en mock/fallback tant que les policies ne sont pas écrites.</li>
            </ul>
          </div>
          <ConnectionReadinessPanel />
          <OpenAITestPanel />
          <OneDriveRepositoryPanel />
        </div>
      )}

      {activeSection === 'Paramètres narratifs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="cockpit-card space-y-4">
            <h3 className="editorial-eyebrow flex items-center gap-2"><Sliders size={12} /> Structure & rythme</h3>
            <NarrativeSlider label="Longueur cible (mots)" value={3500} min={1000} max={6000} />
            <NarrativeSlider label="Amplitude de variation" value={15} />
            <NarrativeSlider label="Tempo" value={65} />
            <NarrativeSlider label="Respiration" value={40} />
            <NarrativeSlider label="Compression" value={30} />
            <NarrativeSlider label="Fragmentation temporelle" value={25} />
            <NarrativeSlider label="Fragmentation POV" value={35} />
          </div>
          <div className="cockpit-card space-y-4">
            <h3 className="editorial-eyebrow flex items-center gap-2"><Sliders size={12} /> Tonalité & densité</h3>
            <NarrativeSlider label="Densité scientifique" value={55} />
            <NarrativeSlider label="Densité émotionnelle" value={70} />
            <NarrativeSlider label="Niveau de mystère" value={72} />
            <NarrativeSlider label="Charge personnages" value={60} />
            <NarrativeSlider label="Délai avant payoff" value={60} />
            <NarrativeSlider label="Brutalité des bascules" value={45} />
            <NarrativeSlider label="Répétition max. tolérée" value={20} />
          </div>
        </div>
      )}

      {activeSection === 'Gouvernance réécriture' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2">Règles de réécriture</h3>
          <Toggle label="Validation humaine obligatoire avant écriture" value={true} />
          <Toggle label="Journalisation complète des diffs" value={true} />
          <Toggle label="Conservation des versions précédentes" value={true} />
          <Toggle label="Réécriture profonde autorisée" value={false} hint="approbation auteur requise" />
          <Toggle label="Style pass automatique post-réécriture" value={true} />
          <Toggle label="Rollback en un clic" value={true} />
        </div>
      )}

      {activeSection === 'Indexes & sync' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2">Synchronisation des indexes</h3>
          <Toggle label="Réindexer après chaque import OneDrive" value={true} hint="OneDrive requis" />
          <Toggle label="Réindexer après chaque validation chapitre" value={true} />
          <Toggle label="Détection automatique des indexes obsolètes" value={true} />
          <Toggle label="Verrouiller les indexes pendant les runs" value={false} />
          <Toggle label="Notifier en cas d'index absent" value={true} />
        </div>
      )}

      {activeSection === 'Audio & transcription' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2 flex items-center gap-2"><Mic size={12} /> Audio & transcription</h3>
          {[
            ['Microphone sur les fiches personnages', true, undefined],
            ['Microphone sur les chapitres', true, undefined],
            ['Microphone sur les beats', true, undefined],
            ['Microphone sur les agents (tuning vocal)', true, undefined],
            ['Transcription automatique (Whisper)', false, 'OpenAI requis'],
            ['Structuration post-transcription', false, 'OpenAI requis'],
            ['Indexation des notes vocales', false, 'Supabase requis'],
            ['Conservation audio brut', true, undefined],
            ['Validation humaine avant intégration', true, undefined],
            ['Traçabilité complète', true, undefined],
          ].map(([l, v, h]) => (
            <Toggle key={l as string} label={l as string} value={v as boolean} hint={h as string | undefined} />
          ))}
        </div>
      )}

      {activeSection === 'Diagnostics' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2">Diagnostics</h3>
          <Toggle label="Score global recalculé après chaque run" value={true} />
          <Toggle label="Alertes seuil score < 60" value={true} />
          <Toggle label="Alertes payoff manquant > 3 chapitres" value={true} />
          <Toggle label="Comparaison avant/après réécriture" value={true} />
          <Toggle label="Recommandations générées automatiquement" value={false} hint="OpenAI requis" />
        </div>
      )}

      {activeSection === 'Exports' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2">Exports — formats texte uniquement</h3>
          <Toggle label="Export Markdown" value={true} />
          <Toggle label="Export JSON structuré" value={true} />
          <Toggle label="Export texte brut" value={true} />
          <Toggle label="Inclure métadonnées de version" value={true} />
          <Toggle label="Inclure scores diagnostiques" value={false} />
          <p className="text-[11px] text-muted-foreground font-mono pt-2">Cover generation désactivée pour cette phase.</p>
        </div>
      )}

      {activeSection === 'Logs & validation humaine' && (
        <div className="cockpit-card space-y-1">
          <h3 className="editorial-eyebrow mb-2">Journalisation & gouvernance humaine</h3>
          <Toggle label="Journaliser chaque run avec inputs / outputs" value={true} />
          <Toggle label="Conserver les diffs avant/après réécriture" value={true} />
          <Toggle label="Validation humaine avant intégration des notes audio" value={true} />
          <Toggle label="Validation humaine avant publication d'un export" value={true} />
          <Toggle label="Politique de rétention audio brut — 90 jours" value={true} />
          <Toggle label="Politique de rafraîchissement des indexes — quotidienne" value={true} />
          <Toggle label="Priorité d'export : Markdown → JSON → DOCX → EPUB" value={true} />
        </div>
      )}

      {![
        'Connecteurs', 'Readiness Supabase / OpenAI / OneDrive', 'Paramètres narratifs',
        'Gouvernance réécriture', 'Indexes & sync', 'Audio & transcription',
        'Diagnostics', 'Exports', 'Logs & validation humaine',
      ].includes(activeSection) && (
        <div className="cockpit-card p-10 text-center">
          <p className="text-muted-foreground text-sm">Section "{activeSection}" — simulée</p>
        </div>
      )}
    </div>
  );
}
