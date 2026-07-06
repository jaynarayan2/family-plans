import { NextRequest, NextResponse } from 'next/server';
import { loadState, saveState } from '@/lib/db';
import { reduce, Action } from '@/lib/reducer';

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
    const next = reduce(prev, action);
    await saveState(next);
    return next;
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
