'use client';

import { useEffect, useState } from 'react';
import { UserName, USERS } from '@/lib/types';
import { USER_CONFIG } from '@/lib/users';

type Step = 'pick' | 'login' | 'setup' | 'forgot';

function Dots({ n, len = 4 }: { n: number; len?: number }) {
  return (
    <div className="flex gap-3 justify-center my-5">
      {Array.from({ length: len }, (_, i) => (
        <span
          key={i}
          className={`w-3.5 h-3.5 rounded-full ${i < n ? 'bg-white' : 'bg-white/30'}`}
        />
      ))}
    </div>
  );
}

function Keypad({
  onKey,
  onBack,
}: {
  onKey: (d: string) => void;
  onBack: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            onClick={() => (k === '⌫' ? onBack() : onKey(k))}
            className="h-16 rounded-2xl bg-white/15 text-white text-2xl font-semibold active:bg-white/30 transition"
          >
            {k}
          </button>
        )
      )}
    </div>
  );
}

export function Gate({ onAuthed }: { onAuthed: (u: UserName) => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [user, setUser] = useState<UserName | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetCodeEnabled, setResetCodeEnabled] = useState(false);

  async function pick(u: UserName) {
    setUser(u);
    setError('');
    setPin('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'status', user: u }),
      });
      const data = await res.json();
      setResetCodeEnabled(!!data.resetCodeEnabled);
      setStep(data.hasPin ? 'login' : 'setup');
      setStage('enter');
    } catch {
      setError('Network error');
    }
  }

  async function submitLogin(fullPin: string) {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'login', user, pin: fullPin }),
      });
      const data = await res.json();
      if (res.ok) onAuthed(user);
      else {
        setError(data.error || 'Incorrect PIN');
        setPin('');
      }
    } catch {
      setError('Network error');
      setPin('');
    }
    setBusy(false);
  }

  async function submitSetup(fullPin: string) {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'setup', user, pin: fullPin }),
      });
      const data = await res.json();
      if (res.ok) onAuthed(user);
      else {
        setError(data.error || 'Could not set PIN');
        setStage('enter');
        setPin('');
        setConfirmPin('');
      }
    } catch {
      setError('Network error');
    }
    setBusy(false);
  }

  // Handle a completed 4-digit entry depending on step/stage.
  useEffect(() => {
    if (pin.length !== 4) return;
    if (step === 'login') {
      submitLogin(pin);
    } else if (step === 'setup') {
      if (stage === 'enter') {
        setConfirmPin(pin);
        setStage('confirm');
        setPin('');
      } else {
        if (pin === confirmPin) submitSetup(pin);
        else {
          setError('PINs didn’t match — try again');
          setStage('enter');
          setPin('');
          setConfirmPin('');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const c = user ? USER_CONFIG[user] : null;
  const bg = c ? c.color : '#1a1a2e';

  // ----- Pick screen -----
  if (step === 'pick') {
    return (
      <div className="fixed inset-0 z-40 bg-ink text-white flex flex-col justify-center px-6">
        <div className="animate-fadein">
          <div className="text-3xl font-extrabold mb-1">Family Plans</div>
          <div className="text-slate-300 mb-8">Who’s this?</div>
          <div className="grid grid-cols-2 gap-3">
            {USERS.map((u) => {
              const uc = USER_CONFIG[u];
              return (
                <button
                  key={u}
                  onClick={() => pick(u)}
                  className="rounded-3xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
                  style={{ background: uc.color }}
                >
                  <span className="text-4xl">{uc.emoji}</span>
                  <span className="text-lg font-bold">{u}</span>
                </button>
              );
            })}
          </div>
          <div className="text-center text-white/40 text-[12px] mt-8">
            🔒 Private — each person has their own PIN
          </div>
        </div>
      </div>
    );
  }

  // ----- Forgot screen -----
  if (step === 'forgot') {
    return (
      <div className="fixed inset-0 z-40 text-white flex flex-col justify-center px-6" style={{ background: bg }}>
        <button onClick={() => { setStep('login'); setError(''); }} className="absolute top-5 left-5 text-white/80">
          ‹ Back
        </button>
        <div className="animate-fadein max-w-sm mx-auto w-full">
          <div className="text-2xl font-extrabold mb-2">Forgot {user}’s PIN?</div>
          <ForgotForm
            user={user!}
            resetCodeEnabled={resetCodeEnabled}
            onDone={() => onAuthed(user!)}
          />
        </div>
      </div>
    );
  }

  // ----- Login / Setup keypad -----
  const title =
    step === 'setup'
      ? stage === 'enter'
        ? `Create ${user}’s PIN`
        : 'Confirm your PIN'
      : `Hi ${user} — enter your PIN`;

  return (
    <div className="fixed inset-0 z-40 text-white flex flex-col justify-center px-6" style={{ background: bg }}>
      <button
        onClick={() => {
          setStep('pick');
          setUser(null);
          setPin('');
          setConfirmPin('');
          setStage('enter');
          setError('');
        }}
        className="absolute top-5 left-5 text-white/80"
      >
        ‹ Back
      </button>

      <div className="animate-fadein text-center">
        <div className="text-5xl mb-2">{c?.emoji}</div>
        <div className="text-xl font-extrabold">{title}</div>
        {step === 'setup' && stage === 'enter' && (
          <div className="text-white/70 text-[13px] mt-1">Pick a 4-digit PIN you’ll remember</div>
        )}
        <Dots n={pin.length} />
        <div className="h-5 text-[13px] text-white/90 font-medium">{error}</div>
        <div className={busy ? 'opacity-50 pointer-events-none' : ''}>
          <Keypad
            onKey={(d) => setPin((p) => (p.length < 4 ? p + d : p))}
            onBack={() => setPin((p) => p.slice(0, -1))}
          />
        </div>
        {step === 'login' && (
          <button
            onClick={() => { setStep('forgot'); setError(''); setPin(''); }}
            className="mt-6 text-white/80 text-[14px] underline"
          >
            Forgot PIN?
          </button>
        )}
      </div>
    </div>
  );
}

function ForgotForm({
  user,
  resetCodeEnabled,
  onDone,
}: {
  user: UserName;
  resetCodeEnabled: boolean;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'reset', user, code, newPin }),
      });
      const data = await res.json();
      if (res.ok) onDone();
      else setError(data.error || 'Reset failed');
    } catch {
      setError('Network error');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="rounded-2xl bg-white/15 p-4 text-[14px] leading-relaxed mb-4">
        <b>Option 1:</b> Ask someone already signed in (on their phone) to reset your PIN from their
        <b> Account → Reset a PIN</b>. Then just create a new one.
      </div>
      {resetCodeEnabled ? (
        <div className="rounded-2xl bg-white/15 p-4">
          <div className="text-[14px] mb-3">
            <b>Option 2:</b> Enter the family reset code to set a new PIN now.
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Family reset code"
            className="w-full rounded-xl px-3 py-2.5 text-ink text-[15px] mb-2"
          />
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="New 4-digit PIN"
            className="w-full rounded-xl px-3 py-2.5 text-ink text-[15px] mb-2"
          />
          <div className="h-5 text-[13px] text-white/90">{error}</div>
          <button
            onClick={submit}
            disabled={busy || code.length === 0 || newPin.length < 4}
            className="w-full py-3 rounded-xl bg-white text-ink font-bold disabled:opacity-50"
          >
            Reset & sign in
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/10 p-4 text-[13px] text-white/80">
          A family reset code hasn’t been set up, so please use Option 1.
        </div>
      )}
    </div>
  );
}
