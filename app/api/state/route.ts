import { NextResponse } from 'next/server';
import { loadState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'load failed' }, { status: 500 });
  }
}
