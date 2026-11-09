import { esFechaYMD } from '@/utils/format';
import { ErrorValidacion, type CompraInput, type ProductoInput } from './types';

/** Normaliza y valida un producto. Mismas reglas que la API (api/main.py). */
export function validarProducto(p: ProductoInput): ProductoInput {
  const nombre = p.nombre.trim();
  if (!nombre) throw new ErrorValidacion('Falta el nombre del producto.');
  if (!Number.isInteger(p.intervalo_dias) || p.intervalo_dias < 1) {
    throw new ErrorValidacion('El intervalo debe ser un número entero de días mayor a 0.');
  }
  return { nombre, intervalo_dias: p.intervalo_dias, recordar: p.recordar ? 1 : 0 };
}

/** Normaliza y valida una compra. Mismas reglas que la API (api/main.py). */
export function validarCompra(c: CompraInput): CompraInput {
  if (!Number.isInteger(c.idProducto) || c.idProducto < 1) throw new ErrorValidacion('Elige un producto.');
  if (!esFechaYMD(c.fecha_compra)) throw new ErrorValidacion('Fecha de compra inválida.');
  if (!Number.isFinite(c.costo) || c.costo < 0) throw new ErrorValidacion('Costo inválido.');
  return {
    idProducto: c.idProducto,
    fecha_compra: c.fecha_compra,
    costo: Math.round(c.costo * 100) / 100,
    recordar: c.recordar ? 1 : 0,
  };
}
