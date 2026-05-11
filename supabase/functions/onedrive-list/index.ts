// deno-lint-ignore-file
import { corsHeaders, hasOneDrive, json } from '../_shared/cors.ts';
import { listFolder } from '../_shared/onedrive.ts';

const ROOT = 'Documents/Projet Roman/Les_Arches';
const SUBFOLDERS = ['01_sources', '02_canon_actif', '03_chroma_archives', '04_exports', '05_covers', '06_vector_sources'];

const EXPECTED_STRUCTURE = {
  root: ROOT,
  folders: [
    { path: '01_sources', files: ['articulation.txt', 'personnages.txt'] },
    { path: '02_canon_actif', files: [] },
    { path: '03_chroma_archives', files: [], subfolders: ['follett', 'science_portals', 'sf_portals_fiction'] },
    { path: '04_exports', files: [] },
    { path: '05_covers', files: ['cover.jpg'] },
    { path: '06_vector_sources', files: [], subfolders: ['follett', 'sf_portals_fiction', 'science_portals'] },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!hasOneDrive()) {
      return json({ mode: 'mock', message: 'OneDrive not authorised — returning expected structure.', structure: EXPECTED_STRUCTURE });
    }

    const body = await req.json().catch(() => ({}));
    const path: string = body?.path ?? ROOT;

    // Probe the requested root
    const root = await listFolder(path);
    if (!root.ok) {
      return json({
        mode: 'degraded',
        drive_ok: false,
        drive_error: `${root.status ?? '?'} ${root.error ?? ''}`.trim(),
        structure: EXPECTED_STRUCTURE,
        message: 'OneDrive reachable but project folder unavailable. Falling back to expected structure.',
      });
    }

    // Build folder→children map
    const folders: Array<{
      path: string;
      files: string[];
      sizes?: Record<string, number>;
      subfolders?: string[];
    }> = [];

    for (const item of root.items) {
      if (!item.isFolder) continue;
      const subPath = `${path}/${item.name}`;
      const sub = await listFolder(subPath);
      const files = (sub.items ?? []).filter((i) => !i.isFolder).map((i) => i.name);
      const subfolders = (sub.items ?? []).filter((i) => i.isFolder).map((i) => i.name);
      const sizes: Record<string, number> = {};
      (sub.items ?? []).forEach((i) => {
        if (!i.isFolder && typeof i.size === 'number') sizes[i.name] = i.size;
      });
      folders.push({
        path: item.name,
        files,
        sizes,
        ...(subfolders.length ? { subfolders } : {}),
      });
    }

    // Ensure expected folders appear (even when empty in OneDrive)
    for (const expected of SUBFOLDERS) {
      if (!folders.find((f) => f.path === expected)) folders.push({ path: expected, files: [] });
    }
    folders.sort((a, b) => a.path.localeCompare(b.path));

    return json({
      mode: 'live',
      drive_ok: true,
      structure: { root: path, folders },
      message: 'Listing OneDrive en direct.',
    });
  } catch (e) {
    return json({ mode: 'degraded', error: e instanceof Error ? e.message : 'unknown', structure: EXPECTED_STRUCTURE }, 200);
  }
});
