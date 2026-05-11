import { supabase } from '@/integrations/supabase/client';
import type { VectorCorpus } from '@/lib/runtimeMode';

export type VectorPackageRow = {
  id: string;
  corpus_name: string;
  onedrive_path: string | null;
  manifest_path: string | null;
  chunks_path: string | null;
  inventory_path: string | null;
  target_index: string | null;
  produced_chunk_count: number | null;
  source_file_count: number | null;
  chunk_strategy: string | null;
  rights: string | null;
  usage: string | null;
  embeddings_created: boolean;
  ingestion_status: string;
  last_generated: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
};

export type VectorPackageRead = {
  mode: 'mock' | 'live' | 'degraded';
  corpus: VectorCorpus;
  target_index: string;
  paths: { manifest: string; inventory: string; chunks: string; targetIndex: string };
  manifest: any | null;
  manifest_error?: string;
  inventory: { columns: string[]; rows: string[][]; total: number; error?: string };
  chunks: { sample: any[]; total: number; error?: string };
  message?: string;
};

export const indexingService = {
  async queueRefresh(index_name: string) {
    return { ok: true, queued: index_name, mode: 'mock' as const };
  },
  async listQueue() {
    return [] as Array<{ index_name: string; status: string }>;
  },
  async migrationStrategy() {
    return {
      options: [
        { id: 'A', label: 'Re-vectorize from original source documents' },
        { id: 'B', label: 'Extract chunks/embeddings from existing Chroma archives' },
      ],
      selected: null,
    };
  },

  async listVectorPackages(): Promise<VectorPackageRow[]> {
    const { data, error } = await supabase
      .from('vector_source_packages')
      .select('*')
      .order('corpus_name', { ascending: true });
    if (error) return [];
    return (data ?? []) as VectorPackageRow[];
  },

  async readVectorPackage(corpus: VectorCorpus, sampleSize = 5): Promise<VectorPackageRead> {
    const { data, error } = await supabase.functions.invoke('vector-package-read', {
      body: { corpus, sampleSize },
    });
    if (error) throw error;
    return data as VectorPackageRead;
  },

  async markIndexRefreshRequired(targetIndex: string) {
    // Non-destructive placeholder; eventually writes to an index queue table.
    return { ok: true, target_index: targetIndex, status: 'queued (mock)' };
  },

  async preparePgvectorIngestion(corpus: VectorCorpus) {
    return {
      ok: true,
      corpus,
      status: 'prepared',
      message: 'Ingestion pgvector préparée (simulation). Action manuelle requise pour activer.',
    };
  },
};
