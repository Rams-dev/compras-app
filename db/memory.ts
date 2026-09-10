import type { Compra, Producto } from './types';

const nowISO = () => new Date().toISOString();

export const memoryMarker = { __memory: true } as const;
export const isMemoryDB = (db: any) => !!db?.__memory;

export interface Paginacion {
  limit: number;
  offset: number;
}

const paginar = <T>(arr: T[], pag?: Paginacion): T[] =>
  pag ? arr.slice(pag.offset, pag.offset + pag.limit) : arr;

let productos: Producto[] = [
  {
    id: 1,
    nombre: 'Ejemplo: Aceite motor',
    recordar: 1,
    intervalo_dias: 90,
    fecha_creacion: nowISO(),
    fecha_actualizacion: nowISO(),
    estatus: 'activo',
  },
];
let compras: Compra[] = [];
let nextProdId = 2;
let nextCompraId = 1;

export const memListProductos = async (filtroNombre = '', incluirInactivos = false, pag?: Paginacion): Promise<Producto[]> => {
  const f = filtroNombre.trim().toLowerCase();
  const res = productos
    .filter((p) => (incluirInactivos ? true : p.estatus === 'activo'))
    .filter((p) => (f ? p.nombre.toLowerCase().includes(f) : true))
    .sort((a, b) => (a.fecha_creacion < b.fecha_creacion ? 1 : -1));
  return paginar(res, pag);
};

export const memListActivos = async (): Promise<Producto[]> =>
  productos.filter((p) => p.estatus === 'activo').sort((a, b) => a.nombre.localeCompare(b.nombre));

export const memCreateProducto = async (nombre: string, intervalo_dias: number, recordar = 1) => {
  const now = nowISO();
  const p: Producto = { id: nextProdId++, nombre: nombre.trim(), recordar, intervalo_dias, fecha_creacion: now, fecha_actualizacion: now, estatus: 'activo' };
  productos.push(p);
  return p.id;
};

export const memUpdateProducto = async (id: number, nombre: string, intervalo_dias: number, recordar = 1) => {
  const p = productos.find((x) => x.id === id);
  if (p) {
    p.nombre = nombre.trim();
    p.recordar = recordar;
    p.intervalo_dias = intervalo_dias;
    p.fecha_actualizacion = nowISO();
  }
};

export const memSetEstatusProducto = async (id: number, estatus: 'activo' | 'inactivo') => {
  const p = productos.find((x) => x.id === id);
  if (p) {
    p.estatus = estatus;
    p.fecha_actualizacion = nowISO();
  }
};

export interface MemFiltroCompras {
  idProducto?: number | null;
  desde?: string | null;
  hasta?: string | null;
  incluirInactivos?: boolean;
}

export const memListCompras = async (f: MemFiltroCompras = {}, pag?: Paginacion): Promise<Compra[]> => {
  const res = compras
    .filter((c) => (f.incluirInactivos ? true : c.estatus === 'activo'))
    .filter((c) => (f.idProducto ? c.idProducto === f.idProducto : true))
    .filter((c) => (f.desde ? c.fecha_compra >= f.desde! : true))
    .filter((c) => (f.hasta ? c.fecha_compra <= f.hasta! : true))
    .map((c) => {
      const p = productos.find((x) => x.id === c.idProducto);
      return { ...c, producto_nombre: p?.nombre ?? `#${c.idProducto}`, producto_intervalo: p?.intervalo_dias ?? 30, producto_recordar: p?.recordar ?? 0 };
    })
    .sort((a, b) => (a.fecha_compra < b.fecha_compra ? 1 : -1));
  return paginar(res, pag);
};

export const memCreateCompra = async (idProducto: number, fecha_compra: string, costo: number, recordar = 1) => {
  const c: Compra = { id: nextCompraId++, idProducto, recordar, fecha_compra, costo, fecha_creacion: nowISO(), estatus: 'activo' };
  compras.push(c);
  return c.id;
};

export const memUpdateCompra = async (id: number, idProducto: number, fecha_compra: string, costo: number, recordar = 1) => {
  const c = compras.find((x) => x.id === id);
  if (c) {
    c.idProducto = idProducto;
    c.recordar = recordar;
    c.fecha_compra = fecha_compra;
    c.costo = costo;
  }
};

export const memSetEstatusCompra = async (id: number, estatus: 'activo' | 'inactivo') => {
  const c = compras.find((x) => x.id === id);
  if (c) c.estatus = estatus;
};
