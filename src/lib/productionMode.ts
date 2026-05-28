// Production Test Mode flag — gates the level of operations enabled in the UI.
// - demo: read-only demo / dummy
// - production_test: real connector tests, real OpenAI extraction, real Supabase persistence,
//   but no chapter generation / autonomous rewrite / pgvector retrieval
// - production_locked: future, full production once prerequisites are met

export type ProductionMode = 'demo' | 'production_test' | 'production_locked';

const KEY = 'narrative.productionMode';

export function getProductionMode(): ProductionMode {
  if (typeof window === 'undefined') return 'production_test';
  const v = window.localStorage.getItem(KEY);
  if (v === 'demo' || v === 'production_test' || v === 'production_locked') return v;
  return 'production_test';
}

export function setProductionMode(m: ProductionMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, m);
  window.dispatchEvent(new CustomEvent('narrative:production-mode', { detail: m }));
}

export const PRODUCTION_MODE_LABEL: Record<ProductionMode, string> = {
  demo: 'Demo',
  production_test: 'Production Test',
  production_locked: 'Production Locked',
};

export const PRODUCTION_MODE_TOOLTIP: Record<ProductionMode, string> = {
  demo: 'Mode démo — données fictives uniquement.',
  production_test:
    "Mode de test réel des connecteurs, imports, persistance Supabase et structuration OpenAI. Génération chapitre complète et pgvector non activés.",
  production_locked: 'Mode production complète — réservé à la phase post-validation.',
};
