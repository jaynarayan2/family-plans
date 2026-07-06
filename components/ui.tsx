'use client';

import { ReactNode, useRef } from 'react';
import { UserName } from '@/lib/types';
import { USER_CONFIG } from '@/lib/users';
import { fmtNiceDay } from '@/lib/dates';

// A date field that DISPLAYS "Mon 6 Jul" but opens the native date picker.
export function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function openPicker() {
    const el = ref.current;
    if (!el) return;
    try {
      // Modern browsers: opens the native picker without showing the ISO field.
      (el as any).showPicker ? (el as any).showPicker() : el.focus();
    } catch {
      el.focus();
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="w-full text-left rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] flex items-center justify-between focus:border-ink"
      >
        <span>{fmtNiceDay(value)}</span>
        <span className="text-slate-400">📅</span>
      </button>
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

export function Avatar({ user, size = 28 }: { user: UserName; size?: number }) {
  const c = USER_CONFIG[user];
  return (
    <span
      title={user}
      style={{ background: c.color, width: size, height: size, fontSize: size * 0.5 }}
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
    >
      {user[0]}
    </span>
  );
}

export function AvatarStack({ users }: { users: UserName[] }) {
  return (
    <span className="flex gap-1">
      {users.map((u) => (
        <Avatar key={u} user={u} size={20} />
      ))}
    </span>
  );
}

export function StatusPill({ status }: { status: 'pending' | 'confirmed' }) {
  if (status === 'confirmed') {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        Confirmed
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      Pending
    </span>
  );
}

export function LockBadge({ fixed }: { fixed: boolean }) {
  if (fixed) {
    return (
      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 flex items-center gap-0.5">
        🔒 Fixed
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 flex items-center gap-0.5">
      ↔ Movable
    </span>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fadein"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto animate-slidein"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-100">
          <h2 className="font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
