'use client';

import { useState } from 'react';
import {
  CalEvent,
  Category,
  CATEGORY_META,
  Owner,
  UserName,
  USERS,
} from '@/lib/types';
import { Action } from '@/lib/reducer';
import { Sheet, Field, Avatar } from './ui';

const CATS = Object.keys(CATEGORY_META) as Category[];
const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];

export function EventEditor({
  open,
  onClose,
  me,
  dispatch,
  existing,
  defaultDay,
  defaultStart,
}: {
  open: boolean;
  onClose: () => void;
  me: UserName;
  dispatch: (a: Action) => void;
  existing?: CalEvent | null;
  defaultDay: string;
  defaultStart?: string;
}) {
  const e = existing;
  const [title, setTitle] = useState(e?.title ?? '');
  const [category, setCategory] = useState<Category>(e?.category ?? 'dinner');
  const [owner, setOwner] = useState<Owner>(e?.owner ?? 'shared');
  const [participants, setParticipants] = useState<UserName[]>(
    e?.participants ?? [...USERS]
  );
  const [day, setDay] = useState(e?.day ?? defaultDay);
  const [start, setStart] = useState(e?.start ?? defaultStart ?? '18:00');
  const [durationMin, setDurationMin] = useState(e?.durationMin ?? 60);
  const [location, setLocation] = useState(e?.location ?? '');
  const [notes, setNotes] = useState(e?.notes ?? '');
  const [fixed, setFixed] = useState(e?.fixed ?? false);
  const [status, setStatus] = useState<'pending' | 'confirmed'>(e?.status ?? 'pending');

  const isFixedLocked = !!e?.fixed; // existing fixed event: most fields locked

  function toggleParticipant(u: UserName) {
    setParticipants((p) => (p.includes(u) ? p.filter((x) => x !== u) : [...p, u]));
  }

  function save() {
    if (!title.trim()) return;
    const base = {
      title: title.trim(),
      category,
      owner,
      participants:
        owner === 'shared' ? participants : ([owner] as UserName[]),
      day,
      start,
      durationMin,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      fixed,
      status,
    };
    if (e) {
      dispatch({ type: 'updateEvent', id: e.id, patch: base, by: me });
    } else {
      dispatch({
        type: 'addEvent',
        event: { ...base, votes: {}, createdBy: me },
      });
    }
    onClose();
  }

  function del() {
    if (e) dispatch({ type: 'deleteEvent', id: e.id });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={e ? 'Edit plan' : 'New plan'}>
      {isFixedLocked && (
        <div className="mb-3 text-[13px] bg-slate-100 text-slate-600 rounded-xl p-3">
          🔒 This is a <b>fixed</b> event — it can’t be moved or edited. Unlock it below to make
          changes.
          <button
            onClick={() => {
              dispatch({ type: 'updateEvent', id: e!.id, patch: { fixed: false }, by: me });
              setFixed(false);
            }}
            className="mt-2 block px-3 py-1.5 rounded-full bg-ink text-white text-[13px] font-semibold"
          >
            Unlock this event
          </button>
        </div>
      )}

      {e && (
        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Votes
            </span>
            <div className="flex gap-1">
              {USERS.map((u) => {
                const v = e.votes[u];
                return (
                  <span
                    key={u}
                    title={`${u}: ${v ?? 'no vote'}`}
                    className={`text-[13px] w-7 h-7 rounded-full flex items-center justify-center ${
                      v === 'yes'
                        ? 'bg-emerald-100'
                        : v === 'no'
                        ? 'bg-rose-100'
                        : 'bg-slate-200 opacity-50'
                    }`}
                  >
                    {v === 'yes' ? '👍' : v === 'no' ? '👎' : u[0]}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch({ type: 'vote', id: e.id, user: me, value: 'yes' })}
              className={`flex-1 py-2 rounded-xl text-[14px] font-semibold ${
                e.votes[me] === 'yes' ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 border border-emerald-200'
              }`}
            >
              👍 I'm in
            </button>
            <button
              onClick={() => dispatch({ type: 'vote', id: e.id, user: me, value: 'no' })}
              className={`flex-1 py-2 rounded-xl text-[14px] font-semibold ${
                e.votes[me] === 'no' ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 border border-rose-200'
              }`}
            >
              👎 Pass
            </button>
          </div>
          <button
            onClick={() => {
              const next = status === 'confirmed' ? 'pending' : 'confirmed';
              dispatch({ type: 'setStatus', id: e.id, status: next, by: me });
              setStatus(next);
            }}
            className={`w-full mt-2 py-2.5 rounded-xl text-[14px] font-bold ${
              status === 'confirmed'
                ? 'bg-white text-slate-600 border border-slate-200'
                : 'bg-ink text-white'
            }`}
          >
            {status === 'confirmed' ? '↩️ Move back to pending' : '✅ Confirm & notify everyone'}
          </button>
        </div>
      )}

      <fieldset disabled={isFixedLocked} className={isFixedLocked ? 'opacity-60' : ''}>
        <Field label="What">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dinner at Buca, Costco run, Nap"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-ink"
          />
        </Field>

        <Field label="Type">
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
                  category === c
                    ? 'text-white border-transparent'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
                style={category === c ? { background: CATEGORY_META[c].color } : {}}
              >
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Whose plan">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOwner('shared')}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
                owner === 'shared' ? 'bg-ink text-white border-transparent' : 'bg-white border-slate-200'
              }`}
            >
              👨‍👩‍👧 Shared
            </button>
            {USERS.map((u) => (
              <button
                key={u}
                onClick={() => setOwner(u)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border flex items-center gap-1 ${
                  owner === u ? 'bg-ink text-white border-transparent' : 'bg-white border-slate-200'
                }`}
              >
                <Avatar user={u} size={18} /> {u}
              </button>
            ))}
          </div>
        </Field>

        {owner === 'shared' && (
          <Field label="Who's involved">
            <div className="flex flex-wrap gap-2">
              {USERS.map((u) => (
                <button
                  key={u}
                  onClick={() => toggleParticipant(u)}
                  className={`px-2.5 py-1.5 rounded-full text-[13px] font-medium border flex items-center gap-1 ${
                    participants.includes(u)
                      ? 'bg-slate-800 text-white border-transparent'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  <Avatar user={u} size={18} /> {u}
                </button>
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-ink"
            />
          </Field>
          <Field label="Start">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-ink"
            />
          </Field>
        </div>

        <Field label="How long">
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDurationMin(d)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
                  durationMin === d ? 'bg-ink text-white border-transparent' : 'bg-white border-slate-200'
                }`}
              >
                {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h${d % 60}`}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Where (optional)">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Address or place"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-ink"
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-ink"
          />
        </Field>

        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="font-semibold text-[14px]">Fixed event</div>
            <div className="text-[12px] text-slate-400">Can’t be moved or changed</div>
          </div>
          <button
            onClick={() => setFixed((f) => !f)}
            className={`w-12 h-7 rounded-full transition relative ${fixed ? 'bg-ink' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all ${
                fixed ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="font-semibold text-[14px]">Status</div>
            <div className="text-[12px] text-slate-400">Pending needs votes; confirm notifies all</div>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-full p-1">
            {(['pending', 'confirmed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${
                  status === s ? 'bg-white shadow text-ink' : 'text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2 mt-4">
        {e && (
          <button
            onClick={del}
            className="px-4 py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold text-[15px]"
          >
            Delete
          </button>
        )}
        <button
          onClick={save}
          disabled={isFixedLocked || !title.trim()}
          className="flex-1 px-4 py-3 rounded-xl bg-ink text-white font-semibold text-[15px] disabled:opacity-40"
        >
          {e ? 'Save changes' : 'Add plan'}
        </button>
      </div>
    </Sheet>
  );
}
