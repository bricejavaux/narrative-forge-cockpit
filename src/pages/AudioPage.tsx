import { useEffect, useState } from 'react';
import { audioNotes } from '@/data/dummyData';
import { isDemoMode } from '@/lib/productionMode';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import AudioReviewTypesPanel from '@/components/shared/AudioReviewTypesPanel';
import { Mic } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';
import { supabase } from '@/integrations/supabase/client';

const subSections = ['Notes audio', 'Types de relecture', 'Sessions de lecture'];

export default function AudioPage() {
  const [activeSection, setActiveSection] = useState(subSections[0]);
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [persistedNotes, setPersistedNotes] = useState<any[]>([]);
  const demo = isDemoMode();

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    supabase.from('audio_notes').select('id, target, target_type, transcription_status, treatment_status, created_at, duration').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setPersistedNotes(data ?? []));
  }, []);

  const openaiReady = !!readiness?.openai?.api_key_configured;
  const micSupported = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

  const caps: { name: string; status: 'live' | 'pending' | 'blocked'; reason?: string }[] = [
    { name: 'Notes texte', status: 'live' },
    { name: 'Structuration OpenAI', status: openaiReady ? 'live' : 'blocked', reason: openaiReady ? undefined : 'OPENAI_API_KEY absent' },
    { name: 'Capture micro navigateur', status: micSupported ? 'live' : 'blocked', reason: micSupported ? undefined : 'MediaRecorder non supporté' },
    { name: 'Upload Supabase Storage (audio)', status: 'live' },
    { name: 'Transcription Whisper', status: openaiReady ? 'live' : 'blocked', reason: openaiReady ? undefined : 'OPENAI_API_KEY absent' },
    { name: 'Application note → patch (canon/personnages)', status: 'live' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="editorial-eyebrow">Atelier</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Audio & relectures</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Notes texte, voix (MediaRecorder), transcriptions Whisper et retours de lecture. Le composer
            est disponible partout dans l'app.
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${
          openaiReady && micSupported ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
          : openaiReady ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
          : 'border-rose-500/30 bg-rose-500/5 text-rose-700'
        }`}>
          <Mic size={12} />
          {openaiReady && micSupported ? 'Pipeline audio : capture + Whisper opérationnel'
            : openaiReady ? 'OpenAI prêt — micro à autoriser au premier usage'
            : 'OpenAI absent — transcription désactivée'}
        </div>
      </div>

      <div className="cockpit-card p-3">
        <p className="editorial-eyebrow mb-2">Capacités audio (réelles)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
          {caps.map((c) => (
            <div key={c.name} className={`rounded border p-2 ${
              c.status === 'live' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
              : c.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
              : 'border-rose-500/30 bg-rose-500/5 text-rose-700'
            }`}>
              <p className="font-display text-[11px] leading-tight">{c.name}</p>
              <p className="font-mono text-[10px] mt-1 opacity-80">{c.status}{c.reason ? ` · ${c.reason}` : ''}</p>
            </div>
          ))}
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
          <NoteComposer target="nouvelle note transverse" targetType="generic" />

          <div className="cockpit-card overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="editorial-eyebrow">Notes persistées (Supabase)</h3>
              <span className="text-[10px] font-mono text-muted-foreground">{persistedNotes.length} note(s)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Cible</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Durée</th>
                  <th className="text-left py-2 px-3">Transcription</th>
                  <th className="text-left py-2 px-3">Traitement</th>
                </tr>
              </thead>
              <tbody>
                {persistedNotes.length > 0 ? persistedNotes.map(n => (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-surface-2">
                    <td className="py-2 px-3 text-foreground">{n.target}</td>
                    <td className="py-2 px-3"><StatusBadge status={n.target_type} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs font-mono text-foreground">{n.duration ?? '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={n.transcription_status} /></td>
                    <td className="py-2 px-3"><StatusBadge status={n.treatment_status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                    Aucune note audio persistée — utiliser le composer ci-dessus pour en créer.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {demo && (
            <div className="cockpit-card">
              <p className="editorial-eyebrow mb-2">Demo only — exemples</p>
              <table className="w-full text-xs">
                <tbody>
                  {audioNotes.map(note => (
                    <tr key={note.id} className="border-b border-border/50">
                      <td className="py-1.5 px-2 text-foreground">{note.target}</td>
                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{note.date}</td>
                      <td className="py-1.5 px-2"><StatusBadge status={note.transcriptionStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSection === 'Types de relecture' && <AudioReviewTypesPanel />}

      {activeSection === 'Sessions de lecture' && (
        <div className="cockpit-card p-8 text-center text-xs text-muted-foreground">
          Sessions de lecture commentée — Phase 2 (review_sessions). Aucune session démarrée.
        </div>
      )}
    </div>
  );
}
