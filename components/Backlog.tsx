'use client';

import { useState } from 'react';
import {
  AppState,
  BacklogItem,
  Category,
  CATEGORY_META,
  Owner,
  UserName,
  USERS,
} from '@/lib/types';
import { Action } from '@/lib/reducer';
import { AvatarStack, Field, Sheet } from './ui';

const CATS = Object.keys(CATEGORY_META) as Category[];

export function Backlog({
  state,
  me,
  dispatch,
  onSchedule,
}: {
  state: AppState;
  me: UserName;
  dispatch: (a: Action) => void;
  onSchedule: (item: BacklogItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('activity');
  const [owner, setOwner] = useState<Owner>('shared');
  const [durationMin, setDurationMin] = useState(90);

  function add() {
    if (!title.trim()) return;
    dispatch({
      type: 'addBacklog',
      item: {
        title: title.trim(),
        category,
        owner,
        participants: owner === 'shared' ? [...USERS] : [owner as UserName],
        durationMin,
        createdBy: me,
      },
    });
    setTitle('');
    setAdding(false);
  }

  return (
    <div className="px-4 pb-28">
      <div className="flex items-center justify-between mt-1 mb-1">
        <h2 className="text-xl font-extrabold">Backlog</h2>
        <button
          onClick={() => setAdding(true)}
          className="text-[14px] font-semibold bg-ink text-white px-3 py-1.5 rounded-full"
        >
          + Idea
        </button>
      </div>
      <p className="text-[13px] text-slate-400 mb-3">
        Things we might do. Tap <b>Schedule</b> then pick a time — or drag onto a day.
      </p>

      {state.backlog.length === 0 && (
        <div className="text-center text-slate-400 py-10 text-[14px]">
          No ideas yet. Add something you’d like to do 💡
        </div>
      )}

      <div className="space-y-2">
        {state.backlog.map((b) => {
          const meta = CATEGORY_META[b.category];
          return (
            <div
              key={b.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/backlog', b.id)}
              className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 flex items-center gap-3"
              style={{ borderLeft: `5px solid ${meta.color}` }}
            >
              <div className="text-2xl">{meta.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px] truncate">{b.title}</div>
                <div className="text-[12px] text-slate-400 flex items-center gap-2">
                  <span>{meta.label}</span>
                  <span>· {b.durationMin >= 60 ? `${b.durationMin / 60}h` : `${b.durationMin}m`}</span>
                </div>
              </div>
              <AvatarStack users={b.participants} />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onSchedule(b)}
                  className="text-[13px] font-semibold bg-ink text-white px-3 py-1.5 rounded-full whitespace-nowrap"
                >
                  Schedule
                </button>
                <button
                  onClick={() => dispatch({ type: 'deleteBacklog', id: b.id })}
                  className="text-[12px] text-slate-400"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add to backlog">
        <Field label="Idea">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Visit Toronto Islands"
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
                  category === c ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                }`}
                style={category === c ? { background: CATEGORY_META[c].color } : {}}
              >
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Whose">
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
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium border ${
                  owner === u ? 'bg-ink text-white border-transparent' : 'bg-white border-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </Field>
        <button
          onClick={add}
          disabled={!title.trim()}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-ink text-white font-semibold text-[15px] disabled:opacity-40"
        >
          Add idea
        </button>
      </Sheet>
    </div>
  );
}
