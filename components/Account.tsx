'use client';

import { useState } from 'react';
import { UserName, USERS } from '@/lib/types';
import { USER_CONFIG } from '@/lib/users';
import { Sheet, Avatar } from './ui';

export function Account({
  open,
  onClose,
  me,
  onLoggedOut,
}: {
  open: boolean;
  onClose: () => void;
  me: UserName;
  onLoggedOut: () => void;
}) {
  const [mode, setMode] = useState<'menu' | 'change'>('menu');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setMode('menu');
    setCurrentPin('');
    setNewPin('');
    setMsg('');
  }

  async function changePin() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPin, newPin }),
      });
      const data = await res.json();
      setMsg(res.ok ? '✓ PIN updated' : data.error || 'Failed');
      if (res.ok) {
        setCurrentPin('');
        setNewPin('');
        setTimeout(reset, 900);
      }
    } catch {
      setMsg('Network error');
    }
    setBusy(false);
  }

  async function clearMember(target: UserName) {
    if (!confirm(`Reset ${target}’s PIN? They’ll create a new one next time they sign in.`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'clear', targetUser: target }),
      });
      const data = await res.json();
      setMsg(res.ok ? `✓ ${target}’s PIN was reset` : data.error || 'Failed');
    } catch {
      setMsg('Network error');
    }
    setBusy(false);
  }

  async function logout() {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    onLoggedOut();
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Account">
      <div className="flex items-center gap-3 mb-4">
        <Avatar user={me} size={44} />
        <div>
          <div className="font-bold text-[16px]">{me}</div>
          <div className="text-[12px] text-slate-400">Signed in on this device</div>
        </div>
      </div>

      {msg && (
        <div className="mb-3 text-[13px] rounded-xl bg-slate-100 text-slate-600 p-2.5">{msg}</div>
      )}

      {mode === 'menu' ? (
        <div className="space-y-2">
          <button
            onClick={() => { setMode('change'); setMsg(''); }}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 font-semibold text-[15px]"
          >
            🔑 Change my PIN
          </button>

          <div className="pt-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Reset a member’s PIN
          </div>
          <div className="text-[12px] text-slate-400 mb-1">
            If someone forgot theirs, reset it here — they’ll set a new one next sign-in.
          </div>
          {USERS.filter((u) => u !== me).map((u) => (
            <div
              key={u}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-slate-100"
            >
              <Avatar user={u} size={30} />
              <span className="font-medium text-[15px] flex-1">{u}</span>
              <button
                onClick={() => clearMember(u)}
                disabled={busy}
                className="text-[13px] font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full"
              >
                Reset PIN
              </button>
            </div>
          ))}

          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 font-semibold text-[15px] mt-3"
          >
            🚪 Switch user / Sign out
          </button>
        </div>
      ) : (
        <div>
          <button onClick={reset} className="text-slate-400 text-[14px] mb-3">
            ‹ Back
          </button>
          <label className="block mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Current PIN</span>
            <input
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px]"
            />
          </label>
          <label className="block mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase">New PIN (4–6 digits)</span>
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px]"
            />
          </label>
          <button
            onClick={changePin}
            disabled={busy || currentPin.length < 4 || newPin.length < 4}
            className="w-full py-3 rounded-xl bg-ink text-white font-semibold disabled:opacity-40"
          >
            Update PIN
          </button>
        </div>
      )}
    </Sheet>
  );
}
