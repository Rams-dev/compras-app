import { useState } from 'react'

export function Sidebar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      <div className="font-bold text-lg px-2 py-2 flex items-center gap-2">🛒 Compras</div>
      {[
        ['productos', 'Productos'],
        ['compras', 'Compras'],
      ].map(([k, l]) => (
        <button key={k} onClick={() => { setTab(k); setOpen(false) }} className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition ${tab === k ? 'bg-zinc-900 text-white shadow' : 'hover:bg-zinc-100 text-zinc-600'}`}>
          {l}
        </button>
      ))}
    </nav>
  )
  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="p-2 -ml-2 rounded-lg hover:bg-zinc-100">☰</button>
        <span className="font-semibold">Compras App</span>
      </header>
      <aside className="hidden lg:flex w-60 shrink-0 border-r bg-white flex-col">{nav}</aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div onClick={() => setOpen(false)} className="flex-1 bg-black/30" />
          <div className="w-64 bg-white shadow-xl">{nav}</div>
        </div>
      )}
    </>
  )
}
