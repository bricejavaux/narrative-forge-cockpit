import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertTriangle, Play, Trash2, Upload } from 'lucide-react';

export type MicRecorderState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'recording'; elapsed: number }
  | { kind: 'recorded'; blob: Blob; url: string; durationMs: number }
  | { kind: 'error'; reason: string };

interface Props {
  disabled?: boolean;
  onRecorded?: (blob: Blob, durationMs: number) => void;
  onSubmit?: (blob: Blob, durationMs: number) => Promise<void> | void;
  submitLabel?: string;
  busy?: boolean;
}

const SUPPORTED = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

export default function MicRecorder({ disabled, onRecorded, onSubmit, submitLabel = 'Uploader & transcrire', busy }: Props) {
  const [state, setState] = useState<MicRecorderState>({ kind: 'idle' });
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => () => {
    try { recRef.current?.stream.getTracks().forEach(t => t.stop()); } catch {}
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (state.kind === 'recorded') URL.revokeObjectURL(state.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (!SUPPORTED) { setState({ kind: 'error', reason: 'Capture micro navigateur non supportée (MediaRecorder).' }); return; }
    setState({ kind: 'requesting' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAtRef.current;
        setState({ kind: 'recorded', blob, url, durationMs });
        onRecorded?.(blob, durationMs);
        stream.getTracks().forEach(t => t.stop());
        if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      };
      recRef.current = mr;
      startedAtRef.current = Date.now();
      mr.start();
      setState({ kind: 'recording', elapsed: 0 });
      tickRef.current = window.setInterval(() => {
        setState((s) => s.kind === 'recording' ? { kind: 'recording', elapsed: Date.now() - startedAtRef.current } : s);
      }, 250);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Accès microphone refusé par le navigateur.'
        : e?.name === 'NotFoundError'
        ? 'Aucun microphone détecté.'
        : `Erreur micro : ${e?.message || 'inconnue'}`;
      setState({ kind: 'error', reason: msg });
    }
  };

  const stop = () => { try { recRef.current?.stop(); } catch {} };

  const discard = () => {
    if (state.kind === 'recorded') URL.revokeObjectURL(state.url);
    setState({ kind: 'idle' });
  };

  const submit = async () => {
    if (state.kind !== 'recorded' || !onSubmit) return;
    await onSubmit(state.blob, state.durationMs);
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!SUPPORTED) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-rose-600 rounded border border-rose-500/30 bg-rose-500/5 p-2">
        <AlertTriangle size={12} /> Capture micro navigateur non supportée par ce navigateur.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-3">
        {state.kind === 'recording' ? (
          <button onClick={stop} className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center hover:bg-rose-500/25">
            <Square size={14} fill="currentColor" />
          </button>
        ) : state.kind === 'requesting' ? (
          <button disabled className="w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
            <Loader2 size={14} className="animate-spin" />
          </button>
        ) : (
          <button onClick={start} disabled={disabled || busy}
            className="w-9 h-9 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-40">
            <Mic size={16} />
          </button>
        )}
        <div className="flex-1 text-[11px] font-mono">
          {state.kind === 'idle' && <span className="text-muted-foreground">Cliquez sur le micro pour démarrer l'enregistrement</span>}
          {state.kind === 'requesting' && <span className="text-muted-foreground">Demande d'accès microphone…</span>}
          {state.kind === 'recording' && <span className="text-rose-600">● Enregistrement {fmt(state.elapsed)}</span>}
          {state.kind === 'recorded' && <span className="text-emerald-600">Enregistré · {fmt(state.durationMs)}</span>}
          {state.kind === 'error' && <span className="text-rose-600 inline-flex items-center gap-1"><AlertTriangle size={11} /> {state.reason}</span>}
        </div>
        {state.kind === 'recorded' && (
          <button onClick={discard} className="p-1.5 text-muted-foreground hover:text-rose-600" title="Effacer">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {state.kind === 'recorded' && (
        <div className="space-y-2">
          <audio src={state.url} controls className="w-full h-8" />
          {onSubmit && (
            <button onClick={submit} disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {submitLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
