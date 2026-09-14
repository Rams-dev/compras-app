import { useEffect, useState } from 'react'
import { api, type Producto } from '../api'

export function Productos() {
  const [items, setItems] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
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

  const guardar = async () => {
    if (!nombre.trim()) return alert('Falta nombre')
    const body = { nombre: nombre.trim(), recordar: recordar ? 1 : 0, intervalo_dias: parseInt(intervalo) || 30 }
    if (edit) await api.put(`/productos/${edit.id}`, body)
    else await api.post('/productos', body)
    setNombre(''); setEdit(null); cargar()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar..." className="border rounded-lg px-3 py-2 flex-1" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} /> Inactivos</label>
      </div>
      <div className="flex gap-2">
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="border rounded-lg px-3 py-2 flex-1" />
        <input value={intervalo} onChange={e => setIntervalo(e.target.value)} placeholder="30" className="border rounded-lg px-3 py-2 w-24" />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} /> Recordar</label>
        <button onClick={guardar} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm">{edit ? 'Actualizar' : '+ Producto'}</button>
      </div>
      <div className="grid gap-2">
        {items.map(p => (
          <div key={p.id} className={`border rounded-xl p-3 flex justify-between items-center bg-white ${p.estatus === 'inactivo' ? 'opacity-60' : ''}`}>
            <div><div className="font-medium">{p.nombre}</div><div className="text-xs text-zinc-500">{p.recordar ? `Cada ${p.intervalo_dias}d` : 'Sin recordatorio'} • {p.estatus}</div></div>
            <div className="flex gap-1">
              <button onClick={() => { setEdit(p); setNombre(p.nombre); setIntervalo(String(p.intervalo_dias)); setRecordar(p.recordar === 1) }} className="text-sm border px-3 py-1 rounded-lg">Editar</button>
              {p.estatus === 'activo' ? <button onClick={async () => { await api.del(`/productos/${p.id}`); cargar() }} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg">Eliminar</button> : <button onClick={async () => { await api.post(`/productos/${p.id}/reactivar`); cargar() }} className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg">Reactivar</button>}
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-zinc-400 py-8">Sin productos</div>}
      </div>
    </div>
  )
}
