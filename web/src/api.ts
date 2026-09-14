const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api'
const API_TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}), ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => res.statusText)}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, b?: unknown) => req<T>(p, { method: 'POST', body: b ? JSON.stringify(b) : undefined }),
  put: <T>(p: string, b?: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(b) }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
}
export type Producto = { id: number; nombre: string; recordar: number; intervalo_dias: number; fecha_creacion: string; fecha_actualizacion: string; estatus: string }
export type Compra = { id: number; idProducto: number; recordar: number; fecha_compra: string; costo: number; fecha_creacion: string; estatus: string; producto_nombre?: string; producto_intervalo?: number }
