import { useEffect, useState } from 'react'
import { api, type Producto } from '../api'
import { Modal } from './Modal'

export function Productos() {
  const [items, setItems] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
  const [modal, setModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [intervalo, setIntervalo] = useState('30')
  const [recordar, setRecordar] = useState(true)
  const [edit, setEdit] = useState<Producto | null>(null)

  const cargar = async () => {
    const qs = new URLSearchParams({ incluir_inactivos: String(verInactivos), limit: '30' })
    if (filtro.trim()) qs.set('nombre', filtro.trim())
    setItems(await api.get<Producto[]>(`/productos?${qs}`))
  }
  useEffect(() => { cargar() }, [filtro, verInactivos])

  const openNew = () => { setEdit(null); setNombre(''); setIntervalo('30'); setRecordar(true); setModal(true) }
  const openEdit = (p: Producto) => { setEdit(p); setNombre(p.nombre); setIntervalo(String(p.intervalo_dias)); setRecordar(p.recordar === 1); setModal(true) }

  const guardar = async () => {
    if (!nombre.trim()) return alert('Falta nombre')
    let diasFinal: number
    if (recordar) {
      const d = parseInt(intervalo, 10)
      if (isNaN(d) || d <= 0) return alert('Intervalo inválido')
      diasFinal = d
    } else {
      diasFinal = edit ? edit.intervalo_dias : 30
    }
    const body = { nombre: nombre.trim(), recordar: recordar ? 1 : 0, intervalo_dias: diasFinal }
    if (edit) await api.put(`/productos/${edit.id}`, body)
    else await api.post('/productos', body)
    setModal(false); cargar()
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="🔍 Filtrar..." className="border border-zinc-200 rounded-xl px-4 py-2.5 flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        <label className="flex items-center gap-2 text-sm bg-white border rounded-xl px-3 py-2"><input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} /> Inactivos</label>
        <button onClick={openNew} className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap">+ Producto</button>
      </div>
      <div className="grid gap-3">
        {items.map(p => (
          <div key={p.id} className={`bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${p.estatus === 'inactivo' ? 'opacity-60' : ''}`}>
            <div className="min-w-0"><div className="font-medium truncate">{p.nombre}</div><div className="text-xs text-zinc-500 mt-1">{p.recordar ? `Cada ${p.intervalo_dias} días` : 'Sin recordatorio'} • <span className={`px-2 py-0.5 rounded-full text-[11px] ${p.estatus === 'activo' ? 'bg-green-100 text-green-700' : 'bg-zinc-100'}`}>{p.estatus}</span></div></div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(p)} className="flex-1 sm:flex-none border border-zinc-200 px-4 py-2 rounded-xl text-sm">Editar</button>
              {p.estatus === 'activo' ? <button onClick={async () => { if (confirm('¿Eliminar?')) { await api.del(`/productos/${p.id}`); cargar() } }} className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-xl text-sm">Eliminar</button> : <button onClick={async () => { await api.post(`/productos/${p.id}/reactivar`); cargar() }} className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-sm">Reactivar</button>}
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-zinc-400 py-12 bg-white border border-dashed rounded-2xl">Sin productos</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          <div><label className="text-sm font-medium">Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Aceite motor" className="mt-1 w-full border rounded-xl px-3 py-2.5" /></div>
          <label className="flex items-center justify-between p-3 border rounded-xl"><span className="text-sm">Recordar</span><input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} /></label>
          {recordar && <div><label className="text-sm font-medium">Intervalo (días)</label><input value={intervalo} onChange={e => setIntervalo(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2.5" /></div>}
          <div className="flex gap-2 pt-2"><button onClick={() => setModal(false)} className="flex-1 border rounded-xl py-2.5">Cancelar</button><button onClick={guardar} className="flex-1 bg-zinc-900 text-white rounded-xl py-2.5">Guardar</button></div>
        </div>
      </Modal>
    </div>
  )
}
