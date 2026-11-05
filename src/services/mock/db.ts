import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildSeed, type Db } from './seed';

const DB_KEY = 'hously_mock_db_v1';

let cache: Db | null = null;
let loading: Promise<Db> | null = null;

/** Loads the mock database from AsyncStorage (seeding it on first launch). */
export function loadDb(): Promise<Db> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(DB_KEY);
        if (raw) cache = JSON.parse(raw) as Db;
      } catch {
        cache = null;
      }
      if (!cache) {
        cache = buildSeed();
        await saveDb();
      }
      return cache;
    })();
  }
  return loading;
}

export async function saveDb(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    // Storage full / unavailable: the in-memory copy still works for this session.
  }
}

/** Wipes all mock data and re-seeds it (handy while testing). */
export async function resetMockDb(): Promise<void> {
  cache = buildSeed();
  loading = null;
  await saveDb();
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
