import { useState } from 'react';
import { Mic, Type, Square, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface NoteComposerProps {
  target: string;
  compact?: boolean;
}

type WorkflowStep = { key: string; label: string; status: 'done' | 'active' | 'pending' };

const baseSteps = (recordedOrTyped: boolean): WorkflowStep[] => [
  { key: 'captured', label: 'Capturé', status: recordedOrTyped ? 'done' : 'pending' },
  { key: 'transcribed', label: 'Transcrit (Whisper)', status: 'pending' },
  { key: 'structured', label: 'Structuré (OpenAI)', status: 'pending' },
  { key: 'validation', label: 'Validation humaine', status: 'pending' },
  { key: 'integrated', label: 'Intégré', status: 'pending' },
  { key: 'indexed', label: 'Indexé', status: 'pending' },
];

export default function NoteComposer({ target, compact = false }: NoteComposerProps) {
  const [tab, setTab] = useState<'text' | 'voice'>('text');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);

  const hasInput = text.trim().length > 0 || recording;
  const steps = baseSteps(hasInput);

  return (
    <div className={`rounded-xl border border-border bg-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="editorial-eyebrow">Note · {target}</span>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/50">
          <button
            onClick={() => setTab('text')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${tab === 'text' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Type size={12} /> Texte
          </button>
          <button
            onClick={() => setTab('voice')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${tab === 'voice' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Mic size={12} /> Voix
          </button>
        </div>
      </div>

      {tab === 'text' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Saisir un commentaire, une directive, une intuition…"
          className="w-full min-h-[72px] resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-3">
          <button
            onClick={() => setRecording(!recording)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-rose/15 text-rose' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            title="Simulé"
          >
            {recording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
            {recording && <span className="absolute inset-0 rounded-full border border-rose/40 animate-ping" />}
          </button>
          <div className="flex-1">
            <div className="h-7 flex items-end gap-0.5">
              {Array.from({ length: 32 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-sm ${recording ? 'bg-rose/60' : 'bg-border'}`}
                  style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`, opacity: recording ? 0.6 + (i % 5) * 0.08 : 0.5 }}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              {recording ? 'Enregistrement simulé · 00:0' + (Date.now() % 10) : 'Prêt à dicter — passera ensuite par Whisper'}
            </p>
          </div>
        </div>
      )}

      {/* Workflow simulation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${
              s.status === 'done' ? 'border-emerald/30 bg-emerald/10 text-emerald' :
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

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground font-mono inline-flex items-center gap-1">
          <Sparkles size={10} /> Workflow simulé — branchement OpenAI requis
        </span>
        <button
          disabled={!hasInput}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Envoyer pour structuration
        </button>
      </div>
    </div>
  );
}
