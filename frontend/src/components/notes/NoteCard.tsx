import type { FullNoteResponse } from '../../types'
import { formatDate, formatConfidence, getNoteTypeColor } from '../../utils/formatters'

interface NoteCardProps {
  note: FullNoteResponse
  onClick: () => void
  animationDelay?: number
}

export function NoteCard({ note, onClick, animationDelay = 0 }: NoteCardProps) {
  const typeColor = getNoteTypeColor(note.note_type || '')
  const confidence = note.transcript_confidence
  const schemaB = note.structured_schema_b as Record<string, unknown> | null
  const isNonAgri = schemaB?.agri_relevant === false

  const getIcon = () => {
    switch (note.note_type) {
      case 'task': return 'task_alt'
      case 'observation': return 'visibility'
      case 'reminder': return 'notifications'
      case 'scheduling': return 'event'
      case 'field_observation': return 'agriculture'
      case 'note': return 'notes'
      default: return 'description'
    }
  }

  const confidenceColor = confidence !== undefined 
    ? (confidence > 0.8 ? 'bg-brand' : confidence > 0.6 ? 'bg-amber-400' : 'bg-red-400')
    : 'bg-brand'

  const isProcessing = !['stored', 'structured', 'failed'].includes(note.status)

  if (isProcessing) {
    return (
      <article className="clay-card-light bg-white rounded-3xl p-6 flex flex-col items-center justify-center h-full min-h-[250px] animate-pulse border-2 border-brand/50 shadow-md">
        <span className="material-symbols-outlined animate-spin text-[48px] text-brand mb-4">sync</span>
        <h3 className="text-xl font-extrabold text-[#2d3a23]">Processing Note...</h3>
        <p className="text-sm font-medium text-earth/60 mt-2 text-center">
          Extracting insights and formatting using <br/>Llama 3.1 8B. Please wait.
        </p>
      </article>
    )
  }

  return (
    <article
      onClick={onClick}
      className={`clay-card-light bg-white rounded-3xl p-6 cursor-pointer group flex flex-col h-full hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md border border-stone-border hover:border-brand/30 animate-slide-up`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-brand-muted flex items-center justify-center text-brand group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all duration-300 shadow-sm font-bold">
            <span className="material-symbols-outlined text-[22px]">{getIcon()}</span>
          </div>
        </div>
        {note.note_type && (
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${typeColor.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')} border flex items-center gap-1`}>
            {note.note_type.replace('_', ' ')}
          </span>
        )}
      </div>

      <h3 className="text-lg font-extrabold text-[#2d3a23] leading-tight mb-3 group-hover:text-brand transition-colors line-clamp-2">
        {note.structured_schema_a && typeof note.structured_schema_a.title === 'string'
              ? note.structured_schema_a.title
              : note.audio_filename.replace(/\.[^.]+$/, '')}
      </h3>

      <div className="mb-5 flex-1">
        <p className="text-[10px] text-earth/40 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">short_text</span>
          Transcript Snippet
        </p>
        <p className={`text-sm leading-relaxed font-medium text-earth/70 line-clamp-3`}>
          {note.transcript || 'No transcript available.'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#e5e1d8]">
        <span className="text-xs font-bold text-earth/50 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {formatDate(note.created_at)}
        </span>
        
        <div className="flex flex-col items-end gap-1.5">
          {confidence !== undefined && (
            <>
              <span className="text-[9px] font-bold text-earth/40 uppercase tracking-widest">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-[#e5e1d8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${confidenceColor}`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${confidence > 0.8 ? 'text-brand' : confidence > 0.6 ? 'text-amber-600' : 'text-red-500'}`}>
                  {formatConfidence(confidence)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isNonAgri && (
          <div className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200 inline-flex items-center gap-1 overflow-hidden">
            <span className="material-symbols-outlined text-[14px]">agriculture</span> Non-agricultural
          </div>
        )}
        {note.low_confidence && (
          <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 inline-flex items-center gap-1 overflow-hidden">
            <span className="material-symbols-outlined text-[14px]">warning</span> Low confidence
          </div>
        )}
        {note.is_duplicate && (
          <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 inline-flex items-center gap-1 overflow-hidden">
            <span className="material-symbols-outlined text-[14px]">content_copy</span> Duplicate
          </div>
        )}
      </div>
    </article>
  )
}
