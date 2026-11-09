import { validarCompra, validarProducto } from './validacion';
import {
  ErrorValidacion,
  type Compra,
  type CompraInput,
  type Estatus,
  type FiltroCompras,
  type FiltroProductos,
  type Paginacion,
  type Producto,
  type ProductoInput,
  type Repo,
} from './types';

/** URL de la API FastAPI. Se configura con EXPO_PUBLIC_API_URL (ver README). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

type Query = Record<string, string | number | boolean | null | undefined>;

function qs(q: Query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== null && v !== undefined && v !== '') p.append(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`No se pudo conectar con la API (${API_URL}). ¿Está corriendo uvicorn?`);
  }
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

  let detalle = `Error ${res.status}`;
  try {
    const j = await res.json();
    if (typeof j?.detail === 'string') detalle = j.detail;
    else if (Array.isArray(j?.detail)) detalle = j.detail.map((d: any) => d?.msg ?? String(d)).join('\n');
  } catch {}
  // 4xx = error del usuario (validación, duplicado, no existe); 5xx = error del servidor.
  throw res.status < 500 ? new ErrorValidacion(detalle) : new Error(detalle);
}

const paginacion = (pag?: Paginacion) => (pag ? { limit: pag.limit, offset: pag.offset } : { limit: 200, offset: 0 });

export const apiRepo: Repo = {
  listProductos(f: FiltroProductos, pag?: Paginacion) {
    return request<Producto[]>('GET', `/productos${qs({ nombre: f.nombre?.trim(), incluir_inactivos: !!f.incluirInactivos, ...paginacion(pag) })}`);
  },
  listProductosActivos() {
    return request<Producto[]>('GET', '/productos/activos');
  },
  async getProducto(id: number) {
    try {
      return await request<Producto>('GET', `/productos/${id}`);
    } catch (e) {
      if (e instanceof ErrorValidacion) return null;
      throw e;
    }
  },
  async createProducto(p: ProductoInput) {
    const r = await request<{ id: number }>('POST', '/productos', validarProducto(p));
    return r.id;
  },
  async updateProducto(id: number, p: ProductoInput) {
    await request('PUT', `/productos/${id}`, validarProducto(p));
  },
  async setEstatusProducto(id: number, estatus: Estatus) {
    await request(estatus === 'activo' ? 'POST' : 'DELETE', estatus === 'activo' ? `/productos/${id}/reactivar` : `/productos/${id}`);
  },

  listCompras(f: FiltroCompras, pag?: Paginacion) {
    return request<Compra[]>(
      'GET',
      `/compras${qs({ idProducto: f.idProducto, desde: f.desde, hasta: f.hasta, incluir_inactivos: !!f.incluirInactivos, ...paginacion(pag) })}`
    );
  },
  async createCompra(c: CompraInput) {
    const r = await request<{ id: number }>('POST', '/compras', validarCompra(c));
    return r.id;
  },
  async updateCompra(id: number, c: CompraInput) {
    await request('PUT', `/compras/${id}`, validarCompra(c));
  },
  async setEstatusCompra(id: number, estatus: Estatus) {
    await request(estatus === 'activo' ? 'POST' : 'DELETE', estatus === 'activo' ? `/compras/${id}/reactivar` : `/compras/${id}`);
  },
};
