import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { createSqliteRepo } from './sqliteRepo';
import type { Repo } from './types';

/** Nativo (Android/iOS): datos locales en SQLite. En web se usa useRepo.web.ts. */
export function useRepo(): Repo {
  const db = useSQLiteContext();
  return useMemo(() => createSqliteRepo(db), [db]);
}
