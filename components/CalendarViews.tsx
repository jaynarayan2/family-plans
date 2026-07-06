'use client';

import { useEffect, useRef, useState } from 'react';
import { AppState, CalEvent, CATEGORY_META, UserName, BacklogItem } from '@/lib/types';
import { Action } from '@/lib/reducer';
import {
  weekDays,
  fmtDayShort,
  fmtDayLong,
  relativeLabel,
  isToday,
  fmtTime,
  fmtDur,
  fmtMonthYear,
  monthShort,
  addDays,
} from '@/lib/dates';
import { AvatarStack } from './ui';
import { EventCard } from './EventCard';

// Timeline geometry
const START_HOUR = 6;
const END_HOUR = 24; // midnight
const HOUR_PX = 56;
const PX_PER_MIN = HOUR_PX / 60;
const SNAP_MIN = 30;
const DAY_MIN_START = START_HOUR * 60;
const DAY_MIN_END = END_HOUR * 60;

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function hhmmOf(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function snap(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}
function clampStart(min: number, durationMin: number): number {
  const latest = DAY_MIN_END - Math.min(durationMin, DAY_MIN_END - DAY_MIN_START);
  return Math.max(DAY_MIN_START, Math.min(min, latest));
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
}: {
  selected: string;
  onSelect: (d: string) => void;
}) {
  const start = addDays(selected, -3);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  return (
    <div>
      <div className="px-4 pt-1.5 text-[13px] font-bold text-slate-500">
        {fmtMonthYear(selected)}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-1 pb-2">
        {days.map((d, i) => {
          const { dow, num } = fmtDayShort(d);
          const active = d === selected;
          const newMonth = i === 0 || monthShort(d) !== monthShort(days[i - 1]);
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={`shrink-0 w-12 rounded-2xl pt-1.5 pb-1.5 flex flex-col items-center gap-0.5 ${
                active ? 'bg-ink text-white' : 'bg-white text-slate-500'
              }`}
            >
              <span
                className={`text-[9px] font-bold uppercase leading-none h-3 ${
                  active ? 'text-white/70' : 'text-slate-400'
                }`}
              >
                {newMonth ? monthShort(d) : ''}
              </span>
              <span className="text-[11px] font-medium leading-none">{dow}</span>
              <span className="text-[17px] font-bold leading-none">{num}</span>
              <span className="h-2 flex items-center justify-center">
                {isToday(d) && !active ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Timeline event block (press-and-hold to move) ----------
type Placed = { lane: number; cols: number };

function layoutLanes(evs: CalEvent[]): Map<string, Placed> {
  const sorted = [...evs].sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
  const result = new Map<string, Placed>();
  let cluster: CalEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const e of cluster) {
      const s = minutesOf(e.start);
      const en = s + e.durationMin;
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= s) {
          laneEnds[i] = en;
          laneOf.set(e.id, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        laneEnds.push(en);
        laneOf.set(e.id, laneEnds.length - 1);
      }
    }
    const cols = laneEnds.length;
    for (const e of cluster) result.set(e.id, { lane: laneOf.get(e.id) ?? 0, cols });
    cluster = [];
    clusterEnd = -1;
  };

  for (const e of sorted) {
    const s = minutesOf(e.start);
    const en = s + e.durationMin;
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, en);
  }
  flush();
  return result;
}

function TimelineEvent({
  ev,
  day,
  placed,
  dispatch,
  onEdit,
}: {
  ev: CalEvent;
  day: string;
  placed: Placed;
  dispatch: (a: Action) => void;
  onEdit: (ev: CalEvent) => void;
}) {
  const meta = CATEGORY_META[ev.category];
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [wiggle, setWiggle] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startY = useRef(0);
  const startMin = useRef(0);
  const previewRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    movedRef.current = false;
    startY.current = e.clientY;
    startMin.current = minutesOf(ev.start);
    previewRef.current = startMin.current;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    holdTimer.current = setTimeout(() => {
      if (ev.fixed) {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 450);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(60);
        return;
      }
      draggingRef.current = true;
      setDragging(true);
      setPreview(startMin.current);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    }, 380);
  }

  function onPointerMove(e: React.PointerEvent) {
    const dy = e.clientY - startY.current;
    if (!draggingRef.current) {
      if (Math.abs(dy) > 8) {
        movedRef.current = true;
        if (holdTimer.current) clearTimeout(holdTimer.current);
      }
      return;
    }
    e.preventDefault();
    const next = clampStart(snap(startMin.current + dy / PX_PER_MIN), ev.durationMin);
    previewRef.current = next;
    setPreview(next);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
      const finalMin = previewRef.current;
      setPreview(null);
      if (finalMin !== minutesOf(ev.start)) {
        dispatch({ type: 'moveEvent', id: ev.id, day, start: hhmmOf(finalMin) });
      }
      e.preventDefault();
      return;
    }
    if (!movedRef.current) onEdit(ev);
  }

  const curMin = dragging && preview != null ? preview : minutesOf(ev.start);
  const top = (curMin - DAY_MIN_START) * PX_PER_MIN;
  const height = Math.max(26, ev.durationMin * PX_PER_MIN - 3);
  const widthPct = 100 / placed.cols;
  const leftPct = placed.lane * widthPct;
  const short = height < 42;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        top,
        height,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeft: `4px solid ${meta.color}`,
        touchAction: 'none',
        zIndex: dragging ? 40 : 1,
      }}
      className={`absolute rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden px-2 py-1 select-none pointer-events-auto ${
        dragging ? 'ring-2 ring-ink scale-[1.02] shadow-xl' : ''
      } ${wiggle ? 'animate-pop ring-2 ring-slate-300' : ''}`}
    >
      {dragging && (
        <div className="absolute -top-0 right-1 text-[10px] font-bold text-white bg-ink px-1.5 py-0.5 rounded-full">
          {fmtTime(hhmmOf(curMin))} – {fmtTime(hhmmOf((curMin + ev.durationMin) % 1440))}
        </div>
      )}
      <div className="flex items-center gap-1 text-[11px] text-slate-400 leading-none min-w-0">
        <span>{meta.emoji}</span>
        <span className="font-medium truncate">
          {fmtTime(hhmmOf(curMin))} – {fmtTime(hhmmOf((curMin + ev.durationMin) % 1440))}
        </span>
        <span className="text-slate-300 shrink-0">· {fmtDur(ev.durationMin)}</span>
        {ev.fixed && <span className="shrink-0">🔒</span>}
      </div>
      <div className={`font-bold leading-tight truncate ${short ? 'text-[12px]' : 'text-[13px] mt-0.5'}`}>
        {ev.title}
      </div>
      {!short && (
        <div className="flex items-center gap-1 mt-1">
          {ev.status === 'pending' && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Pending
            </span>
          )}
          {ev.participants.length > 0 && height > 60 && (
            <span className="ml-auto">
              <AvatarStack users={ev.participants} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Day view (drag-able timeline) ----------
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
  const placement = layoutLanes(evs);
  const totalPx = (DAY_MIN_END - DAY_MIN_START) * PX_PER_MIN;
  const hourLines = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function timeFromClientY(clientY: number, container: HTMLElement, durationMin = 60): string {
    const rect = container.getBoundingClientRect();
    const y = clientY - rect.top;
    return hhmmOf(clampStart(snap(DAY_MIN_START + y / PX_PER_MIN), durationMin));
  }

  function placeAt(start: string) {
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

      <div className="mb-2 text-[11px] text-slate-400">
        {assignItem ? (
          <span className="text-amber-700 font-medium">Tap a time to place “{assignItem.title}”</span>
        ) : (
          'Tap empty space to add · press & hold an event to move it'
        )}
      </div>

      <div
        className="relative rounded-2xl border border-slate-100 bg-white"
        style={{ height: totalPx }}
      >
        {/* Hour grid + labels */}
        {hourLines.map((h) => {
          const y = (h * 60 - DAY_MIN_START) * PX_PER_MIN;
          return (
            <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: y }}>
              <span className="w-11 shrink-0 -mt-1.5 text-[10px] text-slate-400 font-medium pl-1">
                {h < END_HOUR ? fmtTime(hhmmOf(h * 60)) : ''}
              </span>
              <span className="flex-1 border-t border-slate-100 mt-0.5" />
            </div>
          );
        })}

        {/* Tap / drop layer for empty space */}
        <div
          className="absolute inset-y-0 right-1"
          style={{ left: 44 }}
          onClick={(e) => placeAt(timeFromClientY(e.clientY, e.currentTarget as HTMLElement))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData('text/backlog');
            if (id) {
              const start = timeFromClientY(e.clientY, e.currentTarget as HTMLElement);
              dispatch({ type: 'scheduleBacklog', id, day, start });
              onPlaced();
            }
          }}
        />

        {/* Events — container lets empty-space taps fall through to the tap layer */}
        <div className="absolute inset-y-0 right-1 pointer-events-none" style={{ left: 44 }}>
          {evs.map((e) => (
            <TimelineEvent
              key={e.id}
              ev={e}
              day={day}
              placed={placement.get(e.id) ?? { lane: 0, cols: 1 }}
              dispatch={dispatch}
              onEdit={onEdit}
            />
          ))}
        </div>
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
