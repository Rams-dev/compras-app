import { useState } from 'react'
import { Compras } from './components/Compras'
import { Productos } from './components/Productos'
import { Sidebar } from './components/Sidebar'

export default function App() {
  const [tab, setTab] = useState('productos')
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar tab={tab} setTab={setTab} />
      <div className="lg:pl-60">
        <main className="min-h-[calc(100vh-56px)] lg:min-h-screen">
          {tab === 'productos' ? <Productos /> : <Compras />}
        </main>
      </div>
    </div>
  )
}
