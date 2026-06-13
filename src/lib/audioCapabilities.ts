// Truthful per-capability status for the audio pipeline.
// Each flag is resolved independently from connection-status (single source
// of truth). We never aggregate to one "Whisper live" badge — every step is
// reported separately.
import { supabase } from '@/integrations/supabase/client';

export type CapabilityState = 'live' | 'blocked' | 'unsupported' | 'unknown';

export interface AudioCapabilities {
  textStructure: { state: CapabilityState; reason: string };
  micCapture: { state: CapabilityState; reason: string };
  audioUpload: { state: CapabilityState; reason: string };
  whisper: { state: CapabilityState; reason: string };
  patchApply: { state: CapabilityState; reason: string };
  pipelineStatus: string;
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

  // Source of truth = connection-status edge function (truthful, granular).
  let status: any = null;
  try {
    const { data } = await supabase.functions.invoke('connection-status', { body: {} });
    status = data;
  } catch { /* keep null */ }

  const openai = status?.openai ?? {};
  const audio = status?.audio ?? {};
  const pipelineStatus: string = audio?.pipeline_status ?? 'blocked';

  const textStructure: { state: CapabilityState; reason: string } = openai.structuring_available
    ? { state: 'live', reason: 'openai-structure-note disponible (OPENAI_API_KEY configurée).' }
    : { state: 'blocked', reason: 'OPENAI_API_KEY absent — structuration indisponible.' };

  const audioUpload: { state: CapabilityState; reason: string } = audio.audio_upload_function_available && audio.audio_bucket_exists
    ? { state: 'live', reason: 'audio-upload disponible (service-role, contourne RLS).' }
    : { state: 'blocked', reason: audio.audio_bucket_exists ? 'audio-upload indisponible.' : 'Bucket audio absent.' };

  let whisper: { state: CapabilityState; reason: string };
  if (pipelineStatus === 'transcription_live') {
    whisper = { state: 'live', reason: 'openai-transcribe-audio implémenté de bout en bout (download + Whisper + persist).' };
  } else if (pipelineStatus === 'upload_live_transcription_pending') {
    whisper = { state: 'blocked', reason: openai.api_key_configured ? 'Transcription non implémentée côté edge function.' : 'OPENAI_API_KEY absent — Whisper indisponible.' };
  } else {
    whisper = { state: 'blocked', reason: 'Bucket audio absent — toute la chaîne audio est bloquée.' };
  }

  const patchApply: { state: CapabilityState; reason: string } = openai.structuring_available
    ? { state: 'live', reason: 'Application de patch via governance-update / supabaseService.applyStructuredNotePatch.' }
    : { state: 'blocked', reason: 'Pas de proposition à appliquer tant que la structuration OpenAI est bloquée.' };

  return {
    textStructure,
    micCapture: mic,
    audioUpload,
    whisper,
    patchApply,
    pipelineStatus,
    resolvedAt,
  };
}

export const CAPABILITY_LABEL: Record<CapabilityState, { label: string; classes: string }> = {
  live: { label: 'live', classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  blocked: { label: 'blocked', classes: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  unsupported: { label: 'unsupported', classes: 'bg-rose-500/10 text-rose-700 border-rose-500/30' },
  unknown: { label: 'unknown', classes: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
};
