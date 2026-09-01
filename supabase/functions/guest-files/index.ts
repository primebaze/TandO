// Admin-only management of guest-facing PDFs (itineraries, info packs).
// The browser never gets write access to storage: this function verifies the
// admin access code with the service role, then hands back a short-lived
// signed upload URL for the browser to PUT the file directly to.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BUCKET = 'guest-files';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const svc = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

async function isAdmin(accessCode: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_admin_code`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_access_code: accessCode }),
  });
  if (!res.ok) return false;
  return (await res.json()) === true;
}

// Keep object keys predictable and safe.
function safeName(name: string) {
  const base = (name || 'document').replace(/\.pdf$/i, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';
  return `${Date.now()}-${slug}.pdf`;
}

const publicUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { access_code, action, filename, path } = (await req.json()) as {
      access_code: string;
      action: 'sign' | 'list' | 'delete';
      filename?: string;
      path?: string;
    };

    if (!access_code) return json({ error: 'Missing admin access code.' }, 400);
    if (!(await isAdmin(access_code))) return json({ error: 'Invalid admin access code.' }, 401);

    if (action === 'sign') {
      const key = safeName(filename ?? '');
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${key}`,
        { method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' }, body: '{}' },
      );
      if (!res.ok) return json({ error: 'Could not prepare the upload.' }, 500);
      const data = await res.json();
      // data.url looks like /object/upload/sign/<bucket>/<key>?token=...
      const token = String(data.url ?? '').split('token=')[1] ?? '';
      return json({ path: key, token, publicUrl: publicUrl(key) });
    }

    if (action === 'list') {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { ...svc, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: '',
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      });
      if (!res.ok) return json({ error: 'Could not list files.' }, 500);
      const rows = (await res.json()) as Array<{
        name: string;
        created_at: string;
        metadata?: { size?: number };
      }>;
      return json({
        files: rows
          .filter((r) => r.name && r.name.toLowerCase().endsWith('.pdf'))
          .map((r) => ({
            path: r.name,
            created_at: r.created_at,
            size: r.metadata?.size ?? 0,
            url: publicUrl(r.name),
          })),
      });
    }

    if (action === 'delete') {
      if (!path) return json({ error: 'Missing file path.' }, 400);
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'DELETE',
        headers: svc,
      });
      if (!res.ok) return json({ error: 'Could not delete the file.' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
