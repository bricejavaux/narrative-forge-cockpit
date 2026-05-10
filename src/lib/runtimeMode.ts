// Runtime mode: MOCK vs CONNECTED.
// MOCK_MODE keeps using src/data/dummyData.ts.
// CONNECTED_MODE reads/writes via Supabase + edge functions and falls back to mock per feature.

export type RuntimeMode = 'mock' | 'connected';

// Default: connected. Edge functions themselves degrade to mock when secrets are missing.
const FLAG_KEY = 'narrative.runtimeMode';

export function getRuntimeMode(): RuntimeMode {
  if (typeof window === 'undefined') return 'connected';
  const v = window.localStorage.getItem(FLAG_KEY);
  return v === 'mock' ? 'mock' : 'connected';
}

export function setRuntimeMode(mode: RuntimeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLAG_KEY, mode);
  window.dispatchEvent(new CustomEvent('narrative:runtime-mode', { detail: mode }));
}

export const ONEDRIVE_REPOSITORY = {
  root: 'Documents/Projet Roman/Les_Arches',
  paths: {
    sources: '01_sources',
    activeCanon: '02_canon_actif',
    chromaArchives: '03_chroma_archives',
    exports: '04_exports',
    covers: '05_covers',
  },
  expectedFiles: {
    sources: ['articulation.txt', 'personnages.txt'],
    covers: ['cover.jpg'],
    chromaSubfolders: ['follett', 'science_portals', 'sf_portals_fiction'],
  },
};
