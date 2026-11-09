import { apiRepo } from './apiRepo';
import type { Repo } from './types';

/** Web: los datos viven en la API FastAPI (api/main.py). */
export function useRepo(): Repo {
  return apiRepo;
}
