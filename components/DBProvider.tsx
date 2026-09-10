import type { ReactNode } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '@/db/schema';

export function DBProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName="compras.db" onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}
