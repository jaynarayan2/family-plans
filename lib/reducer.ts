import {
  AppState,
  CalEvent,
  BacklogItem,
  UserName,
  Vote,
  emptyState,
} from './types';

// A compact id generator (no external deps). Server-side only usage is fine.
let counter = 0;
export function genId(prefix = 'id'): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export type Action =
  | { type: 'addEvent'; event: Omit<CalEvent, 'id' | 'createdAt'> }
  | { type: 'updateEvent'; id: string; patch: Partial<CalEvent>; by: UserName }
  | { type: 'deleteEvent'; id: string }
  | { type: 'moveEvent'; id: string; day: string; start: string }
  | { type: 'vote'; id: string; user: UserName; value: Vote }
  | { type: 'setStatus'; id: string; status: 'pending' | 'confirmed'; by: UserName }
  | { type: 'addBacklog'; item: Omit<BacklogItem, 'id' | 'createdAt'> }
  | { type: 'updateBacklog'; id: string; patch: Partial<BacklogItem> }
  | { type: 'deleteBacklog'; id: string }
  | { type: 'scheduleBacklog'; id: string; day: string; start: string }
  | { type: 'markRead'; user: UserName }
  | { type: 'clearAll'; by: UserName }
  // Handled in the action route (restores a snapshot); never reaches reduce().
  | { type: 'undo' };

function notify(state: AppState, text: string) {
  state.notifications.unshift({
    id: genId('n'),
    text,
    ts: Date.now(),
    readBy: [],
  });
  // keep last 50
  state.notifications = state.notifications.slice(0, 50);
}

export function reduce(prev: AppState, action: Action): AppState {
  // work on a deep-ish copy
  const state: AppState = {
    events: prev.events.map((e) => ({ ...e, votes: { ...e.votes } })),
    backlog: prev.backlog.map((b) => ({ ...b })),
    notifications: prev.notifications.map((n) => ({ ...n, readBy: [...n.readBy] })),
    version: (prev.version || 0) + 1,
  };

  switch (action.type) {
    case 'addEvent': {
      const ev: CalEvent = { ...action.event, id: genId('e'), createdAt: Date.now() };
      state.events.push(ev);
      if (ev.status === 'pending') {
        notify(state, `${ev.createdBy} proposed “${ev.title}” — cast your vote`);
      }
      break;
    }
    case 'updateEvent': {
      const ev = state.events.find((e) => e.id === action.id);
      if (!ev) break;
      if (ev.fixed) {
        // A fixed event can only be unlocked; nothing else may change.
        if (typeof action.patch.fixed === 'boolean') ev.fixed = action.patch.fixed;
      } else {
        Object.assign(ev, action.patch);
      }
      break;
    }
    case 'deleteEvent': {
      const ev = state.events.find((e) => e.id === action.id);
      if (ev && ev.fixed) break; // fixed events cannot be deleted
      state.events = state.events.filter((e) => e.id !== action.id);
      break;
    }
    case 'moveEvent': {
      const ev = state.events.find((e) => e.id === action.id);
      if (ev && !ev.fixed) {
        ev.day = action.day;
        ev.start = action.start;
      }
      break;
    }
    case 'vote': {
      const ev = state.events.find((e) => e.id === action.id);
      if (ev) {
        if (ev.votes[action.user] === action.value) {
          delete ev.votes[action.user]; // toggle off
        } else {
          ev.votes[action.user] = action.value;
        }
      }
      break;
    }
    case 'setStatus': {
      const ev = state.events.find((e) => e.id === action.id);
      if (ev && ev.status !== action.status) {
        ev.status = action.status;
        if (action.status === 'confirmed') {
          notify(
            state,
            `✅ “${ev.title}” is CONFIRMED for ${fmtDay(ev.day)} at ${ev.start} (by ${action.by})`
          );
        } else {
          notify(state, `↩️ “${ev.title}” moved back to pending by ${action.by}`);
        }
      }
      break;
    }
    case 'addBacklog': {
      state.backlog.push({ ...action.item, id: genId('b'), createdAt: Date.now() });
      break;
    }
    case 'updateBacklog': {
      const item = state.backlog.find((b) => b.id === action.id);
      if (item) Object.assign(item, action.patch);
      break;
    }
    case 'deleteBacklog': {
      state.backlog = state.backlog.filter((b) => b.id !== action.id);
      break;
    }
    case 'scheduleBacklog': {
      const item = state.backlog.find((b) => b.id === action.id);
      if (item) {
        const ev: CalEvent = {
          id: genId('e'),
          title: item.title,
          category: item.category,
          owner: item.owner,
          participants: item.participants,
          day: action.day,
          start: action.start,
          durationMin: item.durationMin,
          fixed: false,
          status: 'pending',
          votes: {},
          notes: item.notes,
          createdBy: item.createdBy,
          createdAt: Date.now(),
        };
        state.events.push(ev);
        state.backlog = state.backlog.filter((b) => b.id !== action.id);
        notify(state, `${item.createdBy} scheduled “${item.title}” for ${fmtDay(action.day)}`);
      }
      break;
    }
    case 'markRead': {
      state.notifications.forEach((n) => {
        if (!n.readBy.includes(action.user)) n.readBy.push(action.user);
      });
      break;
    }
    case 'clearAll': {
      state.events = [];
      state.backlog = [];
      state.notifications = [];
      break;
    }
  }
  return state;
}

function fmtDay(day: string): string {
  try {
    const d = new Date(day + 'T00:00:00');
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return day;
  }
}

export { emptyState };
