'use client';

import { AppState, CalEvent, UserName, BacklogItem } from '@/lib/types';
import { Action } from '@/lib/reducer';
import {
  weekDays,
  fmtDayShort,
  fmtDayLong,
  relativeLabel,
  isToday,
  fmtTime,
  addDays,
} from '@/lib/dates';
import { EventCard } from './EventCard';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am..11pm

function hh(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function eventsForDay(state: AppState, day: string): CalEvent[] {
  return state.events
    .filter((e) => e.day === day)
    .sort((a, b) => a.start.localeCompare(b.start));
}

// ---------- Day strip selector ----------
export function DayStrip({
  selected,
  onSelect,
  countFor,
}: {
  selected: string;
  onSelect: (d: string) => void;
  countFor: (d: string) => number;
}) {
  const start = addDays(selected, -3);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2">
      {days.map((d) => {
        const { dow, num } = fmtDayShort(d);
        const active = d === selected;
        const n = countFor(d);
        return (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={`shrink-0 w-12 rounded-2xl py-2 flex flex-col items-center relative ${
              active ? 'bg-ink text-white' : 'bg-white text-slate-500'
            }`}
          >
            <span className="text-[11px] font-medium">{dow}</span>
            <span className="text-[17px] font-bold leading-tight">{num}</span>
            {isToday(d) && !active && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-ink" />
            )}
            {n > 0 && (
              <span
                className={`absolute top-1 right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                  active ? 'bg-white text-ink' : 'bg-ink text-white'
                }`}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Day view (hour grid) ----------
export function DayView({
  state,
  me,
  dispatch,
  day,
  onEdit,
  onNewAt,
  assignItem,
  onPlaced,
}: {
  state: AppState;
  me: UserName;
  dispatch: (a: Action) => void;
  day: string;
  onEdit: (ev: CalEvent) => void;
  onNewAt: (day: string, start: string) => void;
  assignItem: BacklogItem | null;
  onPlaced: () => void;
}) {
  const evs = eventsForDay(state, day);
  const rel = relativeLabel(day);

  function place(start: string) {
    if (assignItem) {
      dispatch({ type: 'scheduleBacklog', id: assignItem.id, day, start });
      onPlaced();
    } else {
      onNewAt(day, start);
    }
  }

  return (
    <div className="px-4 pb-28">
      <div className="flex items-baseline justify-between mb-2 mt-1">
        <h2 className="text-xl font-extrabold">{rel || fmtDayLong(day)}</h2>
        {rel && <span className="text-slate-400 text-[13px]">{fmtDayLong(day)}</span>}
      </div>

      {assignItem && (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] p-3 animate-slidein">
          Tap a time to place <b>“{assignItem.title}”</b>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
        {HOURS.map((h) => {
          const slot = hh(h);
          const inSlot = evs.filter((e) => {
            const eh = parseInt(e.start.split(':')[0], 10);
            return eh === h;
          });
          return (
            <div
              key={h}
              onClick={() => inSlot.length === 0 && place(slot)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/backlog');
                if (id) {
                  dispatch({ type: 'scheduleBacklog', id, day, start: slot });
                  onPlaced();
                }
              }}
              className="flex gap-2 border-b border-slate-50 min-h-[52px] px-2 py-1.5 active:bg-slate-50"
            >
              <div className="w-11 shrink-0 text-[11px] text-slate-400 pt-1 font-medium">
                {fmtTime(slot)}
              </div>
              <div className="flex-1 space-y-1.5">
                {inSlot.map((e) => (
                  <EventCard key={e.id} ev={e} me={me} dispatch={dispatch} onEdit={onEdit} compact />
                ))}
                {inSlot.length === 0 && (
                  <div className="text-[12px] text-slate-300 pt-1.5">
                    {assignItem ? 'Tap to place here' : '+'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Week view (agenda) ----------
export function WeekView({
  state,
  me,
  dispatch,
  anchor,
  onEdit,
  onPickDay,
  onAnchorChange,
}: {
  state: AppState;
  me: UserName;
  dispatch: (a: Action) => void;
  anchor: string;
  onEdit: (ev: CalEvent) => void;
  onPickDay: (d: string) => void;
  onAnchorChange: (d: string) => void;
}) {
  const days = weekDays(anchor);
  const first = fmtDayLong(days[0]).replace(/,.*/, '');
  const last = fmtDayLong(days[6]).replace(/,.*/, '');
  return (
    <div className="px-4 pb-28 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => onAnchorChange(addDays(anchor, -7))}
          className="w-9 h-9 rounded-full bg-white shadow-sm text-slate-600 text-lg"
        >
          ‹
        </button>
        <div className="text-[13px] font-semibold text-slate-500">
          {first} – {last}
        </div>
        <button
          onClick={() => onAnchorChange(addDays(anchor, 7))}
          className="w-9 h-9 rounded-full bg-white shadow-sm text-slate-600 text-lg"
        >
          ›
        </button>
      </div>
      {days.map((d) => {
        const evs = eventsForDay(state, d);
        const rel = relativeLabel(d);
        return (
          <div key={d}>
            <button
              onClick={() => onPickDay(d)}
              className="flex items-center gap-2 mb-1.5 w-full"
            >
              <span
                className={`text-[15px] font-bold ${isToday(d) ? 'text-ink' : 'text-slate-700'}`}
              >
                {rel || fmtDayLong(d)}
              </span>
              {isToday(d) && (
                <span className="text-[10px] font-bold bg-ink text-white px-1.5 py-0.5 rounded-full">
                  TODAY
                </span>
              )}
              <span className="text-[12px] text-slate-300 ml-auto">
                {evs.length ? `${evs.length} plan${evs.length > 1 ? 's' : ''}` : ''}
              </span>
            </button>
            {evs.length === 0 ? (
              <div className="text-[13px] text-slate-300 pl-1 pb-1">Nothing planned</div>
            ) : (
              <div className="space-y-2">
                {evs.map((e) => (
                  <EventCard key={e.id} ev={e} me={me} dispatch={dispatch} onEdit={onEdit} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
