import type { SQLiteDatabase } from 'expo-sqlite';
import { nowISO } from './schema';
import { isMemoryDB, memCreateCompra, memListCompras, memSetEstatusCompra, memUpdateCompra } from './memory';
import type { Compra } from './types';

export interface FiltroCompras {
  idProducto?: number | null;
  desde?: string | null;
  hasta?: string | null;
  incluirInactivos?: boolean;
}

export interface Paginacion {
  limit: number;
  offset: number;
}

export async function listCompras(db: SQLiteDatabase, f: FiltroCompras = {}, pag?: Paginacion): Promise<Compra[]> {
  if (isMemoryDB(db)) return memListCompras(f, pag);
  const where: string[] = [];
  const params: any[] = [];
  if (!f.incluirInactivos) where.push(`c.estatus = 'activo'`);
  if (f.idProducto) {
    where.push(`c.idProducto = ?`);
    params.push(f.idProducto);
  }
  if (f.desde) {
    where.push(`c.fecha_compra >= ?`);
    params.push(f.desde);
  }
  if (f.hasta) {
    where.push(`c.fecha_compra <= ?`);
    params.push(f.hasta);
  }
  const sql = `
    SELECT c.*, p.nombre AS producto_nombre, p.intervalo_dias AS producto_intervalo, p.recordar AS producto_recordar
    FROM compras c JOIN productos p ON p.id = c.idProducto
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.fecha_compra DESC${pag ? ` LIMIT ? OFFSET ?` : ''}`;
  if (pag) params.push(pag.limit, pag.offset);
  return db.getAllAsync<Compra>(sql, params);
}

export async function createCompra(db: SQLiteDatabase, idProducto: number, fecha_compra: string, costo: number, recordar = 1) {
  if (isMemoryDB(db)) return memCreateCompra(idProducto, fecha_compra, costo, recordar);
  const r = await db.runAsync(
    `INSERT INTO compras (idProducto, recordar, fecha_compra, costo, fecha_creacion, estatus) VALUES (?, ?, ?, ?, ?, 'activo')`,
    [idProducto, recordar, fecha_compra, costo, nowISO()]
  );
  return r.lastInsertRowId;
}

export async function updateCompra(db: SQLiteDatabase, id: number, idProducto: number, fecha_compra: string, costo: number, recordar = 1) {
  if (isMemoryDB(db)) return memUpdateCompra(id, idProducto, fecha_compra, costo, recordar);
  await db.runAsync(`UPDATE compras SET idProducto = ?, recordar = ?, fecha_compra = ?, costo = ? WHERE id = ?`, [
    idProducto,
    recordar,
    fecha_compra,
    costo,
    id,
  ]);
}

export async function softDeleteCompra(db: SQLiteDatabase, id: number) {
  if (isMemoryDB(db)) return memSetEstatusCompra(id, 'inactivo');
  await db.runAsync(`UPDATE compras SET estatus = 'inactivo' WHERE id = ?`, [id]);
}

export async function reactivarCompra(db: SQLiteDatabase, id: number) {
  if (isMemoryDB(db)) return memSetEstatusCompra(id, 'activo');
  await db.runAsync(`UPDATE compras SET estatus = 'activo' WHERE id = ?`, [id]);
}
