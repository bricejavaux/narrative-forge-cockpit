import { supabase } from '@/integrations/supabase/client';

export type VectorIndexRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  embedding_model: string | null;
  dimensions: number | null;
  source_package_count: number;
  chunk_count: number;
  updated_at: string;
};

export const vectorIngestionService = {
  async listIndexes(): Promise<VectorIndexRow[]> {
    const { data } = await supabase.from('vector_indexes').select('*').order('name');
    return (data ?? []) as VectorIndexRow[];
  },

  async ingestPackage(opts: {
    corpus_name: string;
    target_index: string;
    mode: 'metadata_only' | 'embed_and_store';
    limit?: number;
    embedding_model?: string;
    dry_run?: boolean;
  }) {
    const { data, error } = await supabase.functions.invoke('vector-ingest-package', { body: opts });
    if (error) throw error;
    return data;
  },

  async search(opts: {
    query: string;
    index_names: string[];
    top_k?: number;
    similarity_threshold?: number;
    agent_id?: string | null;
  }) {
    const { data, error } = await supabase.functions.invoke('vector-search', { body: opts });
    if (error) throw error;
    return data;
  },
};
