// Mock OneDrive service. NOT connected. Future long-term document repository:
// articulation.txt, personnages.txt, cover.jpg, chroma archives, EPUB/PDF refs.
export const oneDriveService = {
  isConnected: () => false,
  async listFiles(_path = '/'): Promise<{ name: string; size: number }[]> {
    return Promise.resolve([]);
  },
  async download(_path: string): Promise<Blob | null> {
    return Promise.resolve(null);
  },
  async syncCorpus(): Promise<{ scanned: number; added: number; updated: number }> {
    return Promise.resolve({ scanned: 0, added: 0, updated: 0 });
  },
};
