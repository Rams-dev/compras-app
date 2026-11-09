import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paginacion } from '@/db/types';

export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Lista paginada con scroll infinito.
 * - Descarta respuestas viejas (si el filtro cambia mientras una consulta sigue en curso).
 * - Evita cargas duplicadas de la página siguiente.
 * `fetchPage` debe estar memorizado (useCallback) con los filtros como dependencias.
 */
export function usePaginatedList<T>(fetchPage: (pag: Paginacion) => Promise<T[]>, pageSize = 30) {
  const [items, setItems] = useState<T[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);
  const offset = useRef(0);
  const ocupadoMas = useRef(false);
  const hayMasRef = useRef(true);
  const recargando = useRef(false);

  const recargar = useCallback(async () => {
    const id = ++reqId.current;
    recargando.current = true;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchPage({ limit: pageSize, offset: 0 });
      if (id !== reqId.current) return;
      setItems(r);
      offset.current = r.length;
      hayMasRef.current = r.length === pageSize;
      setHayMas(hayMasRef.current);
    } catch (e) {
      if (id === reqId.current) setError(mensajeError(e));
    } finally {
      if (id === reqId.current) {
        recargando.current = false;
        setCargando(false);
      }
    }
  }, [fetchPage, pageSize]);

  const cargarMas = useCallback(async () => {
    if (ocupadoMas.current || recargando.current || !hayMasRef.current) return;
    ocupadoMas.current = true;
    setCargandoMas(true);
    const id = reqId.current;
    try {
      const r = await fetchPage({ limit: pageSize, offset: offset.current });
      if (id !== reqId.current) return;
      setItems((prev) => [...prev, ...r]);
      offset.current += r.length;
      if (r.length < pageSize) {
        hayMasRef.current = false;
        setHayMas(false);
      }
    } catch (e) {
      if (id === reqId.current) setError(mensajeError(e));
    } finally {
      ocupadoMas.current = false;
      setCargandoMas(false);
    }
  }, [fetchPage, pageSize]);

  return { items, cargando, cargandoMas, hayMas, error, recargar, cargarMas };
}

/** Devuelve `value` después de `ms` sin cambios (para no consultar en cada tecla). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
