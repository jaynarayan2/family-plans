'use client';

import { AppState, UserName } from '@/lib/types';
import { todayISO, fmtTime, relativeLabel, fmtDayLong } from '@/lib/dates';
import { todayCount, needsMyVote, nextEvent } from '@/lib/selectors';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function HomeSummary({
  state,
  me,
  onOpenNeeds,
}: {
  state: AppState;
  me: UserName;
  onOpenNeeds: () => void;
}) {
  const count = todayCount(state, me);
  const needs = needsMyVote(state, me);
  const now = new Date();
  const nowKey = `${todayISO()}T${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const next = nextEvent(state, me, nowKey);

  const nextWhen = next
    ? (relativeLabel(next.day) || fmtDayLong(next.day).replace(/,.*/, '')) +
      ' · ' +
      fmtTime(next.start)
    : null;

  return (
    <div className="mx-4 mt-2 rounded-2xl bg-white border border-slate-100 shadow-sm p-3">
      <div className="font-extrabold text-[15px]">
        {greeting()}, {me}
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          🗓 {count === 0 ? 'Nothing' : `${count} plan${count > 1 ? 's' : ''}`} today
        </span>
        {next && (
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 max-w-[60%] truncate">
            🕒 Next: {next.title} · {nextWhen}
          </span>
        )}
        <button
          onClick={onOpenNeeds}
          disabled={needs.length === 0}
          className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${
            needs.length > 0
              ? 'bg-amber-100 text-amber-800 active:scale-95'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          🗳 {needs.length > 0 ? `${needs.length} need your vote` : 'All voted'}
        </button>
      </div>
    </div>
  );
}
