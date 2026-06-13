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

  /**
   * Restricted ingestion: only science_portals is allowed in the current
   * iteration. follett and sf_portals_fiction are explicitly blocked by the
   * vector-ingest-science-portals wrapper. Callers MUST use this method,
   * not vector-ingest-package directly.
   */
  async ingestSciencePortals(opts: { dry_run?: boolean; limit?: number; embedding_model?: string } = {}) {
    const { data, error } = await supabase.functions.invoke('vector-ingest-science-portals', { body: opts });
    if (error) throw error;
    return data;
  },

  /** @deprecated use ingestSciencePortals — direct vector-ingest-package usage is no longer permitted from the UI. */
  async ingestPackage(opts: {
    corpus_name: string;
    target_index: string;
    mode: 'metadata_only' | 'embed_and_store';
    limit?: number;
    embedding_model?: string;
    dry_run?: boolean;
  }) {
    if (opts.corpus_name !== 'science_portals') {
      throw new Error(`Corpus "${opts.corpus_name}" désactivé dans cette itération (politique droits/style). Seul science_portals est autorisé.`);
    }
    return this.ingestSciencePortals({ dry_run: opts.dry_run, limit: opts.limit, embedding_model: opts.embedding_model });
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
