import { useEffect, useState } from 'react';
import { audioNotes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import MicButton from '@/components/shared/MicButton';
import NoteComposer from '@/components/shared/NoteComposer';
import { Mic, Play } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

const subSections = ['Notes audio', 'Relectures chapitres', 'Commentaires beats', 'Revues cross-chapitres', 'Sessions de lecture', 'Historique vocal', 'Traçabilité'];

const recordVariants = [
  'Sur le canon', 'Sur un personnage', 'Sur un arc', 'Sur un beat',
  'Sur un brouillon', 'Sur un chapitre', 'Sur un audit', 'Sur un run'
];

export default function AudioPage() {
  const [activeSection, setActiveSection] = useState(subSections[0]);
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => { supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null)); }, []);
  const openaiReady = !!readiness?.openai?.api_key_configured;
  const audioPipelineReady = !!readiness?.openai?.transcription_pipeline_status && readiness.openai.transcription_pipeline_status !== 'no_key' && readiness.openai.transcription_pipeline_status !== 'pending_audio_pipeline';

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="editorial-eyebrow">Intelligence</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Audio & Reviews</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Vue transverse des notes vocales et lectures commentées. Le composer audio/texte
            apparaît également dans chaque page (canon, personnages, chapitres, agents, runs, diagnostics).
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${
          audioPipelineReady ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
          : openaiReady ? 'border-amber/30 bg-amber/5 text-amber'
          : 'border-rose/30 bg-rose/5 text-rose'
        }`}>
          <Mic size={12} />
          {audioPipelineReady
            ? 'Whisper actif'
            : openaiReady
              ? 'OpenAI configuré — pipeline fichier audio en attente'
              : 'Whisper simulé — clé OpenAI absente'}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {subSections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeSection === s ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'Notes audio' && (
        <div className="space-y-4">
          {/* Unified composer */}
          <NoteComposer target="nouvelle note transverse" />

          <div className="cockpit-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="editorial-eyebrow">Cibles rapides</h3>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${audioPipelineReady ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                {audioPipelineReady ? 'audio live' : 'pending_audio_pipeline'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recordVariants.map(v => (
                <MicButton key={v} label={v} size="md" />
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="cockpit-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Cible</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Durée</th>
                  <th className="text-left py-2 px-3">Transcription</th>
                  <th className="text-left py-2 px-3">Impact</th>
                  <th className="text-left py-2 px-3">Action proposée</th>
                  <th className="text-left py-2 px-3">Traitement</th>
                </tr>
              </thead>
              <tbody>
                {audioNotes.map(note => (
                  <tr key={note.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                    <td className="py-2 px-3 text-foreground">{note.target}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.targetType} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{note.date}</td>
                    <td className="py-2 px-3 text-xs font-mono text-foreground">{note.duration}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.transcriptionStatus} /></td>
                    <td className="py-2 px-3"><StatusBadge status={note.impact} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{note.proposedAction}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.treatmentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audio card detail */}
          <div className="cockpit-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Détail note audio — <span className="font-mono text-xs text-muted-foreground">exemple démo</span></h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Audio brut</span>
                <div className="mt-1 flex items-center gap-2 p-3 bg-surface-2 rounded">
                  <button className="text-rose cursor-not-allowed"><Play size={16} /></button>
                  <div className="flex-1 h-1 bg-surface-3 rounded-full"><div className="w-1/3 h-full bg-rose rounded-full" /></div>
                  <span className="text-xs font-mono text-muted-foreground">2:34</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Transcription brute</span>
                <p className="mt-1 text-xs text-muted-foreground italic bg-surface-2 p-3 rounded">
                  "Sur le Ch.6 Anvers — Brice ne doit pas expliquer la doctrine. Il la tient. Resserrer le dialogue avec le leader syndical, garder la sobriété."
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Structuration future</span>
                <p className="mt-1 text-xs text-muted-foreground font-mono bg-surface-2 p-3 rounded">→ Tâche: réécriture beat 8.5 · Priorité: haute · Agent: Réécriture Ciblée</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Impact & agent</span>
                <p className="mt-1 text-xs text-muted-foreground bg-surface-2 p-3 rounded">Impact élevé · Agent associé: Réécriture Ciblée · Version: v5</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'Relectures chapitres' && (
        <div className="cockpit-card space-y-4">
          <h3 className="font-display font-semibold text-foreground">Lecture commentée — Ch.5 Walvis Bay : « Nous avons ouvert. » (simulé)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-2 rounded p-4 text-sm text-muted-foreground leading-relaxed max-h-[400px] overflow-y-auto">
              <p className="text-foreground mb-4">[Extrait simulé — Ch.5]</p>
              <p>À 04:17, la fenêtre s'était ouverte sans eux. Brice apprit la nouvelle par un canal latéral, dans la voix neutre de Jonas : « Walvis Bay vient de coupler. » Pas d'autorisation du Trust, pas de latence consentie. Juste un État qui avait décidé que sa vitesse ne se discutait plus.</p>
              <p className="mt-3">Sur l'écran, ΔS oscillait à la limite haute de la fenêtre. R montait. Personne ne parlait, parce qu'il n'y avait rien à dire qui n'aurait pas l'air d'une plainte.</p>
              <p className="mt-3">Amina, depuis le SAS, transmit une seule ligne : « Nous avons ouvert. » Brice reposa la tasse. C'était le monde qui venait de basculer, dans une cuisine, à mi-voix.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Commentaires oraux</h4>
              {[
                { time: '0:45', text: 'Garder la sobriété du « 04:17 » — pas de dramatisation', status: 'done' },
                { time: '1:20', text: 'Jonas est trop neutre — un détail de corps suffirait', status: 'open' },
                { time: '2:10', text: 'La cuisine en clôture est juste — phrase-couteau à resserrer', status: 'in_progress' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-surface-2 rounded">
                  <span className="font-mono text-[10px] text-rose w-10 shrink-0">{c.time}</span>
                  <p className="text-xs text-foreground flex-1">{c.text}</p>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!['Notes audio', 'Relectures chapitres'].includes(activeSection) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Section « {activeSection} » — <span className="font-mono">design target</span></p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Nécessite : upload audio Supabase Storage + persistance audio_notes / audio_transcripts.
            Whisper : {audioPipelineReady ? 'live' : 'pending_audio_pipeline'}.
          </p>
        </div>
      )}
    </div>
  );
}
