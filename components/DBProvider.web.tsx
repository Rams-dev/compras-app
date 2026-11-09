import type { ReactNode } from 'react';

// En web no hay SQLite local: los datos van a la API (ver db/useRepo.web.ts).
export function DBProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
