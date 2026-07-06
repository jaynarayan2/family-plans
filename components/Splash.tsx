'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserName, USERS } from '@/lib/types';
import { USER_CONFIG, pickImage } from '@/lib/users';

export function Splash({
  user,
  onPick,
  onEnter,
}: {
  user: UserName | null;
  onPick: (u: UserName) => void;
  onEnter: () => void;
}) {
  // New random image seed every open.
  const seed = useMemo(() => Math.floor(Math.random() * 100000), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  if (!user) {
    return (
      <div className="fixed inset-0 z-40 bg-ink text-white flex flex-col justify-center px-6">
        <div className="animate-fadein">
          <div className="text-3xl font-extrabold mb-1">Family Plans</div>
          <div className="text-slate-300 mb-8">Who’s this?</div>
          <div className="grid grid-cols-2 gap-3">
            {USERS.map((u) => {
              const c = USER_CONFIG[u];
              return (
                <button
                  key={u}
                  onClick={() => onPick(u)}
                  className="rounded-3xl p-5 flex flex-col items-center gap-2 active:scale-95 transition"
                  style={{ background: c.color }}
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="text-lg font-bold">{u}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const c = USER_CONFIG[user];
  const img = pickImage(user, seed);

  return (
    <button
      onClick={onEnter}
      className="fixed inset-0 z-40 text-white text-left flex flex-col justify-end"
      style={{ background: c.color }}
    >
      <img
        src={img}
        alt=""
        onLoad={() => setReady(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
      <div className="relative p-7 pb-16 animate-slidein">
        <div className="text-5xl mb-2">{c.emoji}</div>
        <div className="text-3xl font-extrabold drop-shadow">Hi {user}</div>
        <div className="text-white/90 text-lg drop-shadow mb-6">{c.greeting}</div>
        <div className="inline-flex items-center gap-2 bg-white/95 text-ink font-bold px-5 py-3 rounded-full">
          Tap to enter →
        </div>
      </div>
    </button>
  );
}
