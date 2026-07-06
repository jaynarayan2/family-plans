'use client';

import { AppState, UserName } from '@/lib/types';
import { Action } from '@/lib/reducer';
import { CalEvent } from '@/lib/types';
import { needsMyVote } from '@/lib/selectors';
import { Sheet } from './ui';
import { EventCard } from './EventCard';

export function NeedsYou({
  open,
  onClose,
  state,
  me,
  dispatch,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  me: UserName;
  dispatch: (a: Action) => void;
  onEdit: (ev: CalEvent) => void;
}) {
  const items = needsMyVote(state, me);
  return (
    <Sheet open={open} onClose={onClose} title="Waiting on your vote">
      {items.length === 0 ? (
        <div className="text-center text-slate-400 py-10 text-[14px]">
          You’re all caught up — nothing needs your vote 🎉
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[13px] text-slate-400 mb-1">
            {items.length} pending plan{items.length > 1 ? 's' : ''} you haven’t voted on yet.
          </p>
          {items.map((e) => (
            <EventCard key={e.id} ev={e} me={me} dispatch={dispatch} onEdit={onEdit} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
