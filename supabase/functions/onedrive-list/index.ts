// deno-lint-ignore-file
import { corsHeaders, json } from '../_shared/cors.ts';

// Lists OneDrive folder structure for "Documents/Projet Roman/Les_Arches".
// Uses Lovable connector gateway if MICROSOFT_ONEDRIVE_API_KEY is present,
// otherwise returns the expected mocked structure so the UI still works.

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_onedrive';

const EXPECTED_STRUCTURE = {
  root: 'Documents/Projet Roman/Les_Arches',
  folders: [
    { path: '01_sources', files: ['articulation.txt', 'personnages.txt'] },
    { path: '02_canon_actif', files: [] },
    {
      path: '03_chroma_archives',
      files: [],
      subfolders: ['follett', 'science_portals', 'sf_portals_fiction'],
    },
    { path: '04_exports', files: [] },
    { path: '05_covers', files: ['cover.jpg'] },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const ONEDRIVE_API_KEY = Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');

    if (!LOVABLE_API_KEY || !ONEDRIVE_API_KEY) {
      return json({
        mode: 'mock',
        message: 'OneDrive not yet authorised — returning expected structure.',
        structure: EXPECTED_STRUCTURE,
      });
    }

    // Live mode: probe root drive — kept minimal & safe.
    let drive_ok = false;
    let drive_error: string | null = null;
    try {
      const res = await fetch(`${GATEWAY}/me/drive`, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': ONEDRIVE_API_KEY,
        },
      });
      drive_ok = res.ok;
      if (!res.ok) drive_error = `gateway ${res.status}`;
    } catch (e) {
      drive_error = e instanceof Error ? e.message : 'fetch_failed';
    }

    return json({
      mode: drive_ok ? 'live' : 'degraded',
      drive_ok,
      drive_error,
      structure: EXPECTED_STRUCTURE,
      message: drive_ok
        ? 'OneDrive reachable. Returning expected repository structure (folder traversal not yet implemented).'
        : 'OneDrive connection present but not reachable. Falling back to expected structure.',
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
