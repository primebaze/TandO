import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';

type Attending = 'yes' | 'no' | null;

const steps = 3;

export default function RSVPForm() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState<Attending>(null);
  const [diet, setDiet] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0 && attending !== null;
    if (step === 1) return true;
    return true;
  }, [step, name, attending]);

  function fireConfetti() {
    void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }

  function handleSubmit() {
    setDone(true);
    fireConfetti();
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg md:p-10">
        <p className="font-[family-name:var(--font-family-script)] text-4xl text-[var(--color-gold)]">Thank you</p>
        <p className="mt-4 font-serif text-lg text-gray-600">
          {attending === 'yes'
            ? "We're so glad you can join us. Details will be shared closer to the date."
            : "We're sorry you can't make it — you'll be in our thoughts."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg md:p-10">
      <div className="mb-8 flex items-center justify-center gap-2">
        {Array.from({ length: steps }, (_, i) => (
          <div className="flex items-center gap-2" key={i}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i <= step ? 'bg-[var(--color-gold)] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < steps - 1 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name *</label>
            <input
              type="text"
              required
              placeholder="Your full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">Will you be attending?</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAttending('yes')}
                className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                  attending === 'yes'
                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Joyfully Accept
              </button>
              <button
                type="button"
                onClick={() => setAttending('no')}
                className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                  attending === 'no'
                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Respectfully Decline
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={!canNext}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-gold)] px-8 text-base font-medium text-white transition-colors hover:bg-[var(--color-gold-light)] disabled:pointer-events-none disabled:opacity-50"
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dietary requirements</label>
            <input
              type="text"
              placeholder="None / allergies / preferences"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">A note to the couple (optional)</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[var(--color-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="h-11 flex-1 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              type="button"
              className="h-11 flex-1 rounded-md bg-[var(--color-gold)] text-sm font-medium text-white hover:bg-[var(--color-gold-light)]"
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-center text-sm text-gray-600">
            <span className="font-medium text-gray-800">{name}</span>
            {attending === 'yes' ? ' will attend' : " can't attend"}.
            {email ? <span> We have your email: {email}</span> : null}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="h-11 flex-1 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="h-11 flex-1 rounded-md bg-[var(--color-gold)] text-sm font-medium text-white hover:bg-[var(--color-gold-light)]"
              onClick={handleSubmit}
            >
              Send RSVP
            </button>
          </div>
          <p className="text-center text-xs text-gray-400">This demo saves locally only — connect Supabase to store responses.</p>
        </div>
      )}
    </div>
  );
}
