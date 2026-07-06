import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

// Protect the data API so a random link visitor can't read or change anything.
// The auth route (/api/auth) is intentionally NOT matched.
export const config = {
  matcher: ['/api/state', '/api/action', '/api/recommend', '/api/activities'],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySession(token);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}
