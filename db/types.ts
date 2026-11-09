export type Estatus = 'activo' | 'inactivo';

export interface Producto {
  id: number;
  nombre: string;
  recordar: number;
  intervalo_dias: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  estatus: Estatus;
}

export interface Compra {
  id: number;
  idProducto: number;
  recordar: number;
  producto_nombre?: string;
  producto_intervalo?: number;
  producto_recordar?: number;
  /** Fecha local en formato YYYY-MM-DD. */
  fecha_compra: string;
  costo: number;
  fecha_creacion: string;
  estatus: Estatus;
}

export interface Paginacion {
  limit: number;
  offset: number;
}

export interface ProductoInput {
  nombre: string;
  intervalo_dias: number;
  recordar: number;
}

export interface CompraInput {
  idProducto: number;
  /** YYYY-MM-DD */
  fecha_compra: string;
  costo: number;
  recordar: number;
}

export interface FiltroProductos {
  nombre?: string;
  incluirInactivos?: boolean;
}

export interface FiltroCompras {
  idProducto?: number | null;
  /** YYYY-MM-DD inclusive */
  desde?: string | null;
  /** YYYY-MM-DD inclusive */
  hasta?: string | null;
  incluirInactivos?: boolean;
}

/** Acceso a datos. En nativo lo implementa SQLite; en web, la API FastAPI. */
export interface Repo {
  listProductos(f: FiltroProductos, pag?: Paginacion): Promise<Producto[]>;
  listProductosActivos(): Promise<Producto[]>;
  getProducto(id: number): Promise<Producto | null>;
  createProducto(p: ProductoInput): Promise<number>;
  updateProducto(id: number, p: ProductoInput): Promise<void>;
  setEstatusProducto(id: number, estatus: Estatus): Promise<void>;

  listCompras(f: FiltroCompras, pag?: Paginacion): Promise<Compra[]>;
  createCompra(c: CompraInput): Promise<number>;
  updateCompra(id: number, c: CompraInput): Promise<void>;
  setEstatusCompra(id: number, estatus: Estatus): Promise<void>;
}

export class ErrorValidacion extends Error {}
