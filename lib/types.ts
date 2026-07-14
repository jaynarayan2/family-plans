export type UserName = 'Reena' | 'Mum' | 'Dad' | 'Jay';
export const USERS: UserName[] = ['Reena', 'Mum', 'Dad', 'Jay'];

export type Owner = 'shared' | UserName;

export type Category =
  | 'dinner'
  | 'shopping'
  | 'nap'
  | 'mall'
  | 'activity'
  | 'travel'
  | 'errand'
  | 'other';

export type EventStatus = 'pending' | 'confirmed';

export type Vote = 'yes' | 'no';

export interface CalEvent {
  id: string;
  title: string;
  category: Category;
  owner: Owner;
  participants: UserName[]; // who's involved (for shared events)
  day: string; // 'YYYY-MM-DD'
  start: string; // 'HH:MM' (24h)
  durationMin: number;
  fixed: boolean; // fixed events cannot be moved or changed
  status: EventStatus;
  votes: Partial<Record<UserName, Vote>>;
  location?: string;
  notes?: string;
  createdBy: UserName;
  createdAt: number;
}

export interface BacklogItem {
  id: string;
  title: string;
  category: Category;
  owner: Owner;
  participants: UserName[];
  durationMin: number;
  notes?: string;
  createdBy: UserName;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  text: string;
  ts: number;
  readBy: UserName[];
}

export interface AppState {
  events: CalEvent[];
  backlog: BacklogItem[];
  notifications: AppNotification[];
  version: number;
  // Set on API responses only (whether an undo snapshot exists); never persisted.
  canUndo?: boolean;
}

export function emptyState(): AppState {
  return { events: [], backlog: [], notifications: [], version: 0 };
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  dinner: { label: 'Dinner / Meal', emoji: '🍽️', color: '#ef476f' },
  shopping: { label: 'Shopping', emoji: '🛒', color: '#f78c6b' },
  nap: { label: 'Nap / Rest', emoji: '😴', color: '#8e9adb' },
  mall: { label: 'Mall / Outing', emoji: '🏬', color: '#06d6a0' },
  activity: { label: 'Activity', emoji: '🎟️', color: '#118ab2' },
  travel: { label: 'Travel / Trip', emoji: '✈️', color: '#3a86ff' },
  errand: { label: 'Errand', emoji: '✅', color: '#ffd166' },
  other: { label: 'Other', emoji: '📌', color: '#9d4edd' },
};

export const HOME_ADDRESS = '57 Spadina Ave, Toronto';
