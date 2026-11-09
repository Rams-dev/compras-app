"""API Compras App — FastAPI + SQLite (mismo modelo que la app móvil).

La versión web de la app consume esta API (ver db/apiRepo.ts).
Reglas de validación espejo de db/validacion.ts.
"""
from collections.abc import Iterator
from contextlib import asynccontextmanager, contextmanager
from datetime import date, datetime, timezone
import os
from pathlib import Path
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

DB_PATH = Path(os.environ.get("COMPRAS_DB_PATH", Path(__file__).with_name("compras.db")))
# Orígenes permitidos separados por coma. Por defecto "*" (desarrollo).
CORS_ORIGINS = [o.strip() for o in os.environ.get("COMPRAS_CORS_ORIGINS", "*").split(",") if o.strip()]

DATABASE_VERSION = 4


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    """Abre una conexión, hace commit/rollback y SIEMPRE la cierra.

    (`with sqlite3.connect(...)` solo maneja la transacción, no cierra la conexión.)
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        current = conn.execute("PRAGMA user_version").fetchone()[0]
        if current >= DATABASE_VERSION:
            return
        conn.executescript(
            """
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
            """
        )
        if current < 4:
            # v4: fecha_compra pasa de timestamp UTC a fecha local YYYY-MM-DD.
            conn.execute(
                "UPDATE compras SET fecha_compra = date(fecha_compra, 'localtime') WHERE length(fecha_compra) > 10"
            )
            conn.execute("UPDATE compras SET costo = round(costo, 2)")
        conn.execute(f"PRAGMA user_version = {DATABASE_VERSION}")


# ---- Modelos ----

class ProductoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    recordar: Literal[0, 1] = 1
    intervalo_dias: int = Field(30, ge=1, le=3650)

    @field_validator("nombre")
    @classmethod
    def nombre_sin_espacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Falta el nombre del producto.")
        return v


class CompraIn(BaseModel):
    idProducto: int = Field(ge=1)
    recordar: Literal[0, 1] = 1
    fecha_compra: date | None = None  # YYYY-MM-DD; por defecto hoy
    costo: float = Field(ge=0)

    @field_validator("costo")
    @classmethod
    def dos_decimales(cls, v: float) -> float:
        return round(v, 2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Compras App API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


# ---- Helpers ----

def _producto_o_404(conn: sqlite3.Connection, pid: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM productos WHERE id = ?", (pid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Producto no encontrado")
    return row


def _validar_nombre_unico(conn: sqlite3.Connection, nombre: str, excepto_id: int | None = None) -> None:
    row = conn.execute(
        "SELECT estatus FROM productos WHERE lower(trim(nombre)) = lower(?) AND id != ? LIMIT 1",
        (nombre, excepto_id or -1),
    ).fetchone()
    if row is not None:
        msg = (
            "Ya existe un producto inactivo con ese nombre. Reactívalo en lugar de crear otro."
            if row["estatus"] == "inactivo"
            else "Ya existe un producto con ese nombre."
        )
        raise HTTPException(409, msg)


def _set_estatus(conn: sqlite3.Connection, tabla: str, rid: int, estatus: str, con_fecha: bool) -> None:
    if con_fecha:
        cur = conn.execute(
            f"UPDATE {tabla} SET estatus = ?, fecha_actualizacion = ? WHERE id = ?", (estatus, now_iso(), rid)
        )
    else:
        cur = conn.execute(f"UPDATE {tabla} SET estatus = ? WHERE id = ?", (estatus, rid))
    if cur.rowcount == 0:
        raise HTTPException(404, "Producto no encontrado" if tabla == "productos" else "Compra no encontrada")


# ---- Productos ----

@app.get("/productos")
def listar_productos(
    nombre: str = "",
    incluir_inactivos: bool = False,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[dict]:
    sql = "SELECT * FROM productos"
    where, params = [], []
    if not incluir_inactivos:
        where.append("estatus = 'activo'")
    if nombre.strip():
        where.append("nombre LIKE ?")
        params.append(f"%{nombre.strip()}%")
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY fecha_creacion DESC, id DESC LIMIT ? OFFSET ?"
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, (*params, limit, offset))]


@app.get("/productos/activos")
def listar_productos_activos() -> list[dict]:
    """Todos los productos activos ordenados por nombre (para selectores)."""
    with get_db() as conn:
        return [
            dict(r)
            for r in conn.execute("SELECT * FROM productos WHERE estatus = 'activo' ORDER BY nombre COLLATE NOCASE")
        ]


@app.get("/productos/{pid}")
def obtener_producto(pid: int) -> dict:
    with get_db() as conn:
        return dict(_producto_o_404(conn, pid))


@app.post("/productos", status_code=201)
def crear_producto(p: ProductoIn) -> dict:
    now = now_iso()
    with get_db() as conn:
        _validar_nombre_unico(conn, p.nombre)
        cur = conn.execute(
            "INSERT INTO productos (nombre, recordar, intervalo_dias, fecha_creacion, fecha_actualizacion, estatus)"
            " VALUES (?, ?, ?, ?, ?, 'activo')",
            (p.nombre, p.recordar, p.intervalo_dias, now, now),
        )
        return {"id": cur.lastrowid}


@app.put("/productos/{pid}")
def actualizar_producto(pid: int, p: ProductoIn) -> dict:
    with get_db() as conn:
        _producto_o_404(conn, pid)
        _validar_nombre_unico(conn, p.nombre, pid)
        conn.execute(
            "UPDATE productos SET nombre = ?, recordar = ?, intervalo_dias = ?, fecha_actualizacion = ? WHERE id = ?",
            (p.nombre, p.recordar, p.intervalo_dias, now_iso(), pid),
        )
        return {"ok": True}


@app.delete("/productos/{pid}")
def eliminar_producto(pid: int) -> dict:
    """Soft-delete: marca el producto como inactivo."""
    with get_db() as conn:
        _set_estatus(conn, "productos", pid, "inactivo", con_fecha=True)
        return {"ok": True}


@app.post("/productos/{pid}/reactivar")
def reactivar_producto(pid: int) -> dict:
    with get_db() as conn:
        _set_estatus(conn, "productos", pid, "activo", con_fecha=True)
        return {"ok": True}


# ---- Compras ----

@app.get("/compras")
def listar_compras(
    idProducto: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    incluir_inactivos: bool = False,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[dict]:
    sql = (
        "SELECT c.*, p.nombre AS producto_nombre,"
        " p.intervalo_dias AS producto_intervalo, p.recordar AS producto_recordar"
        " FROM compras c JOIN productos p ON p.id = c.idProducto"
    )
    where, params = [], []
    if not incluir_inactivos:
        where.append("c.estatus = 'activo'")
    if idProducto:
        where.append("c.idProducto = ?")
        params.append(idProducto)
    if desde:
        where.append("c.fecha_compra >= ?")
        params.append(desde.isoformat())
    if hasta:
        where.append("c.fecha_compra <= ?")
        params.append(hasta.isoformat())
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY c.fecha_compra DESC, c.id DESC LIMIT ? OFFSET ?"
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, (*params, limit, offset))]


@app.post("/compras", status_code=201)
def crear_compra(c: CompraIn) -> dict:
    with get_db() as conn:
        prod = conn.execute("SELECT estatus FROM productos WHERE id = ?", (c.idProducto,)).fetchone()
        if prod is None:
            raise HTTPException(400, "El producto no existe.")
        if prod["estatus"] != "activo":
            raise HTTPException(400, "No se pueden registrar compras de un producto inactivo.")
        cur = conn.execute(
            "INSERT INTO compras (idProducto, recordar, fecha_compra, costo, fecha_creacion, estatus)"
            " VALUES (?, ?, ?, ?, ?, 'activo')",
            (c.idProducto, c.recordar, (c.fecha_compra or date.today()).isoformat(), c.costo, now_iso()),
        )
        return {"id": cur.lastrowid}


@app.put("/compras/{cid}")
def actualizar_compra(cid: int, c: CompraIn) -> dict:
    with get_db() as conn:
        actual = conn.execute("SELECT fecha_compra FROM compras WHERE id = ?", (cid,)).fetchone()
        if actual is None:
            raise HTTPException(404, "Compra no encontrada")
        if conn.execute("SELECT 1 FROM productos WHERE id = ?", (c.idProducto,)).fetchone() is None:
            raise HTTPException(400, "El producto no existe.")
        # Si no mandan fecha se conserva la que tenía (antes se sobrescribía con "ahora").
        fecha = c.fecha_compra.isoformat() if c.fecha_compra else actual["fecha_compra"]
        conn.execute(
            "UPDATE compras SET idProducto = ?, recordar = ?, fecha_compra = ?, costo = ? WHERE id = ?",
            (c.idProducto, c.recordar, fecha, c.costo, cid),
        )
        return {"ok": True}


@app.delete("/compras/{cid}")
def eliminar_compra(cid: int) -> dict:
    """Soft-delete: marca la compra como inactiva."""
    with get_db() as conn:
        _set_estatus(conn, "compras", cid, "inactivo", con_fecha=False)
        return {"ok": True}


@app.post("/compras/{cid}/reactivar")
def reactivar_compra(cid: int) -> dict:
    with get_db() as conn:
        _set_estatus(conn, "compras", cid, "activo", con_fecha=False)
        return {"ok": True}
