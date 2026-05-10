// Mock export service. NOT connected.
// Priority formats: Markdown, JSON, Text. Secondary: DOCX. Future: PDF, EPUB.
export type ExportFormat = 'markdown' | 'json' | 'text' | 'docx' | 'pdf' | 'epub';

export const exportService = {
  isConnected: () => false,
  async export(_format: ExportFormat): Promise<{ url: string }> {
    return Promise.resolve({ url: 'simulated://export' });
  },
};
