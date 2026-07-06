'use client';

import { CalEvent, CATEGORY_META, UserName, USERS } from '@/lib/types';
import { Action } from '@/lib/reducer';
import { fmtTime, endTime } from '@/lib/dates';
import { AvatarStack, StatusPill, LockBadge } from './ui';

export function EventCard({
  ev,
  me,
  dispatch,
  onEdit,
  compact,
}: {
  ev: CalEvent;
  me: UserName;
  dispatch: (a: Action) => void;
  onEdit: (ev: CalEvent) => void;
  compact?: boolean;
}) {
  const meta = CATEGORY_META[ev.category];
  const yes = USERS.filter((u) => ev.votes[u] === 'yes');
  const no = USERS.filter((u) => ev.votes[u] === 'no');
  const myVote = ev.votes[me];

  return (
    <div
      className="relative rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden animate-pop"
      style={{ borderLeft: `5px solid ${meta.color}` }}
    >
      <button className="w-full text-left p-3" onClick={() => onEdit(ev)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-medium">
              <span>{meta.emoji}</span>
              <span>
                {fmtTime(ev.start)} – {fmtTime(endTime(ev.start, ev.durationMin))}
              </span>
            </div>
            <div className="font-bold text-[15px] leading-tight mt-0.5 truncate">{ev.title}</div>
            {ev.location && (
              <div className="text-[12px] text-slate-400 truncate">📍 {ev.location}</div>
            )}
          </div>
          <div className="shrink-0">
            <StatusPill status={ev.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <LockBadge fixed={ev.fixed} />
          {!compact && (
            <span className="text-[11px] text-slate-400">
              {ev.owner === 'shared' ? 'Shared' : `${ev.owner}’s`}
            </span>
          )}
          {ev.participants.length > 0 && (
            <span className="ml-auto">
              <AvatarStack users={ev.participants} />
            </span>
          )}
        </div>
      </button>

      {/* Voting + confirm controls for pending, non-fixed events */}
      {ev.status === 'pending' && (
        <div className="px-3 pb-3 pt-0 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 rounded-full p-0.5">
            <button
              onClick={() => dispatch({ type: 'vote', id: ev.id, user: me, value: 'yes' })}
              className={`px-3 py-1 rounded-full text-[13px] font-semibold transition ${
                myVote === 'yes' ? 'bg-emerald-500 text-white' : 'text-emerald-600'
              }`}
            >
              👍 {yes.length}
            </button>
            <button
              onClick={() => dispatch({ type: 'vote', id: ev.id, user: me, value: 'no' })}
              className={`px-3 py-1 rounded-full text-[13px] font-semibold transition ${
                myVote === 'no' ? 'bg-rose-500 text-white' : 'text-rose-500'
              }`}
            >
              👎 {no.length}
            </button>
          </div>
          <button
            onClick={() => dispatch({ type: 'setStatus', id: ev.id, status: 'confirmed', by: me })}
            className="ml-auto px-3 py-1.5 rounded-full text-[13px] font-semibold bg-ink text-white active:scale-95 transition"
          >
            Confirm ✓
          </button>
        </div>
      )}
    </div>
  );
}
