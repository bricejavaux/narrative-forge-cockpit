import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mic, Type, CheckCircle2, Loader2, Sparkles, AlertTriangle, Send, X, Copy } from 'lucide-react';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';
import { openaiService } from '@/services/openaiService';
import { audioTranscriptionService } from '@/services/audioTranscriptionService';
import MicRecorder from './MicRecorder';


interface NoteComposerProps {
  target: string;
  compact?: boolean;
  targetType?: string;
  targetId?: string;
  onApplied?: () => void;
}

type WorkflowStep = { key: string; label: string; status: 'done' | 'active' | 'pending' };

const CANON_FIELDS = ['summary','description','exceptions','criticality','rigidity','index_associated','source_reference'] as const;
const CHAR_FIELDS = ['role','function','apparent_goal','real_goal','flaw','secret','forbidden','emotional_trajectory','breaking_point'] as const;

function buildProposedPatch(targetType: string | undefined, structured: any): Record<string, any> {
  if (!structured || typeof structured !== 'object') return {};
  const fields = targetType === 'canon_object' ? CANON_FIELDS : targetType === 'character' ? CHAR_FIELDS : [];
  const out: Record<string, any> = {};
  // Direct field match
  for (const f of fields) {
    const v = structured[f] ?? structured.fields?.[f] ?? structured.patch?.[f];
    if (typeof v === 'string' && v.trim()) out[f] = v.trim();
  }
  return out;
}

export default function NoteComposer({ target, compact = false, targetType, targetId, onApplied }: NoteComposerProps) {
  const [tab, setTab] = useState<'text' | 'voice'>('text');
  const [text, setText] = useState('');
  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => { supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null)); }, []);

  const openaiOk = !!readiness?.openai?.api_key_configured;
  const hasInput = text.trim().length > 0 || transcript.length > 0;

  const canStructureText = openaiOk && text.trim().length > 0 && tab === 'text';
  const canApply = !!targetId && (targetType === 'canon_object' || targetType === 'character') && !!result;
  const proposed = canApply ? buildProposedPatch(targetType, result.structured ?? result) : {};
  const proposedKeys = Object.keys(proposed);

  const steps: WorkflowStep[] = [
    { key: 'captured', label: 'Capturé', status: hasInput ? 'done' : 'pending' },
    { key: 'transcribed', label: 'Transcrit (Whisper)', status: tab === 'voice' ? (transcript ? 'done' : transcribing ? 'active' : 'pending') : 'done' },
    { key: 'structured', label: 'Structuré (OpenAI)', status: result ? 'done' : busy ? 'active' : 'pending' },
    { key: 'validation', label: 'Validation humaine', status: applied ? 'done' : (result ? 'active' : 'pending') },
    { key: 'integrated', label: 'Intégré', status: applied ? 'done' : 'pending' },
    { key: 'indexed', label: 'Indexé', status: 'pending' },
  ];

  const submit = async () => {
    const payload = text.trim() || transcript.trim();
    if (!openaiOk || !payload) return;
    setBusy(true); setErr(null); setResult(null); setApplied(false);
    try { setResult(await openaiService.structureNote(payload, targetType, targetId)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'unknown error'); }
    finally { setBusy(false); }
  };

  const handleMicSubmit = async (blob: Blob, durationMs: number) => {
    if (!openaiOk) { setErr('OpenAI requis pour transcription.'); return; }
    setTranscribing(true); setErr(null); setTranscript('');
    try {
      const file = new File([blob], `note-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const up = await audioTranscriptionService.uploadAudio(file, targetType || 'generic', targetId, durationMs);
      if (!up.ok) throw new Error('Upload audio échoué: ' + up.error);
      const tr: any = await audioTranscriptionService.transcribe(up.audio_path, up.audio_note_id);
      if (tr?.mode === 'live' && typeof tr.transcript === 'string') {
        setTranscript(tr.transcript);
        toast.success(`Transcrit (${Math.round(durationMs / 1000)}s)`);
      } else {
        throw new Error(tr?.reason || tr?.error || 'Transcription échouée');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transcription échouée');
    } finally {
      setTranscribing(false);
    }
  };


  const applyPatch = async () => {
    if (!canApply || !targetId) return;
    const summary = proposedKeys.length
      ? proposedKeys.map(k => `${k}: ${String(proposed[k]).slice(0, 80)}`).join('\n')
      : 'Aucun champ direct — la note sera enregistrée dans metadata uniquement.';
    if (!window.confirm(`Appliquer cette proposition à ${target} ?\n\n${summary}\n\nLa modification sera tracée dans metadata.last_note_patch et needs_review repassera à true.`)) return;
    setApplying(true);
    const r = await supabaseService.applyStructuredNotePatch(
      targetType === 'canon_object' ? 'canon_objects' : 'characters',
      targetId,
      proposed,
      { raw_note: text, structured: result.structured ?? result, model: result.model }
    );
    setApplying(false);
    if (r.updated > 0) {
      toast.success(`Modification appliquée à ${target}`);
      setApplied(true);
      onApplied?.();
      try { window.dispatchEvent(new CustomEvent('supabase-records-refresh')); } catch {}
    } else {
      toast.error(`Application échouée : ${r.error || JSON.stringify(r.errors) || 'aucune ligne modifiée'}`);
    }
  };

  const copyJson = () => {
    try { navigator.clipboard.writeText(JSON.stringify(result.structured ?? result, null, 2)); toast.success('JSON copié'); } catch {}
  };

  const statusMessage = !openaiOk
    ? 'OpenAI requis pour structuration / transcription.'
    : tab === 'voice'
      ? 'Capture micro navigateur → upload Supabase → Whisper.'
      : 'Structuration de texte via OpenAI disponible.';

  const canSubmit = openaiOk && (text.trim().length > 0 || transcript.trim().length > 0);

  return (
    <div className={`rounded-xl border border-border bg-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <span className="editorial-eyebrow">Note · {target}</span>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/50">
          <button onClick={() => setTab('text')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${tab === 'text' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Type size={12} /> Texte
          </button>
          <button onClick={() => setTab('voice')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${tab === 'voice' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Mic size={12} /> Voix
          </button>
        </div>
      </div>

      {tab === 'text' ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Saisir un commentaire, une directive, une intuition…"
          className="w-full min-h-[72px] resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30" />
      ) : (
        <div className="space-y-2">
          <MicRecorder onSubmit={handleMicSubmit} busy={transcribing} disabled={!openaiOk}
            submitLabel={transcribing ? 'Transcription…' : 'Uploader & transcrire'} />
          {transcript && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
              <p className="editorial-eyebrow mb-1">Transcription Whisper</p>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
                className="w-full min-h-[60px] resize-none bg-transparent text-xs text-foreground focus:outline-none" />
            </div>
          )}
          {!openaiOk && (
            <p className="text-[10px] text-amber-600 font-mono inline-flex items-center gap-1">
              <AlertTriangle size={10} /> OpenAI absent — transcription désactivée. Notes texte restent disponibles.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${
              s.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' :
              s.status === 'active' ? 'border-cyan/30 bg-cyan/10 text-cyan' :
              'border-border bg-secondary/40 text-muted-foreground'
            }`}>
              {s.status === 'done' ? <CheckCircle2 size={10} /> : s.status === 'active' ? <Loader2 size={10} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
              {s.label}
            </div>
            {i < steps.length - 1 && <span className="text-muted-foreground/40 text-xs">→</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 gap-2">
        <span className={`text-[10px] font-mono inline-flex items-center gap-1 ${openaiOk ? 'text-muted-foreground' : 'text-amber'}`}>
          {openaiOk ? <Sparkles size={10} /> : <AlertTriangle size={10} />}
          {statusMessage}
        </span>
        <button disabled={!canSubmit || busy} onClick={submit}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
          {busy && <Loader2 size={11} className="animate-spin" />}
          Structurer via OpenAI
        </button>
      </div>

      {err && <p className="text-[11px] text-rose">{err}</p>}

      {result && (
        <div className="space-y-2 border-t border-border/60 pt-2">
          <p className="editorial-eyebrow">Proposition structurée</p>
          {canApply && (
            <div className="rounded-md border border-border/60 bg-secondary/30 p-2 space-y-1">
              <p className="text-[10px] font-mono text-muted-foreground">Patch ciblé ({proposedKeys.length} champ(s))</p>
              {proposedKeys.length > 0 ? (
                <ul className="text-[11px] space-y-0.5">
                  {proposedKeys.map(k => <li key={k}><span className="font-mono text-muted-foreground">{k}</span> → <span className="text-foreground">{String(proposed[k]).slice(0, 120)}</span></li>)}
                </ul>
              ) : (
                <p className="text-[11px] italic text-muted-foreground">Aucun champ structuré reconnu — la note brute sera enregistrée dans metadata.last_note_patch uniquement.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {canApply && (
              <button disabled={applying || applied} onClick={applyPatch}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
                {applying ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                {applied ? 'Appliqué' : 'Appliquer cette proposition'}
              </button>
            )}
            <button onClick={copyJson} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/60 inline-flex items-center gap-1.5">
              <Copy size={11} /> Copier JSON
            </button>
            <button onClick={() => { setResult(null); setApplied(false); }} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/60 inline-flex items-center gap-1.5">
              <X size={11} /> Ignorer
            </button>
          </div>
          <details className="text-[11px]">
            <summary className="text-muted-foreground cursor-pointer">Résultat brut — {result.mode ?? 'ok'} {result.model ? `· ${result.model}` : ''}</summary>
            <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded mt-1 overflow-auto max-h-48">{JSON.stringify(result.structured ?? result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
