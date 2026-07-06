'use client';

import { useState } from 'react';
import { UserName, USERS, HOME_ADDRESS } from '@/lib/types';
import { Action } from '@/lib/reducer';
import { todayISO } from '@/lib/dates';

interface Suggestion {
  name: string;
  detail: string;
  approxDistance: string;
  area: string;
}

const CUISINES = ['Italian', 'Chinese', 'Indian', 'Japanese', 'Thai', 'Mexican', 'Middle Eastern', 'BBQ'];
const DISTANCES = [1, 2, 5, 10];

function ResultCard({
  s,
  onAdd,
}: {
  s: Suggestion;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[15px]">{s.name}</div>
        <div className="text-[13px] text-slate-500">{s.detail}</div>
        <div className="text-[12px] text-slate-400 mt-0.5">
          📍 {s.area} · ~{s.approxDistance}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="text-[13px] font-semibold bg-ink text-white px-3 py-1.5 rounded-full whitespace-nowrap"
      >
        + Plan
      </button>
    </div>
  );
}

export function CuisineFinder({
  me,
  dispatch,
}: {
  me: UserName;
  dispatch: (a: Action) => void;
}) {
  const [cuisine, setCuisine] = useState('Italian');
  const [maxKm, setMaxKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [source, setSource] = useState<'ai' | 'curated'>('curated');

  async function go() {
    setLoading(true);
    setItems(null);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cuisine, maxKm }),
      });
      const data = await res.json();
      setItems(data.items || []);
      setSource(data.source || 'curated');
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  function addAsDinner(s: Suggestion) {
    dispatch({
      type: 'addEvent',
      event: {
        title: `Dinner: ${s.name}`,
        category: 'dinner',
        owner: 'shared',
        participants: [...USERS],
        day: todayISO(),
        start: '19:00',
        durationMin: 90,
        fixed: false,
        status: 'pending',
        votes: {},
        location: `${s.area} (~${s.approxDistance})`,
        notes: `${cuisine} · ${s.detail}`,
        createdBy: me,
      },
    });
  }

  return (
    <div className="px-4 pb-28">
      <h2 className="text-xl font-extrabold mt-1">Where to eat</h2>
      <p className="text-[13px] text-slate-400 mb-3">
        Pick a cuisine — get picks near home ({HOME_ADDRESS}).
      </p>

      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Cuisine</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {CUISINES.map((c) => (
          <button
            key={c}
            onClick={() => setCuisine(c)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
              cuisine === c ? 'bg-ink text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Within</div>
      <div className="flex gap-2 mb-4">
        {DISTANCES.map((d) => (
          <button
            key={d}
            onClick={() => setMaxKm(d)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
              maxKm === d ? 'bg-ink text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {d} km
          </button>
        ))}
      </div>

      <button
        onClick={go}
        disabled={loading}
        className="w-full px-4 py-3 rounded-xl bg-ink text-white font-semibold text-[15px] disabled:opacity-50 mb-4"
      >
        {loading ? 'Finding tasty spots…' : `Find ${cuisine} near home`}
      </button>

      {items && (
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {items.length} picks · {source === 'ai' ? 'AI-picked ✨' : 'Local favourites'}
          </div>
          <div className="space-y-2">
            {items.map((s, i) => (
              <ResultCard key={i} s={s} onAdd={() => addAsDinner(s)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ActivityFinder({
  me,
  dispatch,
}: {
  me: UserName;
  dispatch: (a: Action) => void;
}) {
  const [when, setWhen] = useState('This Saturday afternoon');
  const [maxKm, setMaxKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [source, setSource] = useState<'ai' | 'curated'>('curated');

  const WHENS = [
    'This Saturday afternoon',
    'This Sunday morning',
    'Tonight',
    'A rainy day',
    'Weekday evening',
  ];

  async function go() {
    setLoading(true);
    setItems(null);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ when, maxKm }),
      });
      const data = await res.json();
      setItems(data.items || []);
      setSource(data.source || 'curated');
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  function addAsActivity(s: Suggestion) {
    dispatch({
      type: 'addEvent',
      event: {
        title: s.name,
        category: 'activity',
        owner: 'shared',
        participants: [...USERS],
        day: todayISO(),
        start: '14:00',
        durationMin: 120,
        fixed: false,
        status: 'pending',
        votes: {},
        location: `${s.area} (~${s.approxDistance})`,
        notes: s.detail,
        createdBy: me,
      },
    });
  }

  return (
    <div className="px-4 pb-28">
      <h2 className="text-xl font-extrabold mt-1">Find something to do</h2>
      <p className="text-[13px] text-slate-400 mb-3">
        Activities near home ({HOME_ADDRESS}).
      </p>

      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">When</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {WHENS.map((w) => (
          <button
            key={w}
            onClick={() => setWhen(w)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
              when === w ? 'bg-ink text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Within</div>
      <div className="flex gap-2 mb-4">
        {DISTANCES.map((d) => (
          <button
            key={d}
            onClick={() => setMaxKm(d)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
              maxKm === d ? 'bg-ink text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {d} km
          </button>
        ))}
      </div>

      <button
        onClick={go}
        disabled={loading}
        className="w-full px-4 py-3 rounded-xl bg-ink text-white font-semibold text-[15px] disabled:opacity-50 mb-4"
      >
        {loading ? 'Looking for fun…' : 'Find activities'}
      </button>

      {items && (
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {items.length} ideas · {source === 'ai' ? 'AI-picked ✨' : 'Local favourites'}
          </div>
          <div className="space-y-2">
            {items.map((s, i) => (
              <ResultCard key={i} s={s} onAdd={() => addAsActivity(s)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
