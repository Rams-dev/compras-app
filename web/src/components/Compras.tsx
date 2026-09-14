import { useEffect, useState } from 'react'
import { api, type Compra, type Producto } from '../api'
import { Modal } from './Modal'

export function Compras() {
  const [items, setItems] = useState<Compra[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [fProd, setFProd] = useState('')
  const [modal, setModal] = useState(false)
  const [selProd, setSelProd] = useState('')
  const [costo, setCosto] = useState('')
  const [edit, setEdit] = useState<Compra | null>(null)

  const cargar = async () => {
    const [prods, comps] = await Promise.all([api.get<Producto[]>('/productos?incluir_inactivos=false&limit=200'), api.get<Compra[]>(`/compras?limit=30${fProd ? `&idProducto=${fProd}` : ''}`)])
    setProductos(prods); setItems(comps)
  }
  useEffect(() => { cargar() }, [fProd])

  const openNew = () => { setEdit(null); setSelProd(productos[0] ? String(productos[0].id) : ''); setCosto(''); setModal(true) }
  const openEdit = (c: Compra) => { setEdit(c); setSelProd(String(c.idProducto)); setCosto(String(c.costo)); setModal(true) }

  const guardar = async () => {
    if (!selProd) return alert('Elige producto')
    const body = { idProducto: Number(selProd), costo: parseFloat(costo), fecha_compra: new Date().toISOString().slice(0, 10), recordar: 1 }
    if (edit) await api.put(`/compras/${edit.id}`, body)
    else await api.post('/compras', body)
    setModal(false); cargar()
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={fProd} onChange={e => setFProd(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2.5 flex-1 bg-white">
          <option value="">Todos los productos</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button onClick={openNew} className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap">+ Compra</button>
      </div>
      <div className="grid gap-3">
        {items.map(c => (
          <div key={c.id} className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div><div className="font-medium">{c.producto_nombre}</div><div className="text-sm text-zinc-600">${c.costo} • {c.fecha_compra.slice(0, 10)}</div><span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] ${c.estatus === 'activo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100'}`}>{c.estatus}</span></div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(c)} className="flex-1 sm:flex-none border px-4 py-2 rounded-xl text-sm">Editar</button>
              {c.estatus === 'activo' ? <button onClick={async () => { if (confirm('¿Eliminar?')) { await api.del(`/compras/${c.id}`); cargar() } }} className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-xl text-sm">Eliminar</button> : <button onClick={async () => { await api.post(`/compras/${c.id}/reactivar`); cargar() }} className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-sm">Reactivar</button>}
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-zinc-400 py-12 bg-white border border-dashed rounded-2xl">Sin compras</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Editar compra' : 'Nueva compra'}>
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Producto</label><select value={selProd} onChange={e => setSelProd(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2.5 bg-white">{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          <div><label className="text-sm font-medium">Costo</label><input value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" inputMode="decimal" className="mt-1 w-full border rounded-xl px-3 py-2.5" /></div>
          <div className="flex gap-2 pt-2"><button onClick={() => setModal(false)} className="flex-1 border rounded-xl py-2.5">Cancelar</button><button onClick={guardar} className="flex-1 bg-zinc-900 text-white rounded-xl py-2.5">Guardar</button></div>
        </div>
      </Modal>
    </div>
  )
}
