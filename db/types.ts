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
  fecha_compra: string;
  costo: number;
  fecha_creacion: string;
  estatus: Estatus;
}
