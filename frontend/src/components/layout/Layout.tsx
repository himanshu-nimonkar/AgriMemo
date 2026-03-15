import React from 'react'
import { useAppStore, type AppView } from '../../store/appStore'

interface NavItem {
  view: AppView
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { view: 'upload', label: 'Upload' },
  { view: 'history', label: 'History' },
  { view: 'status', label: 'Status' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { view, setView } = useAppStore()

  return (
    <div className="bg-[#f7f8f6] font-sans text-slate-800 min-h-screen flex flex-col selection:bg-brand/20">
      <header className="w-full py-6 px-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50 border-b border-brand-light">
        <button
          onClick={() => setView('upload')}
          className="flex items-center gap-2 outline-none"
        >
          <span className="text-2xl font-extrabold tracking-tight text-moss">
            Agri<span className="text-brand">Memo</span>
          </span>
        </button>

        <nav className="hidden md:block">
          <ul className="flex gap-10 font-bold text-moss/70">
            {NAV_ITEMS.map((item) => (
              <li key={item.view}>
                <button
                  onClick={() => setView(item.view)}
                  className={`transition-colors ${
                    view === item.view ? 'text-brand' : 'hover:text-brand'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile menu - simplified block */}
        <div className="flex md:hidden gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              title={item.label}
              className={`px-3 py-2 rounded-twelve text-sm font-bold transition-all ${
                view === item.view ? 'bg-brand text-white shadow-lg' : 'text-moss/70 hover:bg-white/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-grow flex flex-col">{children}</main>

      <footer className="mt-20 py-12 px-8 border-t border-brand-light bg-white/30 text-center">
        <p className="text-moss/40 text-sm font-medium">© {new Date().getFullYear()} AgriMemo Intelligence Systems. Secure edge-processing active.</p>
      </footer>
    </div>
  )
}
