import { useState, useEffect } from 'react'
import { useVoiceNotes } from '../../hooks/useVoiceNotes'
import { useAppStore } from '../../store/appStore'
import { NoteCard } from './NoteCard'
import { NoteFilters } from './NoteFilters'

export function NotesList() {
  const { filters, setFilters, navigateTo } = useAppStore()
  const [search, setSearch] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const { data, isLoading, error, refetch } = useVoiceNotes({
    ...filters,
    search: search.trim() || undefined,
  })

  // Debounced auto-search
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch()
    }, 400)
    return () => clearTimeout(timer)
  }, [search, refetch])


  return (
    <div className="flex-grow flex p-6 lg:p-8 animate-slide-up w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 pr-8 border-r border-[#e5e1d8] overflow-y-auto">
        <div className="mb-8">
           <h2 className="text-2xl font-extrabold text-[#2d3a23] mb-2 flex items-center gap-2">
             <span className="material-symbols-outlined">filter_alt</span>
             Filters
           </h2>
           <p className="text-earth/60 text-sm font-medium">Refine your field records.</p>
        </div>
        <NoteFilters />
      </aside>

      {/* Mobile Filter Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 lg:hidden ${isFiltersOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-earth/40 backdrop-blur-sm" onClick={() => setIsFiltersOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-80 bg-[#f7f8f6] p-6 shadow-2xl transition-transform duration-300 ease-out transform ${isFiltersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-extrabold text-[#2d3a23] flex items-center gap-2">
              <span className="material-symbols-outlined">filter_alt</span>
              Filters
            </h2>
            <button onClick={() => setIsFiltersOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#e5e1d8] text-earth/60 hover:text-brand transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <NoteFilters />
        </aside>
      </div>

      <div className="flex-1 lg:pl-8 flex flex-col h-full overflow-hidden w-full relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-wrap">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-[#2d3a23]">Notes History</h1>
              <p className="text-earth/60 font-medium text-sm mt-1">
                {data ? `${data.total} field note${data.total !== 1 ? 's' : ''} recorded` : 'Loading…'}
              </p>
            </div>
            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setIsFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e1d8] rounded-xl text-sm font-bold text-earth hover:bg-brand-muted hover:text-brand transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              Filters
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-earth/40 z-10 flex">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e1d8] rounded-xl text-sm font-bold focus:border-brand focus:ring-2 focus:ring-brand-light outline-none transition-all placeholder-earth/40 text-earth shadow-sm h-[48px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scroll pb-24">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-[#e5e1d8] rounded-[24px] h-56 animate-pulse shadow-sm" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-terracotta text-sm font-bold bg-terracotta-light border border-terracotta/20 rounded-2xl flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl">error</span>
              Failed to load notes. Please check the backend connection.
            </div>
          )}

          {data && data.notes.length === 0 && !isLoading && !error && (
              <div className="text-center py-24 animate-fade-in flex flex-col items-center">
                <div className="w-24 h-24 bg-brand-muted rounded-full flex items-center justify-center mx-auto mb-6 text-brand shadow-sm">
                  <span className="material-symbols-outlined text-[48px]">inventory_2</span>
                </div>
                <h3 className="text-2xl font-extrabold text-[#2d3a23] mb-2">No notes found</h3>
                <p className="text-earth/60 font-medium">Looks like you haven't recorded any field notes matching your criteria.</p>
              </div>
          )}

          {data && data.notes.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                {data.notes.map((note, idx) => (
                  <NoteCard
                    key={note.note_id}
                    note={note}
                    onClick={() => navigateTo('detail', note.note_id)}
                    animationDelay={idx * 60}
                  />
                ))}
              </div>

              {(data.has_prev || data.has_next) && (
                <div className="flex items-center justify-center gap-3 mt-4 mb-8">
                   <button
                     disabled={!data.has_prev}
                     onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                     className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e5e1d8] bg-white text-earth/60 hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                   >
                     <span className="material-symbols-outlined text-sm">chevron_left</span>
                   </button>
                   <div className="flex items-center gap-2 font-bold text-sm">
                     <span className="w-10 h-10 flex items-center justify-center bg-brand text-white rounded-xl shadow-clay-sm">
                       {data.page}
                     </span>
                     <span className="text-earth/40 mx-1">of</span>
                     <span className="text-earth/60">{Math.ceil(data.total / data.page_size)}</span>
                   </div>
                   <button
                     disabled={!data.has_next}
                     onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                     className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#e5e1d8] bg-white text-earth/60 hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                   >
                     <span className="material-symbols-outlined text-sm">chevron_right</span>
                   </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
