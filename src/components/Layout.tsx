import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="text-xl font-semibold text-slate-900 hover:text-slate-700">
            Famtree
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            <Tab to="/">Personer</Tab>
            <Tab to="/data">Importér/eksportér</Tab>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md transition ${
          isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
