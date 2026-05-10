// Shared OneDrive (Microsoft Graph via Lovable connector gateway) helpers.

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_onedrive';

function authHeaders() {
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  const onedrive = Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');
  if (!lovable) throw new Error('LOVABLE_API_KEY missing');
  if (!onedrive) throw new Error('MICROSOFT_ONEDRIVE_API_KEY missing');
  return {
    Authorization: `Bearer ${lovable}`,
    'X-Connection-Api-Key': onedrive,
  };
}

export function encodePath(path: string): string {
  // Microsoft Graph: addressed via /me/drive/root:/<path>:
  return path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

export async function listFolder(path: string): Promise<{
  ok: boolean;
  status?: number;
  items: Array<{
    name: string;
    isFolder: boolean;
    size?: number;
    id?: string;
    lastModifiedDateTime?: string;
  }>;
  error?: string;
}> {
  const headers = authHeaders();
  const url = `${GATEWAY}/me/drive/root:/${encodePath(path)}:/children?$top=200&$select=name,id,size,folder,file,lastModifiedDateTime`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    return { ok: false, status: res.status, items: [], error: await res.text() };
  }
  const data = await res.json();
  const items = (data?.value ?? []).map((v: any) => ({
    name: v.name as string,
    isFolder: !!v.folder,
    size: v.size as number | undefined,
    id: v.id as string | undefined,
    lastModifiedDateTime: v.lastModifiedDateTime as string | undefined,
  }));
  return { ok: true, items };
}

export async function downloadText(path: string): Promise<{
  ok: boolean;
  status?: number;
  text?: string;
  size?: number;
  error?: string;
}> {
  const headers = authHeaders();
  const url = `${GATEWAY}/me/drive/root:/${encodePath(path)}:/content`;
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) {
    return { ok: false, status: res.status, error: await res.text() };
  }
  const text = await res.text();
  return { ok: true, text, size: text.length };
}

export async function downloadBinary(path: string): Promise<{
  ok: boolean;
  status?: number;
  bytes?: Uint8Array;
  size?: number;
  contentType?: string;
  error?: string;
}> {
  const headers = authHeaders();
  const url = `${GATEWAY}/me/drive/root:/${encodePath(path)}:/content`;
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const buf = new Uint8Array(await res.arrayBuffer());
  return { ok: true, bytes: buf, size: buf.byteLength, contentType: res.headers.get('content-type') ?? undefined };
}
