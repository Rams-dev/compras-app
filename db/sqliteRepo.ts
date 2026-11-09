import type { SQLiteDatabase } from 'expo-sqlite';
import { nowISO } from './schema';
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

export function createSqliteRepo(db: SQLiteDatabase): Repo {
  const nombreDuplicado = async (nombre: string, exceptoId: number | null) => {
    const r = await db.getFirstAsync<{ id: number; estatus: Estatus }>(
      `SELECT id, estatus FROM productos WHERE lower(trim(nombre)) = lower(?) AND id != ? LIMIT 1`,
      [nombre, exceptoId ?? -1]
    );
    if (r) {
      throw new ErrorValidacion(
        r.estatus === 'inactivo'
          ? 'Ya existe un producto inactivo con ese nombre. Reactívalo en lugar de crear otro.'
          : 'Ya existe un producto con ese nombre.'
      );
    }
  };

  const productoExistente = async (id: number) => {
    const p = await db.getFirstAsync<Producto>(`SELECT * FROM productos WHERE id = ?`, [id]);
    if (!p) throw new ErrorValidacion('El producto no existe.');
    return p;
  };

  return {
    async listProductos(f: FiltroProductos, pag?: Paginacion) {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (!f.incluirInactivos) where.push(`estatus = 'activo'`);
      const nombre = f.nombre?.trim();
      if (nombre) {
        where.push(`nombre LIKE ?`);
        params.push(`%${nombre}%`);
      }
      let sql = `SELECT * FROM productos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY fecha_creacion DESC, id DESC`;
      if (pag) {
        sql += ` LIMIT ? OFFSET ?`;
        params.push(pag.limit, pag.offset);
      }
      return db.getAllAsync<Producto>(sql, params);
    },

    listProductosActivos() {
      return db.getAllAsync<Producto>(`SELECT * FROM productos WHERE estatus = 'activo' ORDER BY nombre COLLATE NOCASE ASC`);
    },

    getProducto(id: number) {
      return db.getFirstAsync<Producto>(`SELECT * FROM productos WHERE id = ?`, [id]);
    },

    async createProducto(input: ProductoInput) {
      const p = validarProducto(input);
      await nombreDuplicado(p.nombre, null);
      const now = nowISO();
      const r = await db.runAsync(
        `INSERT INTO productos (nombre, recordar, intervalo_dias, fecha_creacion, fecha_actualizacion, estatus) VALUES (?, ?, ?, ?, ?, 'activo')`,
        [p.nombre, p.recordar, p.intervalo_dias, now, now]
      );
      return r.lastInsertRowId;
    },

    async updateProducto(id: number, input: ProductoInput) {
      const p = validarProducto(input);
      await nombreDuplicado(p.nombre, id);
      await db.runAsync(
        `UPDATE productos SET nombre = ?, recordar = ?, intervalo_dias = ?, fecha_actualizacion = ? WHERE id = ?`,
        [p.nombre, p.recordar, p.intervalo_dias, nowISO(), id]
      );
    },

    async setEstatusProducto(id: number, estatus: Estatus) {
      await db.runAsync(`UPDATE productos SET estatus = ?, fecha_actualizacion = ? WHERE id = ?`, [estatus, nowISO(), id]);
    },

    async listCompras(f: FiltroCompras, pag?: Paginacion) {
      const where: string[] = [];
      const params: (string | number)[] = [];
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
      let sql = `
        SELECT c.*, p.nombre AS producto_nombre, p.intervalo_dias AS producto_intervalo, p.recordar AS producto_recordar
        FROM compras c JOIN productos p ON p.id = c.idProducto
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY c.fecha_compra DESC, c.id DESC`;
      if (pag) {
        sql += ` LIMIT ? OFFSET ?`;
        params.push(pag.limit, pag.offset);
      }
      return db.getAllAsync<Compra>(sql, params);
    },

    async createCompra(input: CompraInput) {
      const c = validarCompra(input);
      const prod = await productoExistente(c.idProducto);
      if (prod.estatus !== 'activo') throw new ErrorValidacion('No se pueden registrar compras de un producto inactivo.');
      const r = await db.runAsync(
        `INSERT INTO compras (idProducto, recordar, fecha_compra, costo, fecha_creacion, estatus) VALUES (?, ?, ?, ?, ?, 'activo')`,
        [c.idProducto, c.recordar, c.fecha_compra, c.costo, nowISO()]
      );
      return r.lastInsertRowId;
    },

    async updateCompra(id: number, input: CompraInput) {
      const c = validarCompra(input);
      await productoExistente(c.idProducto);
      await db.runAsync(`UPDATE compras SET idProducto = ?, recordar = ?, fecha_compra = ?, costo = ? WHERE id = ?`, [
        c.idProducto,
        c.recordar,
        c.fecha_compra,
        c.costo,
        id,
      ]);
    },

    async setEstatusCompra(id: number, estatus: Estatus) {
      await db.runAsync(`UPDATE compras SET estatus = ? WHERE id = ?`, [estatus, id]);
    },
  };
}
