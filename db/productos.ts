import type { SQLiteDatabase } from 'expo-sqlite';
import { nowISO } from './schema';
import { isMemoryDB, memCreateProducto, memListActivos, memListProductos, memSetEstatusProducto, memUpdateProducto } from './memory';
import type { Producto } from './types';

export interface Paginacion {
  limit: number;
  offset: number;
}

export async function listProductos(db: SQLiteDatabase, filtroNombre = '', incluirInactivos = false, pag?: Paginacion): Promise<Producto[]> {
  if (isMemoryDB(db)) return memListProductos(filtroNombre, incluirInactivos, pag);
  const where: string[] = [];
  const params: any[] = [];
  if (!incluirInactivos) where.push(`estatus = 'activo'`);
  if (filtroNombre.trim()) {
    where.push(`nombre LIKE ?`);
    params.push(`%${filtroNombre.trim()}%`);
  }
  let sql = `SELECT * FROM productos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY fecha_creacion DESC`;
  if (pag) {
    sql += ` LIMIT ? OFFSET ?`;
    params.push(pag.limit, pag.offset);
  }
  return db.getAllAsync<Producto>(sql, params);
}

export async function createProducto(db: SQLiteDatabase, nombre: string, intervalo_dias: number, recordar = 1) {
  if (isMemoryDB(db)) return memCreateProducto(nombre, intervalo_dias, recordar);
  const now = nowISO();
  const r = await db.runAsync(
    `INSERT INTO productos (nombre, recordar, intervalo_dias, fecha_creacion, fecha_actualizacion, estatus) VALUES (?, ?, ?, ?, ?, 'activo')`,
    [nombre.trim(), recordar, intervalo_dias, now, now]
  );
  return r.lastInsertRowId;
}

export async function updateProducto(db: SQLiteDatabase, id: number, nombre: string, intervalo_dias: number, recordar = 1) {
  if (isMemoryDB(db)) return memUpdateProducto(id, nombre, intervalo_dias, recordar);
  await db.runAsync(`UPDATE productos SET nombre = ?, recordar = ?, intervalo_dias = ?, fecha_actualizacion = ? WHERE id = ?`, [
    nombre.trim(),
    recordar,
    intervalo_dias,
    nowISO(),
    id,
  ]);
}

export async function softDeleteProducto(db: SQLiteDatabase, id: number) {
  if (isMemoryDB(db)) return memSetEstatusProducto(id, 'inactivo');
  await db.runAsync(`UPDATE productos SET estatus = 'inactivo', fecha_actualizacion = ? WHERE id = ?`, [nowISO(), id]);
}

export async function reactivarProducto(db: SQLiteDatabase, id: number) {
  if (isMemoryDB(db)) return memSetEstatusProducto(id, 'activo');
  await db.runAsync(`UPDATE productos SET estatus = 'activo', fecha_actualizacion = ? WHERE id = ?`, [nowISO(), id]);
}

export async function listProductosActivos(db: SQLiteDatabase): Promise<Producto[]> {
  if (isMemoryDB(db)) return memListActivos();
  return db.getAllAsync<Producto>(`SELECT * FROM productos WHERE estatus = 'activo' ORDER BY nombre ASC`);
}
