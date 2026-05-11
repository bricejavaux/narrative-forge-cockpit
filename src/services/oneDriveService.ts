import { supabase } from '@/integrations/supabase/client';
import { ONEDRIVE_REPOSITORY } from '@/lib/runtimeMode';

export type OneDriveFolderDescriptor = {
  path: string;
  files?: string[];
  sizes?: Record<string, number>;
  subfolders?: string[];
};

export type OneDriveStructure = {
  root: string;
  folders: OneDriveFolderDescriptor[];
};

export type OneDriveCheckResult = {
  mode: 'mock' | 'live' | 'degraded';
  structure: OneDriveStructure;
  message?: string;
  drive_ok?: boolean;
  drive_error?: string;
};

export const oneDriveService = {
  repository: ONEDRIVE_REPOSITORY,

  async checkConnection(path?: string): Promise<OneDriveCheckResult> {
    const { data, error } = await supabase.functions.invoke('onedrive-list', { body: { path } });
    if (error) throw error;
    return data as OneDriveCheckResult;
  },

  async listRootFolder() {
    return this.checkConnection();
  },

  async listFolder(path: string) {
    return this.checkConnection(path);
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

  async downloadFile(path: string): Promise<{ mode: string; text?: string; size?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('onedrive-download', { body: { path } });
    if (error) throw error;
    return data;
  },

  async readJsonFile<T = unknown>(path: string): Promise<{ mode: string; data?: T; error?: string }> {
    const r = await this.downloadFile(path);
    if (!r.text) return { mode: r.mode, error: r.error ?? 'no_text' };
    try {
      return { mode: r.mode, data: JSON.parse(r.text) as T };
    } catch (e) {
      return { mode: r.mode, error: e instanceof Error ? e.message : 'parse_error' };
    }
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
