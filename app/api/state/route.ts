import { NextResponse } from 'next/server';
import { loadState, loadHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [state, history] = await Promise.all([loadState(), loadHistory()]);
    return NextResponse.json({ ...state, canUndo: history.length > 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'load failed' }, { status: 500 });
  }
}
