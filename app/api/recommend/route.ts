import { NextRequest, NextResponse } from 'next/server';
import { recommendRestaurants } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { cuisine, maxKm } = await req.json();
    const result = await recommendRestaurants(
      String(cuisine || 'dinner'),
      Number(maxKm) || 5
    );
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
