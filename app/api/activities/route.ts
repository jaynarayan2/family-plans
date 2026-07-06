import { NextRequest, NextResponse } from 'next/server';
import { findActivities } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { when, maxKm } = await req.json();
    const result = await findActivities(String(when || 'this weekend'), Number(maxKm) || 5);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
