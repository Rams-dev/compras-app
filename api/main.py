"""API Compras App — FastAPI + SQLite (mismo modelo que la app móvil)."""
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).with_name("compras.db")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_db() as conn:
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
            CREATE TABLE IF NOT EXISTS compras (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                idProducto INTEGER NOT NULL REFERENCES productos(id),
                recordar INTEGER NOT NULL DEFAULT 1,
                fecha_compra TEXT NOT NULL,
                costo REAL NOT NULL,
                fecha_creacion TEXT NOT NULL,
                estatus TEXT NOT NULL DEFAULT 'activo'
            );
            """
        )


class ProductoIn(BaseModel):
    nombre: str = Field(min_length=1)
    recordar: int = 1
    intervalo_dias: int = 30


class CompraIn(BaseModel):
    idProducto: int
    recordar: int = 1
    fecha_compra: str | None = None
    costo: float = Field(ge=0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Compras App API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


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
    sql += " ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?"
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, (*params, limit, offset))]


@app.post("/productos", status_code=201)
def crear_producto(p: ProductoIn) -> dict:
    now = now_iso()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO productos (nombre, recordar, intervalo_dias, fecha_creacion, fecha_actualizacion, estatus)"
            " VALUES (?, ?, ?, ?, ?, 'activo')",
            (p.nombre.strip(), p.recordar, p.intervalo_dias, now, now),
        )
        return {"id": cur.lastrowid}


@app.put("/productos/{pid}")
def actualizar_producto(pid: int, p: ProductoIn) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE productos SET nombre = ?, recordar = ?, intervalo_dias = ?, fecha_actualizacion = ? WHERE id = ?",
            (p.nombre.strip(), p.recordar, p.intervalo_dias, now_iso(), pid),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Producto no encontrado")
        return {"ok": True}


@app.delete("/productos/{pid}")
def eliminar_producto(pid: int) -> dict:
    with get_db() as conn:
        conn.execute("UPDATE productos SET estatus = 'inactivo', fecha_actualizacion = ? WHERE id = ?", (now_iso(), pid))
        return {"ok": True}


@app.post("/productos/{pid}/reactivar")
def reactivar_producto(pid: int) -> dict:
    with get_db() as conn:
        conn.execute("UPDATE productos SET estatus = 'activo', fecha_actualizacion = ? WHERE id = ?", (now_iso(), pid))
        return {"ok": True}


# ---- Compras ----

@app.get("/compras")
def listar_compras(
    idProducto: int | None = None,
    desde: str | None = None,
    hasta: str | None = None,
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
        params.append(desde)
    if hasta:
        where.append("c.fecha_compra <= ?")
        params.append(hasta)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY c.fecha_compra DESC LIMIT ? OFFSET ?"
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, (*params, limit, offset))]


@app.post("/compras", status_code=201)
def crear_compra(c: CompraIn) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO compras (idProducto, recordar, fecha_compra, costo, fecha_creacion, estatus)"
            " VALUES (?, ?, ?, ?, ?, 'activo')",
            (c.idProducto, c.recordar, c.fecha_compra or now_iso(), c.costo, now_iso()),
        )
        return {"id": cur.lastrowid}


@app.put("/compras/{cid}")
def actualizar_compra(cid: int, c: CompraIn) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE compras SET idProducto = ?, recordar = ?, fecha_compra = ?, costo = ? WHERE id = ?",
            (c.idProducto, c.recordar, c.fecha_compra or now_iso(), c.costo, cid),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Compra no encontrada")
        return {"ok": True}


@app.delete("/compras/{cid}")
def eliminar_compra(cid: int) -> dict:
    with get_db() as conn:
        conn.execute("UPDATE compras SET estatus = 'inactivo' WHERE id = ?", (cid,))
        return {"ok": True}


@app.post("/compras/{cid}/reactivar")
def reactivar_compra(cid: int) -> dict:
    with get_db() as conn:
        conn.execute("UPDATE compras SET estatus = 'activo' WHERE id = ?", (cid,))
        return {"ok": True}
