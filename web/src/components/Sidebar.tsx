export function Sidebar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const item = (k: string, label: string) => (
    <button onClick={() => setTab(k)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}>
      {label}
    </button>
  )
  return (
    <aside className="w-56 shrink-0 border-r bg-white p-3 flex flex-col gap-1">
      <div className="font-bold px-2 py-2">Compras App</div>
      {item('productos', 'Productos')}
      {item('compras', 'Compras')}
    </aside>
  )
}
