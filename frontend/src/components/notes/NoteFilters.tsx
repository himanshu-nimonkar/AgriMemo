/**
 * AgriMemo — Notes Filters
 */
import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'

const NOTE_TYPES = ['task', 'observation', 'reminder', 'scheduling', 'note']

export function NoteFilters() {
  const { filters, setFilters, resetFilters } = useAppStore()

  const [localStartDate, setLocalStartDate] = useState(filters.start_date || '')
  const [localEndDate, setLocalEndDate] = useState(filters.end_date || '')

  useEffect(() => {
    setLocalStartDate(filters.start_date || '')
    setLocalEndDate(filters.end_date || '')
  }, [filters.start_date, filters.end_date])

  const applyDateRange = () => {
    setFilters({ start_date: localStartDate || undefined, end_date: localEndDate || undefined, page: 1 })
  }


  return (
    <div className="space-y-8">
      {/* Note Type */}
      <div>
        <h3 className="text-[10px] font-black text-earth/40 uppercase tracking-widest mb-6">Note Type</h3>
        <div className="space-y-4">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setFilters({ type: undefined, page: 1 })}
          >
            <div className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-all logo-clay ${!filters.type ? 'bg-brand shadow-clay-sm' : 'bg-white'}`}>
              {!filters.type && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
            </div>
            <span className={`text-sm font-extrabold transition-colors ${!filters.type ? 'text-brand' : 'text-earth/60 group-hover:text-brand'}`}>All Records</span>
          </div>
          
          {NOTE_TYPES.map((t) => (
            <div 
              key={t} 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setFilters({ type: t, page: 1 })}
            >
              <div className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-all logo-clay ${filters.type === t ? 'bg-brand shadow-clay-sm' : 'bg-white'}`}>
                {filters.type === t && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
              </div>
              <span className={`text-sm font-extrabold capitalize transition-colors ${filters.type === t ? 'text-brand' : 'text-earth/60 group-hover:text-brand'}`}>
                {t.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h3 className="text-[10px] font-black text-earth/40 uppercase tracking-widest mb-6">Date Range</h3>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] text-earth/40 font-black uppercase tracking-tighter px-1">Start Date</label>
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="clay-input !py-3 !px-4 text-xs font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] text-earth/40 font-black uppercase tracking-tighter px-1">End Date</label>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="clay-input !py-3 !px-4 text-xs font-bold"
            />
          </div>
          <button
            onClick={applyDateRange}
            disabled={localStartDate === (filters.start_date || '') && localEndDate === (filters.end_date || '')}
            className="clay-button w-full py-3 text-sm font-extrabold disabled:opacity-50"
          >
            Apply Range
          </button>
        </div>
      </div>

      {/* Attributes */}
      <div>
        <h3 className="text-[10px] font-black text-earth/40 uppercase tracking-widest mb-6">Options</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded-lg transition-all logo-clay flex items-center justify-center ${filters.high_confidence_only ? 'bg-brand' : 'bg-white'}`}>
              <input
                type="checkbox"
                checked={!!filters.high_confidence_only}
                onChange={(e) => setFilters({ high_confidence_only: e.target.checked, page: 1 })}
                className="hidden"
              />
              {filters.high_confidence_only && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
            </div>
            <span className="text-sm text-earth/60 font-extrabold group-hover:text-brand transition-colors">High confidence</span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
             <div className={`w-6 h-6 rounded-lg transition-all logo-clay flex items-center justify-center ${!filters.include_duplicates ? 'bg-brand' : 'bg-white'}`}>
              <input
                type="checkbox"
                checked={!filters.include_duplicates}
                onChange={(e) => setFilters({ include_duplicates: !e.target.checked, page: 1 })}
                className="hidden"
              />
              {!filters.include_duplicates && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
            </div>
            <span className="text-sm text-earth/60 font-extrabold group-hover:text-brand transition-colors">No duplicates</span>
          </label>
        </div>
      </div>

      <button
        onClick={resetFilters}
        className="clay-button-secondary w-full py-4 text-xs font-black uppercase tracking-widest"
      >
        Reset All
      </button>
    </div>
  )
}
