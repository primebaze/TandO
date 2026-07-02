import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const UNLOCK_KEY = 'tothetaros_unlocked';

export default function PasswordGate() {
  const [locked, setLocked] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem(UNLOCK_KEY) === 'yes';
    if (!ok) {
      setLocked(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.classList.remove('is-locked');
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    // Password is validated server-side — never stored in the client bundle.
    const { data, error: rpcError } = await supabase.rpc('verify_site_password', {
      p_password: value.trim(),
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message || 'Something went wrong. Please try again.');
      return;
    }

    if (data === true) {
      localStorage.setItem(UNLOCK_KEY, 'yes');
      document.documentElement.classList.remove('is-locked');
      document.body.style.overflow = '';
      setLocked(false);
      window.dispatchEvent(new CustomEvent('site-unlocked'));
    } else {
      setError("That password isn't right — please check your invitation.");
    }
  }

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-6"
      style={{ backgroundColor: '#0c0a08' }}
    >
      {/* Marrakech backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url(/images/hero.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Legibility overlays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,10,8,0.82) 0%, rgba(12,10,8,0.7) 45%, rgba(12,10,8,0.9) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 25%, rgba(12,10,8,0.7) 95%)',
        }}
      />

      <div className="relative w-full max-w-md text-center">
        <p
          className="font-sans text-[10px] font-semibold uppercase tracking-[0.42em]"
          style={{ color: 'rgba(184,134,11,0.7)' }}
        >
          #ToTheTaros · Morocco Edition
        </p>
        <h1
          className="mt-5 text-6xl"
          style={{ fontFamily: "'Great Vibes', cursive", color: '#e6c787' }}
        >
          Tayo &amp; Ope
        </h1>
        <p
          className="mx-auto mt-4 max-w-xs font-serif text-base italic leading-relaxed"
          style={{ color: 'rgba(245,240,222,0.7)' }}
        >
          This part of our website is private. Please enter the password from
          your invitation to continue.
        </p>

        <form onSubmit={submit} className="mt-8">
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            type="password"
            placeholder="Enter password"
            autoFocus
            className="w-full rounded-xl border px-5 py-4 text-center font-sans text-white placeholder-white/35 outline-none transition focus:ring-2"
            style={{
              borderColor: error ? 'rgba(220,80,80,0.6)' : 'rgba(230,199,135,0.25)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              // 16px min prevents iOS Safari from auto-zooming on focus
              fontSize: '16px',
            }}
          />
          {error && (
            <p className="mt-3 font-sans text-sm" style={{ color: 'rgba(230,140,140,0.9)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex min-h-13 w-full items-center justify-center rounded-xl px-8 py-4 font-sans text-[11px] font-semibold uppercase tracking-[0.28em] transition hover:brightness-110 disabled:opacity-70"
            style={{ backgroundColor: '#e6c787', color: '#1a1410' }}
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
