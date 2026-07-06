import { AppState } from './types';

// Start empty — the family adds their own plans. (Previously seeded with sample
// events; cleared per request so nothing example-like appears.)
export function seedState(): AppState {
  return { events: [], backlog: [], notifications: [], version: 1 };
}
