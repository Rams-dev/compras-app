import { useEffect, useState } from 'react'
import { api, type Compra, type Producto } from '../api'

export function Compras() {
  const [items, setItems] = useState<Compra[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [fProd, setFProd] = useState('')
  const [selProd, setSelProd] = useState('')
  const [costo, setCosto] = useState('')
  const [edit, setEdit] = useState<Compra | null>(null)

  const cargar = async () => {
    const [prods, comps] = await Promise.all([api.get<Producto[]>('/productos?incluir_inactivos=false&limit=200'), api.get<Compra[]>(`/compras?limit=30${fProd ? `&idProducto=${fProd}` : ''}`)])
    setProductos(prods); setItems(comps)
  }
  useEffect(() => { cargar() }, [fProd])

  const guardar = async () => {
    if (!selProd) return alert('Elige producto')
    const body = { idProducto: Number(selProd), costo: parseFloat(costo), fecha_compra: new Date().toISOString().slice(0, 10), recordar: 1 }
    if (edit) await api.put(`/compras/${edit.id}`, body)
    else await api.post('/compras', body)
    setCosto(''); setEdit(null); cargar()
  }

  return (
    <div className="p-6 space-y-4">
      <select value={fProd} onChange={e => setFProd(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
        <option value="">Todos los productos</option>
        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <div className="flex gap-2">
        <select value={selProd} onChange={e => setSelProd(e.target.value)} className="border rounded-lg px-3 py-2 flex-1">
          <option value="">Producto...</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input value={costo} onChange={e => setCosto(e.target.value)} placeholder="Costo" className="border rounded-lg px-3 py-2 w-32" />
        <button onClick={guardar} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm">{edit ? 'Actualizar' : '+ Compra'}</button>
      </div>
      <div className="grid gap-2">
        {items.map(c => (
          <div key={c.id} className="border rounded-xl p-3 flex justify-between items-center bg-white">
            <div><div className="font-medium">{c.producto_nombre}</div><div className="text-xs text-zinc-500">${c.costo} • {c.fecha_compra.slice(0, 10)} • {c.estatus}</div></div>
            <div className="flex gap-1">
              <button onClick={() => { setEdit(c); setSelProd(String(c.idProducto)); setCosto(String(c.costo)) }} className="text-sm border px-3 py-1 rounded-lg">Editar</button>
              {c.estatus === 'activo' ? <button onClick={async () => { await api.del(`/compras/${c.id}`); cargar() }} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg">Eliminar</button> : <button onClick={async () => { await api.post(`/compras/${c.id}/reactivar`); cargar() }} className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg">Reactivar</button>}
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-zinc-400 py-8">Sin compras</div>}
      </div>
    </div>
  )
}
