import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, LockKeyhole, RefreshCw, Search, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Companion = {
  type?: 'adult' | 'child';
  firstName?: string;
  lastName?: string;
  allergies?: string;
};

type RSVPRow = {
  id: string;
  attending: 'yes' | 'no';
  title: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  allergies: string | null;
  companions: Companion[] | null;
  song: string | null;
  message: string | null;
  notification_email: string;
  submitted_at: string;
  created_at: string;
};

type Filter = 'all' | 'yes' | 'no';

const PAGE_SIZE = 25;

const statCard =
  'rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl';

const inputCls =
  'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-sans text-sm text-white placeholder-white/35 transition focus:border-[#e6c787]/70 focus:outline-none focus:ring-2 focus:ring-[#e6c787]/25';

const filterButton =
  'inline-flex min-h-10 items-center justify-center rounded-full px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] transition';

function fullName(row: RSVPRow) {
  return [row.title, row.first_name, row.last_name].filter(Boolean).join(' ');
}

function companionsCount(row: RSVPRow) {
  return Array.isArray(row.companions) ? row.companions.length : 0;
}

function escapeHtml(value: unknown) {
  const text = String(value ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminRSVPs() {
  const [accessCode, setAccessCode] = useState('');
  const [rows, setRows] = useState<RSVPRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const attending = rows.filter((row) => row.attending === 'yes');
    const declined = rows.filter((row) => row.attending === 'no');
    const guestTotal = attending.reduce((total, row) => total + 1 + companionsCount(row), 0);
    const companionTotal = rows.reduce((total, row) => total + companionsCount(row), 0);

    return {
      total: rows.length,
      attending: attending.length,
      declined: declined.length,
      guestTotal,
      companionTotal,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((row) => row.attending === filter);
  }, [filter, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageEnd);
  const showingStart = filteredRows.length ? pageStart + 1 : 0;
  const showingEnd = Math.min(pageEnd, filteredRows.length);

  const statItems = [
    { label: 'Responses', value: stats.total, hint: 'All replies' },
    { label: 'Attending', value: stats.attending, hint: 'Yes responses' },
    { label: 'Declined', value: stats.declined, hint: 'Cannot attend' },
    { label: 'Guest Count', value: stats.guestTotal, hint: 'Including companions' },
    { label: 'Companions', value: stats.companionTotal, hint: 'Added guests' },
  ];

  async function loadRSVPs(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);

    if (!accessCode.trim()) {
      setError('Enter the admin access code.');
      return;
    }

    setLoading(true);
    const { data, error: loadError } = await supabase.rpc('get_rsvps_admin', {
      access_code: accessCode.trim(),
    });

    if (loadError) {
      setRows([]);
      setError(loadError.message || 'Could not load RSVPs.');
    } else {
      setRows((data ?? []) as RSVPRow[]);
      setCurrentPage(1);
    }
    setLoading(false);
  }

  function changeFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  function exportPdf() {
    const reportWindow = window.open('', '_blank', 'width=1100,height=800');

    if (!reportWindow) {
      setError('Allow pop-ups to export the RSVP PDF.');
      return;
    }

    const generatedAt = formatDate(new Date().toISOString());
    const responseRows = rows.map((row) => {
      const companions = (row.companions ?? [])
        .map((person) => {
          const name = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unnamed guest';
          const allergies = person.allergies ? ` - ${person.allergies}` : '';
          return escapeHtml(`${person.type ?? 'guest'}: ${name}${allergies}`);
        })
        .join('<br />');

      return `
        <tr>
          <td>${escapeHtml(formatDate(row.submitted_at))}</td>
          <td>${escapeHtml(row.attending === 'yes' ? 'Attending' : 'Cannot attend')}</td>
          <td>${escapeHtml(fullName(row))}</td>
          <td>${escapeHtml(row.email)}<br />${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.allergies || 'None')}</td>
          <td>${companions || 'None'}</td>
          <td>${escapeHtml(row.song || 'None')}</td>
          <td>${escapeHtml(row.message || '')}</td>
        </tr>
      `;
    }).join('');

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Tayo & Ope RSVP Report</title>
          <style>
            @page { margin: 18mm; }
            * { box-sizing: border-box; }
            body { color: #241b16; font-family: Arial, sans-serif; margin: 0; }
            h1 { font-family: Georgia, serif; font-size: 34px; margin: 0; }
            .meta { color: #6f6258; font-size: 12px; margin-top: 8px; }
            .stats { display: grid; gap: 10px; grid-template-columns: repeat(5, 1fr); margin: 24px 0; }
            .stat { border: 1px solid #ddd5ca; border-radius: 8px; padding: 12px; }
            .stat span { color: #6f6258; display: block; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
            .stat strong { display: block; font-family: Georgia, serif; font-size: 26px; margin-top: 4px; }
            table { border-collapse: collapse; font-size: 11px; width: 100%; }
            th { background: #241b16; color: #fff; font-size: 9px; letter-spacing: 0.12em; text-align: left; text-transform: uppercase; }
            th, td { border: 1px solid #ddd5ca; padding: 8px; vertical-align: top; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>Tayo & Ope RSVP Report</h1>
          <p class="meta">Generated ${escapeHtml(generatedAt)}</p>
          <section class="stats">
            ${statItems.map((item) => `<div class="stat"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('')}
          </section>
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Status</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Allergies</th>
                <th>Companions</th>
                <th>Song</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>${responseRows}</tbody>
          </table>
          <script>
            window.addEventListener('load', () => {
              window.print();
              window.setTimeout(() => window.close(), 500);
            });
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={loadRSVPs} className="rounded-[1.75rem] border border-white/12 bg-white/[0.055] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6c787]/25 bg-[#e6c787]/10 text-[#e6c787]">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
                  Admin access
                </label>
                <p className="mt-1 font-sans text-xs text-white/40">Protected RSVP records</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                type="password"
                placeholder="Enter admin password"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e6c787] px-6 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1a1410] transition hover:bg-white disabled:opacity-60"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {loading ? 'Loading' : 'Load'}
              </button>
            </div>
          </div>

          
        </div>
        {error && <p className="mt-3 font-sans text-sm text-red-200">{error}</p>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statItems.map((item) => (
          <div key={item.label} className={statCard}>
            <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-white/42">{item.label}</p>
            <p className="mt-3 font-serif text-5xl leading-none text-[#e6c787]">{item.value}</p>
            <p className="mt-3 font-sans text-xs text-white/38">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', value: 'all' as const },
            { label: 'Attending', value: 'yes' as const },
            { label: 'Declined', value: 'no' as const },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              className={`${filterButton} ${
                filter === option.value
                  ? 'bg-[#e6c787] text-[#1a1410]'
                  : 'border border-white/12 bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportPdf}
          disabled={!rows.length}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export PDF
        </button>
      </div>

      {!!filteredRows.length && (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.025] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Showing {showingStart}-{showingEnd} of {filteredRows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous RSVP page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-24 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next RSVP page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!rows.length && !loading && (
        <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-white/[0.025] px-6 py-14 text-center text-white/65">
          <UsersRound className="mx-auto h-8 w-8 text-[#e6c787]/80" />
          <p className="mt-4 font-serif text-2xl text-white">No RSVPs loaded</p>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-white/45">
            Enter the admin password to load responses.
          </p>
        </div>
      )}

      {!!rows.length && !filteredRows.length && (
        <div className="rounded-[1.75rem] border border-dashed border-white/14 bg-white/[0.025] px-6 py-12 text-center text-white/65">
          <p className="font-serif text-2xl text-white">No matching responses</p>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-white/45">
            Switch filters to view another RSVP group.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {paginatedRows.map((row) => (
          <article key={row.id} className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.052] text-white shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <div className="grid gap-0 md:grid-cols-[1fr_auto]">
              <div className="p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className={`inline-flex rounded-full px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] ${row.attending === 'yes' ? 'bg-[#e6c787]/12 text-[#e6c787]' : 'bg-white/10 text-white/70'}`}>
                  {row.attending === 'yes' ? 'Attending' : 'Cannot attend'}
                </p>
                <h2 className="mt-2 font-serif text-3xl text-white">{fullName(row)}</h2>
                <div className="mt-2 flex flex-col gap-1 font-sans text-sm text-white/58 sm:flex-row sm:gap-4">
                  <span>{row.email}</span>
                  <span>{row.phone}</span>
                </div>
              </div>
              <p className="font-sans text-xs text-white/45">{formatDate(row.submitted_at)}</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/40">Allergies</p>
                <p className="mt-1 font-serif text-lg text-white/80">{row.allergies || 'None listed'}</p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/40">Song</p>
                <p className="mt-1 font-serif text-lg text-white/80">{row.song || 'None listed'}</p>
              </div>
            </div>

            {!!row.message && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-serif text-lg italic leading-relaxed text-white/80">{row.message}</p>
              </div>
            )}
              </div>

              <aside className="border-t border-white/10 bg-black/10 p-5 md:border-l md:border-t-0 md:p-6 md:w-72">
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/40">Party size</p>
                <p className="mt-2 font-serif text-4xl text-[#e6c787]">{1 + companionsCount(row)}</p>
                <p className="mt-1 font-sans text-xs text-white/45">
                  {companionsCount(row)} companion{companionsCount(row) === 1 ? '' : 's'}
                </p>
              </aside>
            </div>

            {!!companionsCount(row) && (
              <div className="border-t border-white/10 bg-white/[0.025] p-5 md:p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/40">Companions</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(row.companions ?? []).map((person, index) => (
                    <div key={`${row.id}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-[#e6c787]">
                        {person.type ?? 'Guest'} #{index + 1}
                      </p>
                      <p className="mt-1 font-serif text-xl text-white">
                        {[person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                      </p>
                      <p className="mt-1 font-sans text-xs text-white/55">
                        {person.allergies || 'No allergies listed'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safePage === totalPages}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

