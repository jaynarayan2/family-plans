import { Pool } from 'pg';
import { AppState, emptyState } from './types';
import { seedState } from './seed';

// Shared state is stored as a single JSONB row keyed by household id.
const HOUSEHOLD = 'family';
const AUTH_ROW = 'auth';
const HISTORY_ROW = 'history';

export interface AuthData {
  pins: Record<string, string>; // user -> "salt:hash"
}

let pool: Pool | null = null;
let memory: AppState | null = null;
let memoryAuth: AuthData | null = null;
let memoryHistory: AppState[] | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? undefined
        : { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
}

let ensured = false;
async function ensureTable(p: Pool) {
  if (ensured) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  ensured = true;
}

export async function loadState(): Promise<AppState> {
  const p = getPool();
  if (!p) {
    if (!memory) memory = seedState();
    return memory;
  }
  await ensureTable(p);
  const res = await p.query('SELECT data FROM app_state WHERE id = $1', [HOUSEHOLD]);
  if (res.rows.length === 0) {
    const initial = seedState();
    await p.query(
      'INSERT INTO app_state (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [HOUSEHOLD, initial]
    );
    return initial;
  }
  return res.rows[0].data as AppState;
}

export async function saveState(state: AppState): Promise<void> {
  const p = getPool();
  if (!p) {
    memory = state;
    return;
  }
  await ensureTable(p);
  await p.query(
    `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [HOUSEHOLD, state]
  );
}

export async function loadHistory(): Promise<AppState[]> {
  const p = getPool();
  if (!p) {
    if (!memoryHistory) memoryHistory = [];
    return memoryHistory;
  }
  await ensureTable(p);
  const res = await p.query('SELECT data FROM app_state WHERE id = $1', [HISTORY_ROW]);
  if (res.rows.length === 0) return [];
  return (res.rows[0].data as AppState[]) ?? [];
}

export async function saveHistory(history: AppState[]): Promise<void> {
  const p = getPool();
  if (!p) {
    memoryHistory = history;
    return;
  }
  await ensureTable(p);
  await p.query(
    `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [HISTORY_ROW, JSON.stringify(history)]
  );
}

export async function loadAuth(): Promise<AuthData> {
  const p = getPool();
  if (!p) {
    if (!memoryAuth) memoryAuth = { pins: {} };
    return memoryAuth;
  }
  await ensureTable(p);
  const res = await p.query('SELECT data FROM app_state WHERE id = $1', [AUTH_ROW]);
  if (res.rows.length === 0) return { pins: {} };
  return res.rows[0].data as AuthData;
}

export async function saveAuth(auth: AuthData): Promise<void> {
  const p = getPool();
  if (!p) {
    memoryAuth = auth;
    return;
  }
  await ensureTable(p);
  await p.query(
    `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [AUTH_ROW, auth]
  );
}

export { emptyState };
