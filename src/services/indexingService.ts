// Mock indexing service. NOT connected.
// Two future migration strategies for legacy Chroma archives:
//  - 're-vectorize-source' : re-vectorize from raw source documents
//  - 'extract-chroma'      : extract chunks/embeddings from existing Chroma archives
export type IndexMigrationStrategy = 're-vectorize-source' | 'extract-chroma' | 'native-supabase' | 'pending-decision';

export const indexingService = {
  isConnected: () => false,
  async reindex(_indexId: string): Promise<{ jobId: string }> {
    return Promise.resolve({ jobId: 'sim-' + Math.random().toString(36).slice(2, 8) });
  },
  async migrate(_indexId: string, _strategy: IndexMigrationStrategy): Promise<void> {
    return Promise.resolve();
  },
  async queue(): Promise<{ id: string; name: string; status: string }[]> {
    return Promise.resolve([]);
  },
};
