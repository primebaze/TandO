import { useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

type Attending = 'yes' | 'no' | null;

type Companion = {
  id: string;
  type: 'adult' | 'child';
  firstName: string;
  lastName: string;
  allergies: string;
};

const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'];

const DIAL_CODES = [
  { code: '+44', label: 'UK +44' },
  { code: '+1', label: 'US/CA +1' },
  { code: '+33', label: 'FR +33' },
  { code: '+34', label: 'ES +34' },
  { code: '+39', label: 'IT +39' },
  { code: '+49', label: 'DE +49' },
  { code: '+212', label: 'MA +212' },
  { code: '+234', label: 'NG +234' },
  { code: '+971', label: 'AE +971' },
  { code: '+27', label: 'ZA +27' },
  { code: '+61', label: 'AU +61' },
  { code: '+91', label: 'IN +91' },
];

const newCompanion = (type: 'adult' | 'child'): Companion => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  firstName: '',
  lastName: '',
  allergies: '',
});

// Tailwind utility groups for dark/glass form controls
const inputCls =
  'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-sans text-sm text-white placeholder-white/35 backdrop-blur-md transition focus:border-[#e6c787]/70 focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#e6c787]/30';

const labelCls =
  'mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-white/70';

const sectionCls =
  'rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-8';

export default function RSVPForm() {
  const [attending, setAttending] = useState<Attending>(null);
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState('+44');
  const [phone, setPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [song, setSong] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addCompanion(type: 'adult' | 'child') {
    setCompanions((prev) => [...prev, newCompanion(type)]);
  }

  function updateCompanion(id: string, patch: Partial<Companion>) {
    setCompanions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCompanion(id: string) {
    setCompanions((prev) => prev.filter((c) => c.id !== id));
  }

  function fireConfetti() {
    void confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#e6c787', '#ffffff', '#b3882f', '#fff8e1'],
    });
  }

  function validate(): string | null {
    if (!attending) return 'Please let us know if you can attend.';
    if (!firstName.trim()) return 'Please enter your first name.';
    if (!lastName.trim()) return 'Please enter your last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'Please enter a valid email address.';
    if (!phone.trim()) return 'Please enter your phone number.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);

    const payload = {
      attending,
      title,
      firstName,
      lastName,
      email,
      phone: `${dialCode} ${phone}`.trim(),
      allergies,
      companions: companions.map(({ id: _id, ...rest }) => rest),
      song,
      message,
      submittedAt: new Date().toISOString(),
    };

    try {
      const { error: submitError } = await supabase.rpc('submit_rsvp', {
        p_attending: payload.attending,
        p_title: payload.title || null,
        p_first_name: payload.firstName.trim(),
        p_last_name: payload.lastName.trim(),
        p_email: payload.email.trim().toLowerCase(),
        p_phone: payload.phone,
        p_allergies: payload.allergies || null,
        p_companions: payload.companions,
        p_song: payload.song || null,
        p_message: payload.message || null,
        p_honeypot: website,
      });

      if (submitError) {
        throw submitError;
      }

      setDone(true);
      if (attending === 'yes') fireConfetti();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={`${sectionCls} text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#e6c787]/40 bg-[#e6c787]/10">
          <svg
            className="h-6 w-6 text-[#e6c787]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p
          className="mt-6 font-normal text-5xl text-[#e6c787]"
          style={{ fontFamily: "var(--font-family-script), 'Great Vibes', cursive" }}
        >
          Thank you
        </p>
        <p className="mt-3 font-serif text-base font-light italic leading-relaxed text-white/85 md:text-lg">
          {attending === 'yes'
            ? "We can't wait to celebrate with you in Marrakech."
            : "We'll miss you — thank you for letting us know."}
        </p>
        <p className="mt-6 font-sans text-[10px] uppercase tracking-[0.36em] text-white/55">
          Your RSVP has been recorded
        </p>
        <a
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-white transition hover:bg-white/10"
        >
          Back to invitation
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={sectionCls} noValidate>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Attending */}
      <fieldset className="mb-8">
        <legend className={labelCls}>Will you attend? *</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setAttending('yes')}
            className={`group flex items-center justify-center gap-3 rounded-xl border px-5 py-4 font-sans text-sm font-medium uppercase tracking-[0.18em] transition ${
              attending === 'yes'
                ? 'border-[#e6c787] bg-[#e6c787]/15 text-[#e6c787] shadow-[0_0_0_3px_rgba(230,199,135,0.12)]'
                : 'border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30 hover:bg-white/[0.08]'
            }`}
          >
            <span className="text-base">✦</span>
            Yes, I&rsquo;ll be there
          </button>
          <button
            type="button"
            onClick={() => setAttending('no')}
            className={`group flex items-center justify-center gap-3 rounded-xl border px-5 py-4 font-sans text-sm font-medium uppercase tracking-[0.18em] transition ${
              attending === 'no'
                ? 'border-white/60 bg-white/10 text-white shadow-[0_0_0_3px_rgba(255,255,255,0.08)]'
                : 'border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30 hover:bg-white/[0.08]'
            }`}
          >
            Sorry, I can&rsquo;t make it
          </button>
        </div>
      </fieldset>

      {/* Identity */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelCls}>Title</label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221.5%22><path d=%22M1 1l5 5 5-5%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10`}
          >
            <option value="" className="bg-[#1a1410] text-white/60">
              Select title
            </option>
            {TITLES.map((t) => (
              <option key={t} value={t} className="bg-[#1a1410] text-white">
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>First Name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Last Name *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            className={inputCls}
            required
          />
        </div>
      </div>

      {/* Contact */}
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto_1.4fr]">
        <div className="md:col-span-3">
          <label className={labelCls}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Int. Code</label>
          <select
            value={dialCode}
            onChange={(e) => setDialCode(e.target.value)}
            className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221.5%22><path d=%22M1 1l5 5 5-5%22/></svg>')] bg-[length:12px] bg-[right_0.85rem_center] bg-no-repeat pr-9`}
          >
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code} className="bg-[#1a1410] text-white">
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="7700 900000"
            className={inputCls}
            required
          />
        </div>
      </div>

      {/* Allergies */}
      <div className="mb-8">
        <label className={labelCls}>Allergies or dietary requirements</label>
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. gluten-free, lactose intolerant…"
          className={inputCls}
        />
      </div>

      {/* Companions */}
      <div id="companions" className="mb-8 scroll-mt-24">
        <div className="mb-1 flex items-center justify-between">
          <span className={labelCls.replace('mb-2', 'mb-0')}>Companions</span>
        </div>
        <p className="mb-4 font-serif text-sm font-light italic leading-relaxed text-white/60">
          Add the people joining you and note any allergies they may have.
        </p>

        <div className="space-y-3">
          {companions.map((c, idx) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e6c787]/30 bg-[#e6c787]/10 px-3 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.32em] text-[#e6c787]">
                  {c.type === 'adult' ? 'Adult' : 'Child'} #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCompanion(c.id)}
                  className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/50 transition hover:text-white"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={c.firstName}
                  onChange={(e) => updateCompanion(c.id, { firstName: e.target.value })}
                  placeholder="First name"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={c.lastName}
                  onChange={(e) => updateCompanion(c.id, { lastName: e.target.value })}
                  placeholder="Last name"
                  className={inputCls}
                />
              </div>
              <input
                type="text"
                value={c.allergies}
                onChange={(e) => updateCompanion(c.id, { allergies: e.target.value })}
                placeholder="Allergies / dietary requirements"
                className={`${inputCls} mt-3`}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            onClick={() => addCompanion('adult')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-[#e6c787]/50 hover:bg-white/[0.06] hover:text-[#e6c787]"
          >
            <span className="text-base leading-none">+</span> Add Adult
          </button>
          <button
            type="button"
            onClick={() => addCompanion('child')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-[#e6c787]/50 hover:bg-white/[0.06] hover:text-[#e6c787]"
          >
            <span className="text-base leading-none">+</span> Add Child
          </button>
        </div>
      </div>

      {/* Song & Message */}
      <div className="mb-6">
        <label className={labelCls}>Song you&rsquo;d love to hear</label>
        <input
          type="text"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="e.g. Viva la Vida — Coldplay"
          className={inputCls}
        />
      </div>

      <div className="mb-8">
        <label className={labelCls}>Message for the couple (optional)</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write us a few words…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-sans text-xs text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="group relative inline-flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#e6c787] px-8 font-sans text-xs font-semibold uppercase tracking-[0.36em] text-[#1a1410] shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {submitting ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#1a1410]/30 border-t-[#1a1410]" />
            Sending…
          </>
        ) : (
          <>
            Send RSVP
            <svg
              className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </>
        )}
      </button>

      <p className="mt-5 text-center font-sans text-[10px] uppercase tracking-[0.32em] text-white/45">
        Your response will be saved securely
      </p>
    </form>
  );
}
