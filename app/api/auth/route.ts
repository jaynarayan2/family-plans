import { NextRequest, NextResponse } from 'next/server';
import { loadAuth, saveAuth } from '@/lib/db';
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  hashPin,
  verifyPin,
  validPinFormat,
  familyResetCode,
} from '@/lib/auth';
import { USERS } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Serialize writes to the auth row within an instance.
let chain: Promise<any> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
}

function isUser(u: any): boolean {
  return typeof u === 'string' && (USERS as string[]).includes(u);
}

function secure(req: NextRequest): boolean {
  return req.headers.get('x-forwarded-proto') === 'https';
}

function withCookie(req: NextRequest, body: any, token: string | null) {
  const res = NextResponse.json(body);
  if (token === null) {
    res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  } else {
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secure(req),
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });
  }
  return res;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const action = body?.action;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = await verifySession(token);

  try {
    switch (action) {
      case 'status': {
        const auth = await loadAuth();
        const user = body.user;
        return NextResponse.json({
          authedUser: sessionUser,
          hasPin: isUser(user) ? !!auth.pins[user] : undefined,
          anyAuthed: !!sessionUser,
          resetCodeEnabled: !!familyResetCode(),
        });
      }

      case 'setup': {
        const { user, pin } = body;
        if (!isUser(user)) return NextResponse.json({ error: 'bad user' }, { status: 400 });
        if (!validPinFormat(pin))
          return NextResponse.json({ error: 'PIN must be 4–6 digits' }, { status: 400 });
        const result = await serialize(async () => {
          const auth = await loadAuth();
          if (auth.pins[user]) return { error: 'PIN already set — please log in' };
          auth.pins[user] = await hashPin(pin);
          await saveAuth(auth);
          return { ok: true };
        });
        if ((result as any).error)
          return NextResponse.json(result, { status: 409 });
        return withCookie(req, { ok: true, user }, await signSession(user));
      }

      case 'login': {
        const { user, pin } = body;
        if (!isUser(user)) return NextResponse.json({ error: 'bad user' }, { status: 400 });
        const auth = await loadAuth();
        if (!auth.pins[user])
          return NextResponse.json({ error: 'No PIN set yet' }, { status: 404 });
        if (!(await verifyPin(pin, auth.pins[user])))
          return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
        return withCookie(req, { ok: true, user }, await signSession(user));
      }

      case 'change': {
        const { currentPin, newPin } = body;
        if (!sessionUser)
          return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        if (!validPinFormat(newPin))
          return NextResponse.json({ error: 'New PIN must be 4–6 digits' }, { status: 400 });
        const result = await serialize(async () => {
          const auth = await loadAuth();
          if (!(await verifyPin(currentPin, auth.pins[sessionUser])))
            return { error: 'Current PIN is incorrect' };
          auth.pins[sessionUser] = await hashPin(newPin);
          await saveAuth(auth);
          return { ok: true };
        });
        if ((result as any).error) return NextResponse.json(result, { status: 401 });
        return NextResponse.json({ ok: true });
      }

      case 'reset': {
        // Forgot PIN: reset using the family reset code, then sign in.
        const { user, code, newPin } = body;
        if (!isUser(user)) return NextResponse.json({ error: 'bad user' }, { status: 400 });
        const rc = familyResetCode();
        if (!rc)
          return NextResponse.json(
            { error: 'Family reset code is not configured. Ask a signed-in member to reset it for you.' },
            { status: 400 }
          );
        if (code !== rc)
          return NextResponse.json({ error: 'Wrong family reset code' }, { status: 401 });
        if (!validPinFormat(newPin))
          return NextResponse.json({ error: 'New PIN must be 4–6 digits' }, { status: 400 });
        await serialize(async () => {
          const auth = await loadAuth();
          auth.pins[user] = await hashPin(newPin);
          await saveAuth(auth);
        });
        return withCookie(req, { ok: true, user }, await signSession(user));
      }

      case 'clear': {
        // A signed-in member clears another member's PIN so they can set a new one.
        const { targetUser } = body;
        if (!sessionUser)
          return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        if (!isUser(targetUser))
          return NextResponse.json({ error: 'bad user' }, { status: 400 });
        await serialize(async () => {
          const auth = await loadAuth();
          delete auth.pins[targetUser];
          await saveAuth(auth);
        });
        return NextResponse.json({ ok: true });
      }

      case 'logout':
        return withCookie(req, { ok: true }, null);

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'auth failed' }, { status: 500 });
  }
}
