export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Monday-start week containing the given day.
export function weekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function weekDays(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function fmtDayLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function fmtDayShort(iso: string): { dow: string; num: string } {
  const d = new Date(iso + 'T00:00:00');
  return {
    dow: d.toLocaleDateString('en-CA', { weekday: 'short' }),
    num: String(d.getDate()),
  };
}

// Duration like "30m", "1h", "1h30"
export function fmtDur(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

// Friendly compact day, e.g. "Mon 6 Jul"
export function fmtNiceDay(iso: string): string {
  if (!iso) return 'Pick a day';
  const d = new Date(iso + 'T00:00:00');
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mo = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${wd} ${d.getDate()} ${mo}`;
}

export function fmtMonthYear(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

export function monthShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short' });
}

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

export function endTime(hhmm: string, durationMin: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor((total % 1440) / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function relativeLabel(iso: string): string {
  const t = todayISO();
  if (iso === t) return 'Today';
  if (iso === addDays(t, 1)) return 'Tomorrow';
  if (iso === addDays(t, -1)) return 'Yesterday';
  return '';
}
