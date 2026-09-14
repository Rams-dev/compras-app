import { useState } from 'react'
import { Compras } from './components/Compras'
import { Productos } from './components/Productos'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const [tab, setTab] = useState('productos')
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="flex-1 max-w-3xl">
        {tab === 'productos' ? <Productos /> : <Compras />}
      </main>
    </div>
  )
}
