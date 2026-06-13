import { useEffect, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import AudioReviewTypesPanel from '@/components/shared/AudioReviewTypesPanel';
import ReviewSessionsPanel from '@/components/shared/ReviewSessionsPanel';
import { Mic, X, Copy, CheckCheck, Wand2, Loader2 } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';
import { supabase } from '@/integrations/supabase/client';
import { audioTranscriptionService } from '@/services/audioTranscriptionService';

const subSections = ['Notes audio', 'Types de relecture', 'Sessions de lecture'];

type NoteRow = {
  id: string; target: string | null; target_type: string | null; target_id: string | null;
  storage_path: string | null; duration: string | null;
  transcription_status: string | null; treatment_status: string | null;
  proposed_action: string | null; metadata: any; created_at: string;
};
type TranscriptRow = {
  id: string; audio_note_id: string; raw_text: string | null;
  structured: any; model: string | null; status: string | null;
};

export default function AudioPage() {
  const [activeSection, setActiveSection] = useState(subSections[0]);
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [persistedNotes, setPersistedNotes] = useState<NoteRow[]>([]);
  const [openNote, setOpenNote] = useState<NoteRow | null>(null);
  const [transcript, setTranscript] = useState<TranscriptRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = () => {
    supabase.from('audio_notes')
      .select('id, target, target_type, target_id, storage_path, duration, transcription_status, treatment_status, proposed_action, metadata, created_at')
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setPersistedNotes((data ?? []) as NoteRow[]));
  };

  useEffect(() => {
    supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null));
    reload();
  }, []);

  const openaiReady = !!readiness?.openai?.api_key_configured;
  const micSupported = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

  const openDetail = async (n: NoteRow) => {
    setOpenNote(n); setTranscript(null); setCopied(false);
    const { data } = await supabase.from('audio_transcripts')
      .select('*').eq('audio_note_id', n.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setTranscript((data ?? null) as TranscriptRow | null);
  };

  const structureNow = async () => {
    if (!openNote || !transcript?.raw_text) return;
    setBusy(true);
    try {
      const res = await audioTranscriptionService.structure(transcript.raw_text, openNote.target_type ?? undefined, openNote.target_id ?? undefined);
      const structured = (res as any)?.structured ?? (res as any)?.parsed ?? res;
      await supabase.from('audio_transcripts').update({ structured }).eq('id', transcript.id);
      await openDetail(openNote);
    } finally { setBusy(false); }
  };

  const markTreated = async () => {
    if (!openNote) return;
    await supabase.from('audio_notes').update({ treatment_status: 'treated' }).eq('id', openNote.id);
    reload();
    setOpenNote((n) => n ? { ...n, treatment_status: 'treated' } : n);
  };

  const promoteFromStructured = async () => {
    if (!openNote || !transcript?.structured) return;
    const s: any = transcript.structured;
    const action = s?.proposed_action ?? s?.action ?? s?.recommendation ?? null;
    if (!action) { window.alert('Aucune action proposée détectée dans la structuration.'); return; }
    const { error } = await supabase.from('rewrite_tasks').insert({
      target_type: openNote.target_type ?? 'generic',
      target_id: openNote.target_id ?? null,
      title: String(s?.title ?? 'Action issue d\'une note audio').slice(0, 200),
      proposal: typeof action === 'string' ? action : JSON.stringify(action),
      instruction: s?.instruction ?? null,
      status: 'pending',
      requires_validation: true,
      created_by_agent: 'audio_note',
      metadata: { source_audio_note_id: openNote.id, source_transcript_id: transcript.id },
    });
    if (error) { window.alert(error.message); return; }
    window.alert('Commande corrective créée (status=pending, validation humaine requise).');
  };

  const caps: { name: string; status: 'live' | 'pending' | 'blocked'; reason?: string }[] = [
    { name: 'Notes texte', status: 'live' },
    { name: 'Structuration OpenAI', status: openaiReady ? 'live' : 'blocked', reason: openaiReady ? undefined : 'OPENAI_API_KEY absent' },
    { name: 'Capture micro navigateur', status: micSupported ? 'live' : 'blocked', reason: micSupported ? undefined : 'MediaRecorder non supporté' },
    { name: 'Upload Supabase Storage (audio)', status: 'live' },
    { name: 'Transcription Whisper', status: openaiReady ? 'live' : 'blocked', reason: openaiReady ? undefined : 'OPENAI_API_KEY absent' },
    { name: 'Lecture audio in-app', status: 'pending', reason: 'non implémenté — fonction signed-URL service-role manquante' },
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {persistedNotes.length > 0 ? persistedNotes.map(n => (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-surface-2 cursor-pointer" onClick={() => openDetail(n)}>
                    <td className="py-2 px-3 text-foreground">{n.target ?? '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={n.target_type ?? 'generic'} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs font-mono text-foreground">{n.duration ?? '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={n.transcription_status ?? 'pending'} /></td>
                    <td className="py-2 px-3"><StatusBadge status={n.treatment_status ?? 'open'} /></td>
                    <td className="py-2 px-3 text-[10px] font-mono text-primary">Ouvrir →</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                    Aucune note audio persistée — utiliser le composer ci-dessus pour en créer.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'Types de relecture' && <AudioReviewTypesPanel />}

      {activeSection === 'Sessions de lecture' && <ReviewSessionsPanel />}

      {/* Detail drawer */}
      {openNote && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setOpenNote(null)} />
          <div className="w-full max-w-xl h-full bg-background border-l border-border overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm text-foreground">Note audio · <span className="font-mono text-xs">{openNote.id.slice(0, 8)}</span></p>
              <button onClick={() => setOpenNote(null)} className="p-1 rounded hover:bg-secondary"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Cible</p><p className="font-mono">{openNote.target ?? '—'}</p></div>
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Type / id</p><p className="font-mono truncate">{openNote.target_type ?? '—'} · {openNote.target_id?.slice(0, 8) ?? '—'}</p></div>
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Storage path</p><p className="font-mono break-all text-[10px]">{openNote.storage_path ?? '—'}</p></div>
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Durée</p><p className="font-mono">{openNote.duration ?? '—'}</p></div>
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Transcription</p><p className="font-mono">{openNote.transcription_status ?? '—'}</p></div>
              <div className="rounded border border-border p-2"><p className="editorial-eyebrow">Traitement</p><p className="font-mono">{openNote.treatment_status ?? '—'}</p></div>
            </div>

            <div className="rounded border border-border p-2 bg-amber-500/5 text-[11px] text-amber-700">
              Lecture audio future — transcript disponible. (signed-URL service-role : non implémenté)
            </div>

            <div>
              <p className="editorial-eyebrow mb-1">Transcript brut</p>
              {transcript?.raw_text ? (
                <pre className="text-[11px] whitespace-pre-wrap p-2 rounded border border-border bg-secondary/30 max-h-60 overflow-auto">{transcript.raw_text}</pre>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Aucun transcript persisté pour cette note.</p>
              )}
              <div className="flex gap-1 flex-wrap mt-2">
                {transcript?.raw_text && (
                  <button onClick={() => { navigator.clipboard.writeText(transcript.raw_text ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="text-[10px] px-2 py-1 rounded border border-border inline-flex items-center gap-1">
                    {copied ? <CheckCheck size={10} className="text-emerald-600" /> : <Copy size={10} />} Copier
                  </button>
                )}
                {transcript?.raw_text && openaiReady && (
                  <button onClick={structureNow} disabled={busy}
                    className="text-[10px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary inline-flex items-center gap-1 disabled:opacity-50">
                    {busy ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} Structurer via OpenAI
                  </button>
                )}
                {transcript?.structured && (
                  <button onClick={promoteFromStructured}
                    className="text-[10px] px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary">
                    Créer commande corrective
                  </button>
                )}
                {openNote.treatment_status !== 'treated' && (
                  <button onClick={markTreated}
                    className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-700">
                    Marquer traité
                  </button>
                )}
              </div>
            </div>

            {transcript?.structured && (
              <div>
                <p className="editorial-eyebrow mb-1">Structuration</p>
                <pre className="text-[10px] font-mono whitespace-pre-wrap p-2 rounded border border-border bg-secondary/30 max-h-60 overflow-auto">{JSON.stringify(transcript.structured, null, 2)}</pre>
              </div>
            )}

            {openNote.proposed_action && (
              <div>
                <p className="editorial-eyebrow mb-1">Action proposée</p>
                <p className="text-[11px]">{openNote.proposed_action}</p>
              </div>
            )}

            {openNote.metadata && (
              <details className="text-[10px]">
                <summary className="cursor-pointer text-muted-foreground">Metadata</summary>
                <pre className="font-mono p-2 rounded border border-border bg-secondary/30 max-h-40 overflow-auto">{JSON.stringify(openNote.metadata, null, 2)}</pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
