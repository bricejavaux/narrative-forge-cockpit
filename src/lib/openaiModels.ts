// Catalog of OpenAI runtime models exposed to the UI.
// Runtime AI provider for the application = OpenAI only.
// gpt-4o is intentionally NOT in this list (legacy; do not hardcode).
// gpt-5 / gpt-5.4 / gpt-5.5 are listed as configurable IDs — availability depends
// on the OpenAI account/API. If unavailable, the UI shows a clear error.

import type { AgentCostTier, AgentModelProfile } from '@/data/dummyData';

export type OpenAIModelOption = {
  id: string;
  label: string;
  tier: AgentCostTier;
  costEstimate: string;
  latencyEstimate: string;
  suitableFor: AgentModelProfile[];
  note?: string;
  availability?: 'verified' | 'configurable' | 'custom';
  supportsReasoning?: boolean;
};

export const OPENAI_MODELS: OpenAIModelOption[] = [
  { id: 'gpt-4.1-nano', label: 'gpt-4.1-nano', tier: 'fast', costEstimate: '~$0.01', latencyEstimate: '~1.2s',
    suitableFor: ['extraction_fast'], availability: 'verified',
    note: 'Le plus rapide / moins cher. Extraction simple, classification.' },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', tier: 'standard', costEstimate: '~$0.05', latencyEstimate: '~2.0s',
    suitableFor: ['extraction_reliable', 'diagnostic_standard'], availability: 'verified',
    note: 'Bon compromis qualité / coût — défaut conseillé.' },
  { id: 'gpt-4.1', label: 'gpt-4.1', tier: 'premium', costEstimate: '~$0.25', latencyEstimate: '~4s',
    suitableFor: ['rewrite_quality', 'tome_audit_premium', 'chapter_generation_premium'], availability: 'verified',
    note: 'Qualité supérieure — audits de tome, réécriture, génération chapitre.' },
  { id: 'o4-mini', label: 'o4-mini', tier: 'premium', costEstimate: '~$0.20', latencyEstimate: '~6s',
    suitableFor: ['tome_audit_premium', 'rewrite_quality'], availability: 'verified', supportsReasoning: true,
    note: 'Reasoning model — analyses complexes, audits profonds.' },
  { id: 'gpt-5', label: 'gpt-5', tier: 'premium', costEstimate: '~$0.40', latencyEstimate: '~5s',
    suitableFor: ['tome_audit_premium', 'chapter_generation_premium', 'rewrite_quality'],
    availability: 'configurable', supportsReasoning: true,
    note: 'ID configurable — disponibilité selon votre compte OpenAI.' },
  { id: 'gpt-5.4', label: 'gpt-5.4', tier: 'premium', costEstimate: '~$0.50', latencyEstimate: '~6s',
    suitableFor: ['tome_audit_premium', 'chapter_generation_premium'],
    availability: 'configurable', supportsReasoning: true,
    note: 'ID configurable — disponibilité selon votre compte OpenAI.' },
  { id: 'gpt-5.5', label: 'gpt-5.5', tier: 'premium', costEstimate: '~$0.60', latencyEstimate: '~6s',
    suitableFor: ['tome_audit_premium', 'chapter_generation_premium'],
    availability: 'configurable', supportsReasoning: true,
    note: 'ID configurable — disponibilité selon votre compte OpenAI.' },
];

export const CUSTOM_MODEL_OPTION_ID = '__custom__';

export function modelById(id?: string): OpenAIModelOption | undefined {
  if (!id) return undefined;
  return OPENAI_MODELS.find((m) => m.id === id);
}

export function defaultModelForCategory(category: string): string {
  switch (category) {
    case 'génération': return 'gpt-4.1';
    case 'réécriture': return 'gpt-4.1';
    case 'audit': return 'gpt-4.1-mini';
    case 'diagnostic': return 'gpt-4.1-mini';
    case 'style': return 'gpt-4.1-mini';
    case 'export': return 'gpt-4.1-nano';
    default: return 'gpt-4.1-mini';
  }
}

export function defaultProfileForCategory(category: string): AgentModelProfile {
  switch (category) {
    case 'génération': return 'chapter_generation_premium';
    case 'réécriture': return 'rewrite_quality';
    case 'audit': return 'tome_audit_premium';
    case 'diagnostic': return 'diagnostic_standard';
    case 'style': return 'extraction_reliable';
    case 'export': return 'extraction_fast';
    default: return 'diagnostic_standard';
  }
}
