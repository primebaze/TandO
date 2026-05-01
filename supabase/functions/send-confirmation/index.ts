const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_ADDRESS = Deno.env.get('FROM_ADDRESS') ?? 'Tayo & Ope <hello@tothetaros.com>';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Companion = {
  type: 'adult' | 'child';
  firstName: string;
  lastName: string;
  allergies: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { email, title, firstName, lastName, attending, companions } = await req.json() as {
      email: string;
      title: string;
      firstName: string;
      lastName: string;
      attending: 'yes' | 'no';
      companions: Companion[];
    };

    const displayName = [title, firstName, lastName].filter(Boolean).join(' ');
    const isAttending = attending === 'yes';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: email,
        subject: isAttending
          ? "We can't wait to celebrate with you ✦"
          : 'Thank you for letting us know',
        html: buildEmail({ displayName, firstName, attending, companions }),
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmail({
  displayName,
  attending,
  companions,
}: {
  displayName: string;
  firstName: string;
  attending: string;
  companions: Companion[];
}) {
  const isAttending = attending === 'yes';
  const adults = companions.filter((c) => c.type === 'adult').length;
  const children = companions.filter((c) => c.type === 'child').length;
  const guestSummary = [
    adults > 0 ? `${adults} adult${adults > 1 ? 's' : ''}` : '',
    children > 0 ? `${children} child${children > 1 ? 'ren' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const companionListHtml = companions.length > 0
    ? companions
        .map(
          (c) => `
        <tr>
          <td style="padding:10px 16px;background:rgba(230,199,135,0.05);border-radius:8px;border:1px solid rgba(230,199,135,0.1);">
            <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#f5f0de;">
              ${c.firstName} ${c.lastName}
              ${c.type === 'child' ? `<span style="font-size:11px;color:rgba(245,240,222,0.45);"> (child)</span>` : ''}
            </p>
            ${c.allergies ? `<p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(245,240,222,0.45);">${c.allergies}</p>` : ''}
          </td>
        </tr>
        <tr><td style="height:6px;"></td></tr>`,
        )
        .join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${isAttending ? 'RSVP Confirmed' : 'Thank you'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Great+Vibes&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#0f0d0b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0d0b;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#1a1410;border-radius:20px;overflow:hidden;border:1px solid rgba(230,199,135,0.18);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:52px 48px 40px;background-color:#140f0b;border-bottom:1px solid rgba(230,199,135,0.12);">
              <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.45em;text-transform:uppercase;color:rgba(230,199,135,0.55);">Wedding Celebration</p>
              <h1 style="margin:0;font-family:'Great Vibes',Georgia,cursive;font-size:60px;font-weight:400;color:#e6c787;line-height:1;">Tayo &amp; Ope</h1>
              <table cellpadding="0" cellspacing="0" style="margin:22px auto 0;">
                <tr>
                  <td style="width:60px;height:1px;background:linear-gradient(to right,transparent,rgba(230,199,135,0.4));font-size:0;">&nbsp;</td>
                  <td style="padding:0 12px;font-family:Georgia,serif;font-size:13px;color:rgba(230,199,135,0.45);">✦</td>
                  <td style="width:60px;height:1px;background:linear-gradient(to left,transparent,rgba(230,199,135,0.4));font-size:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td align="center" style="padding:36px 48px 0;">
              <span style="display:inline-block;padding:8px 24px;border-radius:100px;background-color:${isAttending ? 'rgba(230,199,135,0.1)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isAttending ? 'rgba(230,199,135,0.35)' : 'rgba(255,255,255,0.12)'};font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.42em;text-transform:uppercase;color:${isAttending ? '#e6c787' : 'rgba(245,240,222,0.55)'};">
                ${isAttending ? '✦&nbsp;&nbsp;Attending' : 'Not Attending'}
              </span>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 48px 0;">
              <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;font-style:italic;color:#f5f0de;line-height:1.5;">Dear ${displayName},</p>
              <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:rgba(245,240,222,0.72);line-height:1.85;">
                ${
                  isAttending
                    ? 'Thank you for confirming your attendance. We are truly delighted that you will be joining us for our celebration in Marrakech, and we cannot wait to share this special day with you.'
                    : "Thank you for taking the time to respond. While we are sad you won't be able to join us, we are grateful for your kind wishes and will be thinking of you on our special day."
                }
              </p>
            </td>
          </tr>

          ${
            isAttending
              ? `<!-- Guest summary -->
          <tr>
            <td style="padding:28px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;border:1px solid rgba(230,199,135,0.15);overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;background:rgba(230,199,135,0.05);">
                    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.38em;text-transform:uppercase;color:rgba(230,199,135,0.6);">Your RSVP</p>
                    <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#f5f0de;">
                      ${displayName}${companions.length > 0 ? ` + ${companions.length} guest${companions.length > 1 ? 's' : ''}` : ''}
                    </p>
                    ${guestSummary ? `<p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:rgba(245,240,222,0.45);">${guestSummary}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }

          ${
            companionListHtml
              ? `<!-- Companion list -->
          <tr>
            <td style="padding:24px 48px 0;">
              <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;color:rgba(230,199,135,0.6);">Your Party</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${companionListHtml}
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- Closing -->
          <tr>
            <td style="padding:32px 48px 0;">
              <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:rgba(245,240,222,0.72);line-height:1.85;">
                ${
                  isAttending
                    ? 'Further details about the celebration will be shared with you soon. In the meantime, if you have any questions please do not hesitate to reach out.'
                    : 'We hope to celebrate with you another time. With all our love and best wishes.'
                }
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:36px 48px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:1px;background:rgba(230,199,135,0.3);font-size:0;">&nbsp;</td>
                  <td style="padding:0 10px;font-family:Georgia,serif;font-size:12px;color:rgba(230,199,135,0.4);">✦</td>
                  <td style="width:36px;height:1px;background:rgba(230,199,135,0.3);font-size:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="margin:18px 0 4px;font-family:'Great Vibes',Georgia,cursive;font-size:34px;font-weight:400;color:#e6c787;line-height:1;">Tayo &amp; Ope</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(245,240,222,0.35);">Marrakech, Morocco</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:40px 48px 48px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(245,240,222,0.28);line-height:1.7;">
                This confirmation was sent because you submitted an RSVP at tothetaros.com. If this wasn't you, please disregard this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
