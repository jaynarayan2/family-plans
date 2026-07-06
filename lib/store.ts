'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, emptyState, UserName } from './types';
import { Action } from './reducer';

const USER_KEY = 'family_current_user';

export function getStoredUser(): UserName | null {
  if (typeof window === 'undefined') return null;
  const u = window.localStorage.getItem(USER_KEY);
  return (u as UserName) || null;
}

export function setStoredUser(u: UserName) {
  window.localStorage.setItem(USER_KEY, u);
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_KEY);
}

export function useStore(authed: boolean, onUnauthorized?: () => void) {
  const [state, setState] = useState<AppState>(emptyState());
  const [loaded, setLoaded] = useState(false);
  const versionRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!authed) return;
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) return;
      const data: AppState = await res.json();
      // Only apply if newer (avoid clobbering an in-flight optimistic update).
      if ((data.version ?? 0) >= versionRef.current) {
        versionRef.current = data.version ?? 0;
        setState(data);
      }
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [authed, onUnauthorized]);

  const dispatch = useCallback(async (action: Action) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!res.ok) return;
      const next: AppState = await res.json();
      versionRef.current = next.version ?? 0;
      setState(next);
    } catch {
      // network hiccup — next poll will reconcile
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (!authed) return;
    refresh();
    const iv = setInterval(refresh, 4000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh, authed]);

  return { state, loaded, dispatch, refresh };
}
