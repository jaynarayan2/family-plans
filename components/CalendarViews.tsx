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
  me,
  placed,
  dispatch,
  onEdit,
}: {
  ev: CalEvent;
  day: string;
  me: UserName;
  placed: Placed;
  dispatch: (a: Action) => void;
  onEdit: (ev: CalEvent) => void;
}) {
  const meta = CATEGORY_META[ev.category];
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const [previewDur, setPreviewDur] = useState<number | null>(null);
  const [wiggle, setWiggle] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startY = useRef(0);
  const startMin = useRef(0);
  const previewRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const downRef = useRef(false); // pointer actually pressed (ignore desktop hover moves)

  const resStartY = useRef(0);
  const resOrigDur = useRef(0);
  const resPreviewRef = useRef(0);
  const resizingRef = useRef(false);
  const resMovedRef = useRef(false);
  const resDownRef = useRef(false);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    downRef.current = true;
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
    if (!downRef.current) return; // ignore desktop hover moves
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
    downRef.current = false;
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

  // ---- Resize (drag the bottom edge to change the end time) ----
  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    if (ev.fixed) return;
    resDownRef.current = true;
    resMovedRef.current = false;
    resStartY.current = e.clientY;
    resOrigDur.current = ev.durationMin;
    resPreviewRef.current = ev.durationMin;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }
  function onResizeMove(e: React.PointerEvent) {
    if (ev.fixed || !resDownRef.current) return; // ignore desktop hover moves
    const dy = e.clientY - resStartY.current;
    if (!resizingRef.current) {
      if (Math.abs(dy) > 3) {
        resMovedRef.current = true;
        resizingRef.current = true;
        setResizing(true);
      } else return;
    }
    e.preventDefault();
    e.stopPropagation();
    const maxDur = DAY_MIN_END - minutesOf(ev.start);
    const next = Math.max(30, Math.min(snap(resOrigDur.current + dy / PX_PER_MIN), maxDur));
    resPreviewRef.current = next;
    setPreviewDur(next);
  }
  function onResizeUp(e: React.PointerEvent) {
    e.stopPropagation();
    resDownRef.current = false;
    if (resizingRef.current) {
      resizingRef.current = false;
      setResizing(false);
      const finalDur = resPreviewRef.current;
      setPreviewDur(null);
      if (finalDur !== ev.durationMin) {
        dispatch({ type: 'updateEvent', id: ev.id, patch: { durationMin: finalDur }, by: me });
      }
      e.preventDefault();
      return;
    }
    if (!resMovedRef.current) onEdit(ev);
  }

  const curMin = dragging && preview != null ? preview : minutesOf(ev.start);
  const curDur = resizing && previewDur != null ? previewDur : ev.durationMin;
  const top = (curMin - DAY_MIN_START) * PX_PER_MIN;
  const height = Math.max(26, curDur * PX_PER_MIN - 3);
  const widthPct = 100 / placed.cols;
  const leftPct = placed.lane * widthPct;
  const short = height < 46;
  const active = dragging || resizing;
  const range = `${fmtTime(hhmmOf(curMin))} – ${fmtTime(hhmmOf((curMin + curDur) % 1440))}`;

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
        zIndex: active ? 40 : 1,
      }}
      className={`absolute rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden px-2 py-1 select-none pointer-events-auto ${
        active ? 'ring-2 ring-ink shadow-xl' : ''
      } ${dragging ? 'scale-[1.02]' : ''} ${wiggle ? 'animate-pop ring-2 ring-slate-300' : ''}`}
    >
      {active && (
        <div className="absolute top-0 right-1 text-[10px] font-bold text-white bg-ink px-1.5 py-0.5 rounded-full z-10">
          {range}
        </div>
      )}

      {short ? (
        // Compact single line so short (e.g. 30-min) events still show the name.
        <div className="flex items-center gap-1 leading-tight min-w-0">
          <span className="text-[11px] shrink-0">{meta.emoji}</span>
          <span className="font-bold text-[12px] truncate">{ev.title}</span>
          <span className="text-[10px] text-slate-400 shrink-0">{fmtTime(hhmmOf(curMin))}</span>
          {ev.fixed && <span className="text-[10px] shrink-0">🔒</span>}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 leading-none min-w-0">
            <span>{meta.emoji}</span>
            <span className="font-medium truncate">{range}</span>
            <span className="text-slate-300 shrink-0">· {fmtDur(curDur)}</span>
            {ev.fixed && <span className="shrink-0">🔒</span>}
          </div>
          <div className="font-bold leading-tight truncate text-[13px] mt-0.5">{ev.title}</div>
          <div className="flex items-center gap-1 mt-1">
            {ev.status === 'pending' && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Pending
              </span>
            )}
            {ev.participants.length > 0 && height > 62 && (
              <span className="ml-auto">
                <AvatarStack users={ev.participants} />
              </span>
            )}
          </div>
        </>
      )}

      {/* Bottom handle: drag to extend/shorten (changes the end time) */}
      {!ev.fixed && (
        <div
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          style={{ touchAction: 'none' }}
          className="absolute left-0 right-0 bottom-0 h-3 flex items-end justify-center cursor-ns-resize"
        >
          <span className={`mb-[3px] h-1 w-6 rounded-full ${active ? 'bg-ink' : 'bg-slate-300'}`} />
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
              me={me}
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

// ---------- Week view (7-column grid) ----------
const WH0 = 6; // 6am
const WH1 = 24; // midnight
const WHPX = 42; // px per hour
const WPX_PER_MIN = WHPX / 60;
const WGUTTER = 26;

function weekHourLabel(h: number): string {
  const ap = h >= 12 && h < 24 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ap}`;
}

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
  const total = (WH1 - WH0) * WHPX;
  const hours = Array.from({ length: WH1 - WH0 + 1 }, (_, i) => WH0 + i);

  return (
    <div className="pb-28">
      {/* Week nav */}
      <div className="flex items-center justify-between px-4 pt-1 pb-1">
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

      {/* Day headers */}
      <div className="flex px-2">
        <div style={{ width: WGUTTER }} className="shrink-0" />
        {days.map((d) => {
          const { dow, num } = fmtDayShort(d);
          const today = isToday(d);
          return (
            <button
              key={d}
              onClick={() => onPickDay(d)}
              className={`flex-1 min-w-0 flex flex-col items-center py-1 mx-[1px] rounded-lg ${
                today ? 'bg-ink text-white' : 'text-slate-500'
              }`}
            >
              <span className="text-[10px] font-medium leading-none">{dow}</span>
              <span className="text-[15px] font-bold leading-tight">{num}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="relative mx-2 mt-1 rounded-xl border border-slate-100 bg-white overflow-hidden"
        style={{ height: total }}
      >
        {/* Hour lines + labels */}
        {hours.map((h) => {
          const y = (h - WH0) * WHPX;
          return (
            <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: y }}>
              <span
                className="text-[9px] text-slate-400 leading-none -mt-1 pl-1"
                style={{ width: WGUTTER }}
              >
                {h < WH1 ? weekHourLabel(h) : ''}
              </span>
              <span className="flex-1 border-t border-slate-100" />
            </div>
          );
        })}

        {/* Day columns with positioned events */}
        <div className="absolute inset-0 flex" style={{ left: WGUTTER }}>
          {days.map((d) => {
            const evs = eventsForDay(state, d);
            const lanes = layoutLanes(evs);
            const today = isToday(d);
            return (
              <div
                key={d}
                className={`relative flex-1 min-w-0 border-l border-slate-100 ${
                  today ? 'bg-indigo-50/50' : ''
                }`}
              >
                {evs.map((ev) => {
                  const meta = CATEGORY_META[ev.category];
                  const s = minutesOf(ev.start);
                  const top = (s - WH0 * 60) * WPX_PER_MIN;
                  const h = Math.max(15, ev.durationMin * WPX_PER_MIN - 2);
                  const pl = lanes.get(ev.id) ?? { lane: 0, cols: 1 };
                  const w = 100 / pl.cols;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEdit(ev)}
                      style={{
                        top,
                        height: h,
                        left: `${pl.lane * w}%`,
                        width: `calc(${w}% - 1px)`,
                        background: `${meta.color}22`,
                        borderLeft: `3px solid ${meta.color}`,
                      }}
                      className="absolute rounded-[5px] overflow-hidden px-0.5 pt-0.5 text-left leading-none"
                    >
                      <span className="block truncate text-[9px] font-bold text-slate-700">
                        {meta.emoji}
                        {h > 24 ? ` ${ev.title}` : ''}
                      </span>
                      {h > 42 && (
                        <span className="block truncate text-[8px] text-slate-500 mt-0.5">
                          {fmtTime(ev.start)}
                        </span>
                      )}
                      {ev.status === 'pending' && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                      {ev.fixed && (
                        <span className="absolute bottom-0 right-0.5 text-[7px]">🔒</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-center text-[11px] text-slate-400 mt-2 px-4">
        Tap a day to open it · tap an event to edit
      </div>
    </div>
  );
}
