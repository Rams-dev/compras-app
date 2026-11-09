import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 4;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // foreign_keys es por conexión: se activa en cada arranque, no solo al migrar.
  // journal_mode no puede cambiarse dentro de una transacción.
  await db.execAsync(`PRAGMA journal_mode = 'wal'; PRAGMA foreign_keys = ON;`);

  const res = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = res?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return;

  await db.withTransactionAsync(async () => {
    if (current === 0) {
      // Instalación nueva: se crea directamente el esquema más reciente.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          nombre TEXT NOT NULL,
          recordar INTEGER NOT NULL DEFAULT 1,
          intervalo_dias INTEGER NOT NULL DEFAULT 30,
          fecha_creacion TEXT NOT NULL,
          fecha_actualizacion TEXT NOT NULL,
          estatus TEXT NOT NULL DEFAULT 'activo'
        );
        CREATE INDEX IF NOT EXISTS idx_productos_fecha ON productos(fecha_creacion DESC);
        CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

        CREATE TABLE IF NOT EXISTS compras (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          idProducto INTEGER NOT NULL REFERENCES productos(id),
          recordar INTEGER NOT NULL DEFAULT 1,
          fecha_compra TEXT NOT NULL,
          costo REAL NOT NULL,
          fecha_creacion TEXT NOT NULL,
          estatus TEXT NOT NULL DEFAULT 'activo'
        );
        CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha_compra DESC);
        CREATE INDEX IF NOT EXISTS idx_compras_producto ON compras(idProducto);
      `);
      current = DATABASE_VERSION;
    }
    if (current < 2) {
      await db.execAsync(`ALTER TABLE productos ADD COLUMN recordar INTEGER NOT NULL DEFAULT 1;`);
    }
    if (current < 3) {
      await db.execAsync(`ALTER TABLE compras ADD COLUMN recordar INTEGER NOT NULL DEFAULT 1;`);
    }
    if (current < 4) {
      // fecha_compra se guardaba como timestamp UTC (toISOString). Se pasa a fecha local YYYY-MM-DD.
      await db.execAsync(`
        UPDATE compras SET fecha_compra = date(fecha_compra, 'localtime') WHERE length(fecha_compra) > 10;
        UPDATE compras SET costo = round(costo, 2);
      `);
    }
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}

export const nowISO = () => new Date().toISOString();
