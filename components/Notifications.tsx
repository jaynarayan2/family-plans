'use client';

import { AppState, UserName } from '@/lib/types';
import { Action } from '@/lib/reducer';
import { Sheet } from './ui';

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function unreadCount(state: AppState, me: UserName): number {
  return state.notifications.filter((n) => !n.readBy.includes(me)).length;
}

export function Notifications({
  open,
  onClose,
  state,
  me,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  me: UserName;
  dispatch: (a: Action) => void;
}) {
  function close() {
    dispatch({ type: 'markRead', user: me });
    onClose();
  }
  return (
    <Sheet open={open} onClose={close} title="Notifications">
      {state.notifications.length === 0 ? (
        <div className="text-center text-slate-400 py-10 text-[14px]">
          Nothing yet. Confirmations and new plans show up here 🔔
        </div>
      ) : (
        <div className="space-y-2">
          {state.notifications.map((n) => {
            const unread = !n.readBy.includes(me);
            return (
              <div
                key={n.id}
                className={`rounded-xl p-3 text-[14px] ${
                  unread ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'
                }`}
              >
                <div className="text-slate-700">{n.text}</div>
                <div className="text-[11px] text-slate-400 mt-1">{ago(n.ts)}</div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
