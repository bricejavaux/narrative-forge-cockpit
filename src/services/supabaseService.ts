// Mock Supabase service. NOT connected. Future active narrative layer:
// chapters, characters, arcs, canon, runs, scores, journal.
export const supabaseService = {
  isConnected: () => false,
  async select<T = unknown>(_table: string): Promise<T[]> {
    return Promise.resolve([] as T[]);
  },
  async insert(_table: string, _row: unknown): Promise<void> {
    return Promise.resolve();
  },
  async update(_table: string, _id: string, _row: unknown): Promise<void> {
    return Promise.resolve();
  },
};
