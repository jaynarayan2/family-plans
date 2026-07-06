import { AppState, CalEvent, UserName } from './types';
import { todayISO } from './dates';

// Does this event involve the given person?
export function involvesMe(ev: CalEvent, me: UserName): boolean {
  return ev.owner === me || ev.owner === 'shared' || ev.participants.includes(me);
}

// Pending plans that involve me and that I haven't voted on yet.
export function needsMyVote(state: AppState, me: UserName): CalEvent[] {
  return state.events
    .filter((e) => e.status === 'pending' && involvesMe(e, me) && !e.votes[me])
    .sort((a, b) => (a.day + a.start).localeCompare(b.day + b.start));
}

export function eventsInvolvingMe(state: AppState, me: UserName): CalEvent[] {
  return state.events.filter((e) => involvesMe(e, me));
}

export function todayCount(state: AppState, me: UserName): number {
  const t = todayISO();
  return state.events.filter((e) => e.day === t && involvesMe(e, me)).length;
}

// Next upcoming event that involves me (from now onward).
export function nextEvent(state: AppState, me: UserName, nowKey: string): CalEvent | null {
  const upcoming = state.events
    .filter((e) => involvesMe(e, me) && `${e.day}T${e.start}` >= nowKey)
    .sort((a, b) => `${a.day}T${a.start}`.localeCompare(`${b.day}T${b.start}`));
  return upcoming[0] ?? null;
}
