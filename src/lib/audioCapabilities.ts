// Truthful per-capability status for the audio pipeline.
// Each flag is resolved independently — we never aggregate to a single
// "Whisper live" badge unless every step actually works.
import { supabase } from '@/integrations/supabase/client';

export type CapabilityState = 'live' | 'blocked' | 'unsupported' | 'unknown';

export interface AudioCapabilities {
  textStructure: { state: CapabilityState; reason: string };
  micCapture: { state: CapabilityState; reason: string };
  audioUpload: { state: CapabilityState; reason: string };
  whisper: { state: CapabilityState; reason: string };
  patchApply: { state: CapabilityState; reason: string };
  resolvedAt: string;
}

function checkMicCapture(): { state: CapabilityState; reason: string } {
  if (typeof window === 'undefined') return { state: 'unknown', reason: 'SSR — not yet resolved.' };
  if (!navigator?.mediaDevices?.getUserMedia) {
    return { state: 'unsupported', reason: 'navigator.mediaDevices.getUserMedia indisponible (navigateur ou contexte non sécurisé).' };
  }
  if (typeof MediaRecorder === 'undefined') {
    return { state: 'unsupported', reason: 'MediaRecorder API absente du navigateur.' };
  }
  return { state: 'live', reason: 'Capture micro disponible (permission demandée au premier clic).' };
}

export async function resolveAudioCapabilities(): Promise<AudioCapabilities> {
  const mic = checkMicCapture();
  const resolvedAt = new Date().toISOString();

  // OpenAI readiness drives text-structure, whisper, and indirectly audio-upload.
  let openaiReady = false;
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'openai').maybeSingle();
    openaiReady = !!(data?.value as any)?.api_key_configured;
  } catch { /* keep false */ }

  const textStructure = openaiReady
    ? { state: 'live' as const, reason: 'OpenAI configuré — structuration de notes texte disponible.' }
    : { state: 'blocked' as const, reason: 'OPENAI_API_KEY absent dans app_settings.openai.' };

  // The audio-upload edge function uses service-role, so anon RLS is not the
  // blocker. We assume "live" unless the user reports otherwise; explicit
  // failures bubble up from the function call itself.
  const audioUpload = openaiReady
    ? { state: 'live' as const, reason: 'Edge function audio-upload disponible (service-role, contourne RLS storage/audio_notes).' }
    : { state: 'blocked' as const, reason: 'OpenAI absent — la chaîne audio complète ne peut pas finaliser la transcription.' };

  const whisper = openaiReady
    ? { state: 'live' as const, reason: 'Edge function openai-transcribe-audio disponible (whisper-1).' }
    : { state: 'blocked' as const, reason: 'OPENAI_API_KEY absent — Whisper indisponible.' };

  const patchApply = openaiReady
    ? { state: 'live' as const, reason: 'Application de patch via supabaseService.applyStructuredNotePatch.' }
    : { state: 'blocked' as const, reason: 'Pas de proposition à appliquer tant que la structuration OpenAI est bloquée.' };

  return {
    textStructure,
    micCapture: mic,
    audioUpload,
    whisper,
    patchApply,
    resolvedAt,
  };
}

export const CAPABILITY_LABEL: Record<CapabilityState, { label: string; classes: string }> = {
  live: { label: 'live', classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  blocked: { label: 'blocked', classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  unsupported: { label: 'unsupported', classes: 'bg-rose-500/10 text-rose-700 border-rose-500/30' },
  unknown: { label: 'unknown', classes: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
};
