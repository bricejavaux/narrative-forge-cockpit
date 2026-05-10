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
};
