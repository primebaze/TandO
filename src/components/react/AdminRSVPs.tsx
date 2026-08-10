import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, LockKeyhole, Mail, RefreshCw, Search, Send, Trash2, UsersRound } from 'lucide-react';
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

function companionName(person: Companion) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unnamed';
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

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  // Wrap in quotes and double any embedded quotes so commas, quotes and
  // newlines are preserved. Prefix a leading =/+/-/@ with a single quote to
  // neutralise spreadsheet formula injection.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function companionsSummary(row: RSVPRow) {
  const companions = Array.isArray(row.companions) ? row.companions : [];
  if (!companions.length) return '';
  return companions
    .map((person) => {
      const type = person.type
        ? person.type.charAt(0).toUpperCase() + person.type.slice(1)
        : 'Guest';
      const allergies = person.allergies ? ` (allergies: ${person.allergies})` : '';
      return `${type}: ${companionName(person)}${allergies}`;
    })
    .join('; ');
}

export default function AdminRSVPs() {
  const [accessCode, setAccessCode] = useState('');
  const [rows, setRows] = useState<RSVPRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newSitePassword, setNewSitePassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkAudience, setBulkAudience] = useState<'all' | 'attending' | 'declined'>('all');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ ok: boolean; text: string } | null>(null);
  // 'group' = everyone in the chosen audience · 'pick' = hand-picked guests
  const [bulkMode, setBulkMode] = useState<'group' | 'pick'>('group');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');

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

  // Guest picker — newest RSVPs first so late replies are easy to find.
  const pickerRows = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    const sorted = [...rows].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    );
    if (!term) return sorted;
    return sorted.filter((row) =>
      `${fullName(row)} ${row.email}`.toLowerCase().includes(term),
    );
  }, [rows, pickerSearch]);

  function toggleRecipient(email: string) {
    const key = email.trim().toLowerCase();
    setSelectedEmails((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key],
    );
  }

  function selectShown() {
    const shown = pickerRows.map((row) => row.email.trim().toLowerCase());
    setSelectedEmails((prev) => Array.from(new Set([...prev, ...shown])));
  }

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

  async function changeSitePassword(event: React.FormEvent) {
    event.preventDefault();
    setPwMessage(null);

    if (!accessCode.trim()) {
      setPwMessage({ ok: false, text: 'Enter the admin access code above first.' });
      return;
    }
    if (newSitePassword.trim().length < 4) {
      setPwMessage({ ok: false, text: 'New password must be at least 4 characters.' });
      return;
    }

    setPwSaving(true);
    const { error: pwError } = await supabase.rpc('set_site_password', {
      p_access_code: accessCode.trim(),
      p_new_password: newSitePassword.trim(),
    });
    setPwSaving(false);

    if (pwError) {
      setPwMessage({ ok: false, text: pwError.message || 'Could not update the password.' });
    } else {
      setPwMessage({
        ok: true,
        text: 'Site password updated. Guests will use the new password from now on.',
      });
      setNewSitePassword('');
    }
  }

  async function sendBulkEmail(event: React.FormEvent) {
    event.preventDefault();
    setBulkResult(null);

    if (!accessCode.trim()) {
      setBulkResult({ ok: false, text: 'Enter the admin access code above first.' });
      return;
    }
    if (!bulkSubject.trim() || !bulkMessage.trim()) {
      setBulkResult({ ok: false, text: 'Add a subject and a message.' });
      return;
    }

    if (bulkMode === 'pick' && selectedEmails.length === 0) {
      setBulkResult({ ok: false, text: 'Select at least one guest to email.' });
      return;
    }

    const who =
      bulkMode === 'pick'
        ? `${selectedEmails.length} selected guest${selectedEmails.length === 1 ? '' : 's'}`
        : bulkAudience === 'all'
          ? "everyone who has RSVP'd"
          : bulkAudience === 'attending'
            ? 'guests who are attending'
            : 'guests who declined';
    if (
      !confirm(
        `Send this email to ${who}? Each person receives their own individual copy — this cannot be undone.`,
      )
    )
      return;

    setBulkSending(true);
    const { data, error: fnError } = await supabase.functions.invoke('send-bulk-email', {
      body: {
        access_code: accessCode.trim(),
        subject: bulkSubject.trim(),
        message: bulkMessage.trim(),
        audience: bulkMode === 'pick' ? 'all' : bulkAudience,
        ...(bulkMode === 'pick' ? { emails: selectedEmails } : {}),
      },
    });
    setBulkSending(false);

    if (fnError) {
      let text = fnError.message || 'Could not send the emails.';
      try {
        const ctx = await (fnError as { context?: Response }).context?.json();
        if (ctx?.error) text = ctx.error;
      } catch {
        /* ignore */
      }
      setBulkResult({ ok: false, text });
      return;
    }

    if (data?.error) {
      setBulkResult({ ok: false, text: data.error });
      return;
    }

    setBulkResult({
      ok: true,
      text: `Sent to ${data.sent} of ${data.total} guest${data.total === 1 ? '' : 's'}${
        data.failed ? ` · ${data.failed} failed` : ''
      }.`,
    });
    setBulkSubject('');
    setBulkMessage('');
    setSelectedEmails([]);
  }

  async function deleteRSVP(id: string) {
    if (!confirm('Delete this RSVP? This cannot be undone.')) return;
    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase.rpc('delete_rsvp_admin', {
      p_rsvp_id: id,
      p_access_code: accessCode.trim(),
    });

    if (deleteError) {
      setError(deleteError.message || 'Could not delete RSVP.');
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
    setDeletingId(null);
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

    const responseRows = rows.map((row, index) => {
      const companions = (row.companions ?? []);
      const companionHtml = companions.length
        ? companions.map((person, i) => {
            const name = companionName(person);
            const type = person.type
              ? person.type.charAt(0).toUpperCase() + person.type.slice(1)
              : 'Guest';
            const allergies = person.allergies
              ? `<div class="companion-allergy">Allergies: ${escapeHtml(person.allergies)}</div>`
              : `<div class="companion-allergy">No allergies</div>`;
            return `<div class="companion-entry"><span class="companion-num">${i + 1}.</span> <strong>${escapeHtml(type)}</strong> — ${escapeHtml(name)}${allergies}</div>`;
          }).join('')
        : '<span class="none">None</span>';

      const rowNum = index + 1;

      return `
        <tr>
          <td class="num">#${rowNum}</td>
          <td>${escapeHtml(formatDate(row.submitted_at))}</td>
          <td class="${row.attending === 'yes' ? 'attending' : 'declined'}">${escapeHtml(row.attending === 'yes' ? 'Attending' : 'Cannot attend')}</td>
          <td><strong>${escapeHtml(fullName(row))}</strong></td>
          <td>${escapeHtml(row.email)}<br /><span class="phone">${escapeHtml(row.phone)}</span></td>
          <td>${escapeHtml(row.allergies || '—')}</td>
          <td class="companions-cell">${companionHtml}</td>
          <td>${escapeHtml(row.song || '—')}</td>
          <td>${escapeHtml(row.message || '—')}</td>
        </tr>
      `;
    }).join('');

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Tayo &amp; Ope RSVP Report</title>
          <style>
            @page { margin: 15mm; size: A4 landscape; }
            * { box-sizing: border-box; }
            body { color: #241b16; font-family: Arial, sans-serif; margin: 0; font-size: 11px; }
            h1 { font-family: Georgia, serif; font-size: 30px; margin: 0; }
            .meta { color: #6f6258; font-size: 11px; margin-top: 6px; }
            .stats { display: grid; gap: 8px; grid-template-columns: repeat(5, 1fr); margin: 18px 0; }
            .stat { border: 1px solid #ddd5ca; border-radius: 8px; padding: 10px 12px; }
            .stat span { color: #6f6258; display: block; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; }
            .stat strong { display: block; font-family: Georgia, serif; font-size: 24px; margin-top: 4px; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; }
            col.c-num { width: 4%; }
            col.c-date { width: 10%; }
            col.c-status { width: 8%; }
            col.c-name { width: 13%; }
            col.c-contact { width: 13%; }
            col.c-allergy { width: 8%; }
            col.c-companions { width: 22%; }
            col.c-song { width: 10%; }
            col.c-message { width: 12%; }
            th { background: #241b16; color: #fff; font-size: 8px; letter-spacing: 0.12em; text-align: left; text-transform: uppercase; padding: 7px 8px; }
            td { border: 1px solid #ddd5ca; padding: 7px 8px; vertical-align: top; word-wrap: break-word; }
            tr { break-inside: avoid; }
            tr:nth-child(even) { background: #faf8f5; }
            td.num { color: #9b8a7c; font-size: 10px; text-align: center; font-weight: bold; }
            td.attending { color: #6a7c3a; font-weight: bold; }
            td.declined { color: #8b3a3a; font-weight: bold; }
            .phone { color: #6f6258; }
            .companion-entry { margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #ede8e2; }
            .companion-entry:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .companion-num { color: #9b8a7c; }
            .companion-allergy { color: #6f6258; font-size: 9px; margin-top: 2px; margin-left: 12px; }
            .none { color: #b0a090; font-style: italic; }
            .companions-cell { line-height: 1.4; }
          </style>
        </head>
        <body>
          <h1>Tayo &amp; Ope RSVP Report</h1>
          <p class="meta">Generated ${escapeHtml(generatedAt)}</p>
          <section class="stats">
            ${statItems.map((item) => `<div class="stat"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong></div>`).join('')}
          </section>
          <table>
            <colgroup>
              <col class="c-num" /><col class="c-date" /><col class="c-status" />
              <col class="c-name" /><col class="c-contact" /><col class="c-allergy" />
              <col class="c-companions" /><col class="c-song" /><col class="c-message" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
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

  function exportCsv() {
    if (!rows.length) return;

    const headers = [
      '#',
      'Submitted',
      'Status',
      'Title',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Allergies',
      'Party Size',
      'Companions',
      'Song',
      'Message',
    ];

    const lines = rows.map((row, index) =>
      [
        index + 1,
        formatDate(row.submitted_at),
        row.attending === 'yes' ? 'Attending' : 'Cannot attend',
        row.title ?? '',
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.allergies ?? '',
        1 + companionsCount(row),
        companionsSummary(row),
        row.song ?? '',
        row.message ?? '',
      ]
        .map(escapeCsv)
        .join(','),
    );

    // Prepend a BOM so Excel reads UTF-8 correctly.
    const csv = '﻿' + [headers.map(escapeCsv).join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.download = `rsvp-export-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      {/* Site password management */}
      <form
        onSubmit={changeSitePassword}
        className="rounded-[1.75rem] border border-white/12 bg-white/[0.04] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6c787]/25 bg-[#e6c787]/10 text-[#e6c787]">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <div>
            <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
              Guest site password
            </label>
            <p className="mt-1 font-sans text-xs text-white/40">
              The password guests enter to view the site. Uses the admin password above.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={newSitePassword}
            onChange={(event) => setNewSitePassword(event.target.value)}
            type="text"
            placeholder="New guest password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e6c787]/40 bg-[#e6c787]/10 px-6 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e6c787] transition hover:bg-[#e6c787]/20 disabled:opacity-60"
          >
            {pwSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />}
            {pwSaving ? 'Saving' : 'Update Password'}
          </button>
        </div>
        {pwMessage && (
          <p className={`mt-3 font-sans text-sm ${pwMessage.ok ? 'text-emerald-200' : 'text-red-200'}`}>
            {pwMessage.text}
          </p>
        )}
      </form>

      {/* Email all RSVPs */}
      <form
        onSubmit={sendBulkEmail}
        className="rounded-[1.75rem] border border-white/12 bg-white/[0.04] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6c787]/25 bg-[#e6c787]/10 text-[#e6c787]">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
              Email guests
            </label>
            <p className="mt-1 font-sans text-xs text-white/40">
              Send a branded email to a whole group or to hand-picked guests. Uses the admin password above.
            </p>
          </div>
        </div>

        {/* Who to send to — a whole group, or hand-picked guests */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { label: 'Send to a group', value: 'group' as const },
            { label: 'Pick guests', value: 'pick' as const },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBulkMode(option.value)}
              className={`${filterButton} ${
                bulkMode === option.value
                  ? 'bg-[#e6c787] text-[#1a1410]'
                  : 'border border-white/12 bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {bulkMode === 'group' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'All RSVPs', value: 'all' as const },
              { label: 'Attending', value: 'attending' as const },
              { label: 'Declined', value: 'declined' as const },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBulkAudience(option.value)}
                className={`${filterButton} ${
                  bulkAudience === option.value
                    ? 'bg-[#e6c787] text-[#1a1410]'
                    : 'border border-white/12 bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/12 bg-white/[0.03] p-4">
            {!rows.length ? (
              <p className="font-sans text-sm text-white/50">
                Load the RSVPs above first, then pick who to email.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <input
                    value={pickerSearch}
                    onChange={(event) => setPickerSearch(event.target.value)}
                    type="text"
                    placeholder="Search name or email…"
                    className={`${inputCls} md:max-w-xs`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectShown}
                      className="inline-flex min-h-9 items-center rounded-full border border-white/16 bg-white/[0.05] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      Select shown
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEmails([])}
                      disabled={!selectedEmails.length}
                      className="inline-flex min-h-9 items-center rounded-full border border-white/16 bg-white/[0.05] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="mt-3 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e6c787]">
                  {selectedEmails.length} selected · newest RSVPs first
                </p>

                <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {pickerRows.map((row) => {
                    const key = row.email.trim().toLowerCase();
                    const checked = selectedEmails.includes(key);
                    return (
                      <label
                        key={row.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          checked
                            ? 'border-[#e6c787]/45 bg-[#e6c787]/10'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(row.email)}
                          className="h-4 w-4 flex-shrink-0 accent-[#e6c787]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-base text-white">
                            {fullName(row)}
                          </span>
                          <span className="block truncate font-sans text-xs text-white/45">
                            {row.email} · {formatDate(row.submitted_at)}
                          </span>
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-full px-2.5 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.18em] ${
                            row.attending === 'yes'
                              ? 'bg-[#e6c787]/12 text-[#e6c787]'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {row.attending === 'yes' ? 'Attending' : 'Declined'}
                        </span>
                      </label>
                    );
                  })}
                  {!pickerRows.length && (
                    <p className="py-4 text-center font-sans text-sm text-white/45">
                      No guests match that search.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <input
          value={bulkSubject}
          onChange={(event) => setBulkSubject(event.target.value)}
          type="text"
          placeholder="Subject"
          className={`${inputCls} mt-4`}
        />
        <textarea
          value={bulkMessage}
          onChange={(event) => setBulkMessage(event.target.value)}
          rows={6}
          placeholder="Write your message to guests… (e.g. travel updates, schedule reminders)"
          className={`${inputCls} mt-3 resize-y`}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-sans text-xs text-white/40">
            {bulkMode === 'pick'
              ? `Sending to ${selectedEmails.length} selected guest${selectedEmails.length === 1 ? '' : 's'}.`
              : 'Each guest gets their own copy — never a group/BCC email.'}
          </p>
          <button
            type="submit"
            disabled={bulkSending || (bulkMode === 'pick' && !selectedEmails.length)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e6c787] px-6 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1a1410] transition hover:bg-white disabled:opacity-60"
          >
            {bulkSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {bulkSending ? 'Sending' : 'Send Email'}
          </button>
        </div>
        {bulkResult && (
          <p className={`mt-3 font-sans text-sm ${bulkResult.ok ? 'text-emerald-200' : 'text-red-200'}`}>
            {bulkResult.text}
          </p>
        )}
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-6 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
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
      </div>

      {!!filteredRows.length && (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.025] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Showing {showingStart}–{showingEnd} of {filteredRows.length}
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
        {paginatedRows.map((row, rowIndex) => {
          const submissionNum = pageStart + rowIndex + 1;
          const isDeleting = deletingId === row.id;

          return (
            <article key={row.id} className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.052] text-white shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="grid gap-0 md:grid-cols-[1fr_auto]">
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                          #{submissionNum}
                        </span>
                        <span className={`inline-flex rounded-full px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] ${row.attending === 'yes' ? 'bg-[#e6c787]/12 text-[#e6c787]' : 'bg-white/10 text-white/70'}`}>
                          {row.attending === 'yes' ? 'Attending' : 'Cannot attend'}
                        </span>
                      </div>
                      <h2 className="mt-2 font-serif text-3xl text-white">{fullName(row)}</h2>
                      <div className="mt-2 flex flex-col gap-1 font-sans text-sm text-white/58 sm:flex-row sm:gap-4">
                        <span>{row.email}</span>
                        <span>{row.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <p className="font-sans text-xs text-white/45">{formatDate(row.submitted_at)}</p>
                      <button
                        type="button"
                        onClick={() => deleteRSVP(row.id)}
                        disabled={isDeleting}
                        title="Delete RSVP"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300 transition hover:bg-red-400/25 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isDeleting
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
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
                      <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-white/40">Message</p>
                      <p className="mt-2 font-serif text-lg italic leading-relaxed text-white/80">{row.message}</p>
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
                          {companionName(person)}
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
          );
        })}
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
