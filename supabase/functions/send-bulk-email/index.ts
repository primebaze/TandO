const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_ADDRESS = Deno.env.get('FROM_ADDRESS') ?? 'Tayo & Ope <hello@tothetaros.com>';
const REPLY_TO = Deno.env.get('REPLY_TO') ?? 'omotayo_adesakin@hotmail.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const SITE = 'https://www.tothetaros.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Recipient = { email: string; name: string | null };

const CHUNK_SIZE = 100;
const CHUNK_DELAY_MS = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// img1-style: ornate floral vault arch, blush panel, mirrored arch footer.
function buildHtml(name: string, subject: string, message: string) {
  const greeting = name ? `Dear ${escapeHtml(name)},` : 'Dear guest,';
  const body = escapeHtml(message)
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:15px;color:#5c3b30;line-height:1.9;">${p.replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title>${escapeHtml(subject)}</title><style>:root{color-scheme:light;supported-color-schemes:light;}</style></head>
<body style="margin:0;padding:0;background-color:#3b211d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#3b211d;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:564px;background-color:#e9d3c5;border-radius:18px;overflow:hidden;border:1px solid rgba(110,60,40,0.28);">
        <tr><td style="line-height:0;font-size:0;">
          <img src="${SITE}/email/floral-band.jpg" width="564" alt="Tayo &amp; Ope" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td align="center" style="padding:34px 48px 0;">
          <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.42em;text-transform:uppercase;color:#a8472f;">For the Wedding of</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:50px;color:#6b2f28;line-height:1.04;">Tayo &amp; Ope</p>
          <table cellpadding="0" cellspacing="0" style="margin:22px auto 2px;"><tr>
            <td style="width:54px;height:11px;border-bottom:1px solid rgba(110,60,40,0.4);font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:0 14px;font-family:Georgia,serif;font-size:16px;color:#a8472f;vertical-align:middle;">&#10086;</td>
            <td style="width:54px;height:11px;border-bottom:1px solid rgba(110,60,40,0.4);font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 48px 6px;">
          <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#6b2f28;">${greeting}</p>
          ${body}
        </td></tr>
        <tr><td style="padding:12px 48px 30px;">
          <p style="margin:0;font-family:Georgia,serif;font-size:25px;color:#6b2f28;line-height:1;">Tayo &amp; Ope</p>
          <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.26em;text-transform:uppercase;color:#a8472f;">Marrakech, Morocco &middot; 16&ndash;20 December 2026</p>
        </td></tr>
        <tr><td style="line-height:0;font-size:0;">
          <img src="${SITE}/email/floral-band-flip.jpg" width="564" alt="" style="display:block;width:100%;height:auto;border:0;" />
        </td></tr>
        <tr><td align="center" style="padding:24px 48px 30px;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(92,59,48,0.62);line-height:1.7;">You're receiving this because you RSVP'd at tothetaros.com. If this wasn't you, please disregard this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText(name: string, message: string) {
  const greeting = name ? `Dear ${name},` : 'Dear guest,';
  return `${greeting}\n\n${message}\n\nWith love,\nTayo & Ope\nMarrakech, Morocco · 16–20 December 2026\n\nYou're receiving this because you RSVP'd at tothetaros.com. If this wasn't you, please disregard this email.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { access_code, subject, message, audience } = (await req.json()) as {
      access_code: string;
      subject: string;
      message: string;
      audience?: 'all' | 'attending' | 'declined';
    };
    if (!access_code || !subject?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing access code, subject or message.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_rsvp_recipients`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_access_code: access_code, p_audience: audience ?? 'all' }),
    });
    if (!rpcRes.ok) {
      const detail = await rpcRes.text();
      const invalid = /Invalid admin access code/i.test(detail);
      return new Response(JSON.stringify({ error: invalid ? 'Invalid admin access code.' : 'Could not load recipients.' }), {
        status: invalid ? 401 : 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const rows = (await rpcRes.json()) as Recipient[];
    const seen = new Set<string>();
    const recipients: Recipient[] = [];
    for (const r of rows) {
      const email = (r.email || '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      recipients.push({ email, name: r.name });
    }
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ total: 0, sent: 0, failed: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      const batch = chunk.map((r) => ({
        from: FROM_ADDRESS,
        to: [r.email],
        reply_to: REPLY_TO,
        subject: subject.trim(),
        html: buildHtml(r.name ?? '', subject.trim(), message.trim()),
        text: buildText(r.name ?? '', message.trim()),
      }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        sent += chunk.length;
      } else {
        failed += chunk.length;
        console.error('Resend batch error:', res.status, await res.text());
      }
      if (i + CHUNK_SIZE < recipients.length) await sleep(CHUNK_DELAY_MS);
    }
    return new Response(JSON.stringify({ total: recipients.length, sent, failed }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
