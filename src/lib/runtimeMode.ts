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
    vectorSources: '06_vector_sources',
  },
  expectedFiles: {
    sources: ['articulation.txt', 'personnages.txt'],
    covers: ['cover.jpg'],
    chromaSubfolders: ['follett', 'science_portals', 'sf_portals_fiction'],
    vectorCorpora: ['follett', 'sf_portals_fiction', 'science_portals'],
  },
};

export type VectorCorpus = 'follett' | 'sf_portals_fiction' | 'science_portals';

export const VECTOR_CORPORA: Array<{
  id: VectorCorpus;
  label: string;
  targetIndex: 'style_index' | 'fiction_reference_index' | 'science_index';
  usage: string;
  rights: 'private' | 'reference';
  caution: string;
  onedrivePath: string;
}> = [
  {
    id: 'follett',
    label: 'follett',
    targetIndex: 'style_index',
    usage: 'private reference only — no direct imitation',
    rights: 'private',
    caution: 'Référence privée. Pas de réutilisation directe ni d\'imitation.',
    onedrivePath: 'Documents/Projet Roman/Les_Arches/06_vector_sources/follett',
  },
  {
    id: 'sf_portals_fiction',
    label: 'sf_portals_fiction',
    targetIndex: 'fiction_reference_index',
    usage: 'private reference only — no direct reuse',
    rights: 'private',
    caution: 'Référence privée. Pas de réutilisation directe.',
    onedrivePath: 'Documents/Projet Roman/Les_Arches/06_vector_sources/sf_portals_fiction',
  },
  {
    id: 'science_portals',
    label: 'science_portals',
    targetIndex: 'science_index',
    usage: 'preferred first candidate for pgvector ingestion',
    rights: 'reference',
    caution: 'Référence scientifique — candidat prioritaire pour pgvector.',
    onedrivePath: 'Documents/Projet Roman/Les_Arches/06_vector_sources/science_portals',
  },
];
