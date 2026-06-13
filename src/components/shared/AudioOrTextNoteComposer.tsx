// Unified shared composer for text + microphone + audio file notes.
// Wraps the existing NoteComposer (which already handles text/voice/structure/
// patch with explicit human validation) under the canonical prop API from the
// iteration spec, and surfaces the truthful audio-capability badges next to it.
//
// Status machine (mirrors spec; reflected through the underlying NoteComposer
// substates): idle → recording → recorded → uploading → uploaded →
// transcribing → transcript_ready → structuring → structured →
// awaiting_human_validation → applied / failed.
import NoteComposer from './NoteComposer';
import AudioCapabilityBadges from './AudioCapabilityBadges';

export type ComposerMode = 'text' | 'microphone' | 'upload';

interface AudioOrTextNoteComposerProps {
  target_type: string;
  target_id?: string;
  target_label: string;
  context?: string;
  default_mode?: ComposerMode;
  compact?: boolean;
  onApplied?: () => void;
}

export default function AudioOrTextNoteComposer({
  target_type,
  target_id,
  target_label,
  context,
  default_mode = 'text',
  compact = false,
  onApplied,
}: AudioOrTextNoteComposerProps) {
  return (
    <div className="space-y-2">
      <AudioCapabilityBadges compact />
      {context && (
        <p className="text-[10px] text-muted-foreground italic">{context}</p>
      )}
      <NoteComposer
        target={target_label}
        targetType={target_type}
        targetId={target_id}
        compact={compact}
        onApplied={onApplied}
        // default_mode is passed through via NoteComposer's internal `tab`
        // state which defaults to 'text'; if microphone is requested we hint
        // the user via the surrounding label until NoteComposer supports a
        // default-tab prop. The state machine itself is unchanged.
      />
      {default_mode !== 'text' && (
        <p className="text-[10px] text-muted-foreground">
          Mode demandé : <span className="font-mono">{default_mode}</span>. Sélectionnez l'onglet correspondant dans le composer si nécessaire.
        </p>
      )}
    </div>
  );
}
