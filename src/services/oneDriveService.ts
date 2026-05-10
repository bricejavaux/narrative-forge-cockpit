import { supabase } from '@/integrations/supabase/client';
import { ONEDRIVE_REPOSITORY } from '@/lib/runtimeMode';

export type OneDriveFolderDescriptor = {
  path: string;
  files?: string[];
  subfolders?: string[];
};

export type OneDriveStructure = {
  root: string;
  folders: OneDriveFolderDescriptor[];
};

export const oneDriveService = {
  repository: ONEDRIVE_REPOSITORY,

  async checkConnection(): Promise<{ mode: 'mock' | 'live' | 'degraded'; structure: OneDriveStructure; message?: string; drive_ok?: boolean }> {
    const { data, error } = await supabase.functions.invoke('onedrive-list', { body: {} });
    if (error) throw error;
    return data;
  },

  async listRootFolder() {
    return this.checkConnection();
  },

  async listFolder(_path: string) {
    // Real folder traversal not yet implemented — surface expected structure.
    return this.checkConnection();
  },

  async findExpectedFiles() {
    const r = await this.checkConnection();
    const present = new Set<string>();
    r.structure.folders.forEach((f) => f.files?.forEach((file) => present.add(`${f.path}/${file}`)));
    const expected = [
      '01_sources/articulation.txt',
      '01_sources/personnages.txt',
      '05_covers/cover.jpg',
    ];
    return expected.map((p) => ({ path: p, found: present.has(p) }));
  },

  async syncSourceFiles() {
    return { mode: 'mock' as const, message: 'Sync simulated. Files will be copied to source-files bucket once OneDrive auth is fully wired.' };
  },

  async downloadSourceFile(fileId: string) {
    return { mode: 'mock' as const, fileId, message: 'Download simulated.' };
  },

  async syncCover() {
    return { mode: 'mock' as const, message: 'Cover sync simulated.' };
  },

  async inspectChromaArchives() {
    return {
      mode: 'mock' as const,
      archives: ONEDRIVE_REPOSITORY.expectedFiles.chromaSubfolders.map((name) => ({
        name,
        path: `${ONEDRIVE_REPOSITORY.paths.chromaArchives}/${name}`,
        type: 'Chroma technical archive',
        status: 'archived',
        active_index: false,
        pgvector_migration: 'pending',
      })),
    };
  },
};
