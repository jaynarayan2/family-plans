import { NextRequest, NextResponse } from 'next/server';
import { loadState, saveState, loadHistory, saveHistory } from '@/lib/db';
import { reduce, Action } from '@/lib/reducer';

const HISTORY_MAX = 20;

export const dynamic = 'force-dynamic';

// Serialize writes within a single instance to avoid read-modify-write races.
let chain: Promise<any> = Promise.resolve();

export async function POST(req: NextRequest) {
  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const run = chain.then(async () => {
    const prev = await loadState();

    if (action.type === 'undo') {
      const history = await loadHistory();
      const snapshot = history.pop();
      if (!snapshot) return { ...prev, canUndo: false };
      // Bump past the current version so polling clients accept the restore.
      snapshot.version = (prev.version || 0) + 1;
      await saveState(snapshot);
      await saveHistory(history);
      return { ...snapshot, canUndo: history.length > 0 };
    }

    const next = reduce(prev, action);
    await saveState(next);
    // markRead is chatty and not worth undoing; everything else is undoable.
    const history = await loadHistory();
    if (action.type !== 'markRead') {
      history.push(prev);
      await saveHistory(history.slice(-HISTORY_MAX));
    }
    return { ...next, canUndo: history.length > 0 };
  });
  // keep the chain alive even if this action throws
  chain = run.catch(() => {});

  try {
    const next = await run;
    return NextResponse.json(next);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'action failed' }, { status: 500 });
  }
}
