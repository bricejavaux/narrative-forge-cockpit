// Catalog of OpenAI runtime models exposed to the UI.
// Runtime AI provider for the application = OpenAI only.
// gpt-4o is intentionally NOT in this list (legacy; do not hardcode).

import type { AgentCostTier, AgentModelProfile } from '@/data/dummyData';

export type OpenAIModelOption = {
  id: string;
  label: string;
  tier: AgentCostTier;
  costEstimate: string; // per call rough estimate
  latencyEstimate: string;
  suitableFor: AgentModelProfile[];
  note?: string;
};

export const OPENAI_MODELS: OpenAIModelOption[] = [
  {
    id: 'gpt-4.1-nano',
    label: 'gpt-4.1-nano',
    tier: 'fast',
    costEstimate: '~$0.01',
    latencyEstimate: '~1.2s',
    suitableFor: ['extraction_fast'],
    note: 'Le plus rapide / moins cher. Extraction simple, classification.',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'gpt-4.1-mini',
    tier: 'standard',
    costEstimate: '~$0.05',
    latencyEstimate: '~2.0s',
    suitableFor: ['extraction_reliable', 'diagnostic_standard'],
    note: 'Bon compromis qualité / coût — défaut conseillé.',
  },
  {
    id: 'gpt-4.1',
    label: 'gpt-4.1',
    tier: 'premium',
    costEstimate: '~$0.25',
    latencyEstimate: '~4s',
    suitableFor: ['rewrite_quality', 'tome_audit_premium', 'chapter_generation_premium'],
    note: 'Qualité supérieure — audits de tome, réécriture, génération chapitre.',
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    tier: 'premium',
    costEstimate: '~$0.20',
    latencyEstimate: '~6s',
    suitableFor: ['tome_audit_premium', 'rewrite_quality'],
    note: 'Reasoning model — analyses complexes, audits profonds.',
  },
];

export function modelById(id?: string): OpenAIModelOption | undefined {
  return OPENAI_MODELS.find((m) => m.id === id);
}

// Default model selection based on agent category, when an agent has no explicit
// defaultModel set in the data layer.
export function defaultModelForCategory(category: string): string {
  switch (category) {
    case 'génération':
      return 'gpt-4.1';
    case 'réécriture':
      return 'gpt-4.1';
    case 'audit':
      return 'gpt-4.1-mini';
    case 'diagnostic':
      return 'gpt-4.1-mini';
    case 'style':
      return 'gpt-4.1-mini';
    case 'export':
      return 'gpt-4.1-nano';
    default:
      return 'gpt-4.1-mini';
  }
}

export function defaultProfileForCategory(category: string): AgentModelProfile {
  switch (category) {
    case 'génération':
      return 'chapter_generation_premium';
    case 'réécriture':
      return 'rewrite_quality';
    case 'audit':
      return 'tome_audit_premium';
    case 'diagnostic':
      return 'diagnostic_standard';
    case 'style':
      return 'extraction_reliable';
    case 'export':
      return 'extraction_fast';
    default:
      return 'diagnostic_standard';
  }
}
