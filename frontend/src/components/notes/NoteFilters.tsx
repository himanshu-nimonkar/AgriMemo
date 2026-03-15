/**
 * AgriMemo — Notes Filters
 */
import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'

const NOTE_TYPES = ['task', 'observation', 'reminder', 'scheduling', 'field_observation', 'note']

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
        <h3 className="text-xs font-bold text-earth/40 uppercase tracking-widest mb-4">Note Type</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="radio"
                name="type"
                checked={!filters.type}
                onChange={() => setFilters({ type: undefined, page: 1 })}
                className="peer appearance-none w-5 h-5 border-2 border-[#e5e1d8] rounded-full checked:border-brand transition-all cursor-pointer bg-white"
              />
              <div className="absolute w-2.5 h-2.5 bg-brand rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            <span className={`text-sm font-bold transition-colors ${!filters.type ? 'text-brand' : 'text-earth/80 group-hover:text-brand'}`}>All Records</span>
          </label>
          
          {NOTE_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={filters.type === t}
                  onChange={(e) => setFilters({ type: e.target.value, page: 1 })}
                  className="peer appearance-none w-5 h-5 border-2 border-[#e5e1d8] rounded-full checked:border-brand transition-all cursor-pointer bg-white"
                />
                <div className="absolute w-2.5 h-2.5 bg-brand rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
              <span className={`text-sm font-bold capitalize transition-colors ${filters.type === t ? 'text-brand' : 'text-earth/80 group-hover:text-brand'}`}>
                {t.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h3 className="text-xs font-bold text-earth/40 uppercase tracking-widest mb-4">Date Range</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-earth/50 font-bold uppercase block mb-1.5">From</label>
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full bg-white border border-[#e5e1d8] rounded-xl text-sm font-medium p-2.5 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-earth"
            />
          </div>
          <div>
            <label className="text-[10px] text-earth/50 font-bold uppercase block mb-1.5">To</label>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="w-full bg-white border border-[#e5e1d8] rounded-xl text-sm font-medium p-2.5 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-earth"
            />
          </div>
          <button
            onClick={applyDateRange}
            disabled={localStartDate === (filters.start_date || '') && localEndDate === (filters.end_date || '')}
            className="w-full py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-[#328e0f] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Date Range
          </button>
        </div>
      </div>

      {/* Attributes */}
      <div>
        <h3 className="text-xs font-bold text-earth/40 uppercase tracking-widest mb-4">Attributes</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="checkbox"
                checked={!!filters.high_confidence_only}
                onChange={(e) => setFilters({ high_confidence_only: e.target.checked, page: 1 })}
                className="peer appearance-none w-5 h-5 border-2 border-[#e5e1d8] rounded-[6px] checked:bg-brand checked:border-brand transition-all cursor-pointer bg-white"
              />
              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-earth/80 font-bold group-hover:text-brand transition-colors">High confidence only (&gt;90%)</span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="checkbox"
                checked={filters.include_duplicates !== false}
                onChange={(e) => setFilters({ include_duplicates: e.target.checked, page: 1 })}
                className="peer appearance-none w-5 h-5 border-2 border-[#e5e1d8] rounded-[6px] checked:bg-brand checked:border-brand transition-all cursor-pointer bg-white"
              />
              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-earth/80 font-bold group-hover:text-brand transition-colors">Include duplicates</span>
          </label>
        </div>
      </div>

      <button
        onClick={resetFilters}
        className="w-full py-3 text-sm font-extrabold text-earth/50 border-2 border-transparent hover:text-earth/80 bg-[#f2f0eb] hover:bg-[#e5e1d8] rounded-xl transition-all"
      >
        Clear All Filters
      </button>
    </div>
  )
}
