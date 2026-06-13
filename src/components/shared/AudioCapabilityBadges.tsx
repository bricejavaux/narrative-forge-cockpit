import { useEffect, useState } from 'react';
import { CAPABILITY_LABEL, resolveAudioCapabilities, type AudioCapabilities } from '@/lib/audioCapabilities';

type FlagKey = 'textStructure' | 'micCapture' | 'audioUpload' | 'whisper' | 'patchApply';
const ROWS: Array<{ key: FlagKey; label: string }> = [
  { key: 'textStructure', label: 'Notes texte' },
  { key: 'micCapture', label: 'Capture micro' },
  { key: 'audioUpload', label: 'Upload audio' },
  { key: 'whisper', label: 'Whisper' },
  { key: 'patchApply', label: 'Application patch' },
];

interface Props {
  compact?: boolean;
}

export default function AudioCapabilityBadges({ compact = false }: Props) {
  const [caps, setCaps] = useState<AudioCapabilities | null>(null);
  useEffect(() => {
    resolveAudioCapabilities().then(setCaps).catch(() => setCaps(null));
  }, []);

  if (!caps) {
    return <p className="text-[10px] font-mono text-muted-foreground">Résolution des capacités audio…</p>;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      {ROWS.map(({ key, label }) => {
        const flag = caps[key];
        const meta = CAPABILITY_LABEL[flag.state];
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono ${meta.classes}`}
            title={flag.reason}
          >
            <span className="opacity-80">{label}</span>
            <span className="font-semibold">{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}
