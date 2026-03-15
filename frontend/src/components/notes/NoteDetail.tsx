import { useState, useRef } from 'react'
import { useVoiceNote, useDeleteVoiceNote } from '../../hooks/useVoiceNotes'
import { useAppStore } from '../../store/appStore'
import { formatDateTime, formatDuration, formatPipelineMs, formatConfidence, getNoteTypeColor } from '../../utils/formatters'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

function AudioPlayer({ noteId }: { noteId: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrl = `${API_BASE}/voice-notes/${noteId}/audio`

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (isPlaying) { a.pause() } else { a.play().catch(() => setAudioError('Playback failed')) }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    const a = audioRef.current
    if (!a) return
    setProgress(a.currentTime)
  }

  const handleLoadedMetadata = () => {
    const a = audioRef.current
    if (a) setDuration(a.duration)
  }

  const handleEnded = () => setIsPlaying(false)

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    const t = parseFloat(e.target.value)
    a.currentTime = t
    setProgress(t)
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (audioError) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-medium flex items-center gap-2">
        <span className="material-symbols-outlined">warning</span>
        Audio playback unavailable — file may not be stored on this version.
      </div>
    )
  }

  return (
    <div className="mt-6 p-5 rounded-2xl border border-[#e5e1d8] bg-gradient-to-br from-[#f7f8f6] to-[#f2f0eb] animate-fade-in shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setAudioError('Audio file not available')}
        preload="metadata"
      />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-md hover:bg-brand-dark hover:scale-105 active:scale-95 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[22px]">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-full accent-brand cursor-pointer"
            style={{ background: `linear-gradient(to right, #3eaa13 ${duration ? (progress/duration)*100 : 0}%, #e5e1d8 0%)` }}
          />
          <div className="flex justify-between mt-1.5 text-[10px] font-bold text-earth/50">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
        <a
          href={audioUrl}
          download
          className="w-10 h-10 rounded-full bg-white border border-[#e5e1d8] flex items-center justify-center text-earth/60 hover:text-brand hover:border-brand transition-all"
          title="Download audio"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </a>
      </div>
    </div>
  )
}

export function NoteDetail() {
  const { activeNoteId, navigateTo } = useAppStore()
  const { data: note, isLoading, error } = useVoiceNote(activeNoteId)
  const deleteMutation = useDeleteVoiceNote()
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = async () => {
    if (!activeNoteId) return
    try {
      await deleteMutation.mutateAsync(activeNoteId)
      navigateTo('history')
    } catch {
      // Handle error internally or via toast
    }
  }

  const handleCopy = () => {
    const data = activeTab === 'a' ? note?.structured_schema_a : note?.structured_schema_b
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleDownloadJson = () => {
    if (!note) return
    const data = activeTab === 'a' ? note.structured_schema_a : note.structured_schema_b
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agrimemo_${note.note_id}_schema_${activeTab}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="p-12 text-earth/40 font-medium text-center flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#e5e1d8] border-t-brand rounded-full animate-spin mb-4 shadow-glow"></div>
        <p className="animate-pulse">Loading note details...</p>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 bg-red-50 text-terracotta rounded-full flex items-center justify-center mb-4 text-2xl">
           <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <p className="text-terracotta font-bold mb-6 text-lg">Note not found or failed to load.</p>
        <button 
          onClick={() => navigateTo('history')} 
          className="clay-button px-6 py-3 rounded-xl font-extrabold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to History
        </button>
      </div>
    )
  }

  const tabClass = (t: 'a' | 'b') =>
    t === activeTab
      ? 'bg-brand text-white px-6 py-3 rounded-xl font-bold shadow-clay-sm flex items-center gap-2 outline-none transition-all'
      : 'bg-transparent text-earth/60 hover:text-earth px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border border-transparent hover:border-[#e5e1d8] hover:bg-white outline-none'

  const typeColor = getNoteTypeColor(note.note_type || '')

  // Check for non-agricultural content flag from Schema B
  const schemaB = note.structured_schema_b as Record<string, unknown> | null
  const isNonAgri = schemaB?.agri_relevant === false
  const nonAgriReason = schemaB?.rejection_reason as string | null

  return (
    <div className="flex-grow p-6 lg:p-8 overflow-y-auto animate-slide-up custom-scroll">
      <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 pb-12">
        {/* Breadcrumb & Header */}
        <div className="flex items-center gap-3 text-sm text-earth/50 font-bold mb-4">
          <button onClick={() => navigateTo('history')} className="hover:text-brand transition-colors flex items-center gap-1 group">
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back_ios_new</span>
            Notes History
          </button>
          <span>/</span>
          <span className="text-earth truncate max-w-[200px] md:max-w-xs block select-all">{note.audio_filename}</span>
        </div>

        {/* Non-agricultural content warning */}
        {isNonAgri && (
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-4 animate-fade-in shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined">report</span>
            </div>
            <div>
              <h4 className="font-extrabold text-amber-800 text-sm">Non-Agricultural Content Detected</h4>
              <p className="text-amber-700/80 text-sm mt-1 font-medium">
                {nonAgriReason || 'This note does not appear to be related to agricultural or field operations.'}
                {' '}The note has been stored and structured as a general note.
              </p>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="clay-card-light bg-white rounded-[32px] p-8 lg:p-10 relative overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-muted rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {note.note_type && (
                    <span className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase tracking-wider ${typeColor.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')} border`}>
                      <span className="material-symbols-outlined text-[12px] align-text-bottom mr-1">category</span>
                      {note.note_type.replace('_', ' ')}
                    </span>
                  )}
                  {note.is_duplicate && (
                    <span className="px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      Duplicate
                    </span>
                  )}
                  {note.low_confidence && (
                    <span className="px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      Low Confidence
                    </span>
                  )}
                  <span className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-2 ${
                    note.status === 'stored' ? 'bg-brand-muted text-brand-dark border border-brand/20' :
                    note.status === 'failed' ? 'bg-terracotta-light text-terracotta border border-terracotta/20' :
                    'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {['received', 'transcribing', 'transcribed', 'structuring', 'structured'].includes(note.status) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                    {note.status === 'stored' && <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>}
                    {note.status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-terracotta"></span>}
                    {note.status}
                  </span>
                </div>
                
                <h1 className="text-3xl lg:text-4xl font-black text-earth mt-8 mb-3 pr-4 tracking-tight line-clamp-2 overflow-hidden break-all">
                  {note.structured_schema_a && typeof (note.structured_schema_a as Record<string, unknown>).title === 'string'
                    ? (note.structured_schema_a as Record<string, unknown>).title as string
                    : note.audio_filename.replace(/\.[^.]+$/, '')}
                </h1>
                
                <div className="flex flex-wrap gap-4 text-xs font-bold text-earth/50 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    {formatDateTime(note.created_at)}
                  </span>
                  {note.audio_duration_seconds != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {formatDuration(note.audio_duration_seconds)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">devices</span>
                    {note.device_id}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1 flex flex-row lg:flex-col gap-3 justify-end items-end lg:items-end lg:justify-start pt-2">
              <button 
                onClick={handleDownloadJson}
                className="w-auto px-5 py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 text-brand bg-brand/10 hover:bg-brand/20 transition-all border border-transparent shadow-sm hover:shadow-md active:scale-95 text-sm"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                JSON
              </button>
              
              {!confirmDelete ? (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                  className="w-auto px-5 py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 text-terracotta bg-terracotta-light hover:bg-terracotta/20 transition-all border border-transparent shadow-sm hover:shadow-md active:scale-95 text-sm"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  Delete
                </button>
              ) : (
                <div className="w-auto flex flex-col md:flex-row gap-2 animate-fade-in">
                  <button 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-5 py-2.5 rounded-xl font-extrabold text-white bg-terracotta hover:bg-terracotta-dark transition-all shadow-sm text-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(false)}
                    className="px-5 py-2.5 rounded-xl font-extrabold text-earth/60 bg-stone hover:bg-stone-border transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processing Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Confidence */}
           <div className="bg-brand-muted rounded-2xl p-5 border border-brand/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-[10px] font-extrabold text-brand uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">verified</span>
                Confidence
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-black text-[#2d3a23]">
                  {formatConfidence(note.transcript_confidence || 0)}
                </div>
              </div>
           </div>
           
           {/* Pipeline Time */}
           <div className="bg-white rounded-2xl p-5 border border-[#e5e1d8] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <div className="text-[10px] font-extrabold text-earth/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">bolt</span>
                Process Time
              </div>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-black text-[#2d3a23]">{formatPipelineMs(note.pipeline_duration_ms)}</div>
              </div>
           </div>
           
           {/* Model Info */}
           <div className="bg-white rounded-2xl p-5 border border-[#e5e1d8] lg:col-span-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-[10px] font-extrabold text-earth/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">memory</span>
                AI Engines
              </div>
              <div className="text-sm font-bold text-[#2d3a23] mt-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-earth/60 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">hearing</span> Speech:
                  </span>
                  <span className="bg-stone-warm px-2 py-0.5 rounded-md text-xs">Deepgram Nova-2</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-earth/60 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">psychology</span> Structure:
                  </span>
                  <span className="bg-stone-warm px-2 py-0.5 rounded-md text-xs">Llama 3.1 8B</span>
                </div>
              </div>
           </div>
        </div>

        {note.errors.length > 0 && (
          <div className="p-5 bg-terracotta-light border border-terracotta/20 rounded-2xl text-sm font-bold text-terracotta space-y-2 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
               <span className="material-symbols-outlined">report</span>
               Processing Warnings
            </div>
            {note.errors.map((e, i) => <div key={i} className="pl-7 opacity-90 leading-relaxed">• {e}</div>)}
          </div>
        )}

        {/* Transcript Section */}
        <div className="clay-card-light bg-white rounded-[32px] p-8 mt-8 animate-slide-up" style={{ animationDelay: '0.25s' }}>
           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#e5e1d8]">
             <div className="w-10 h-10 rounded-full bg-stone-warm flex items-center justify-center text-earth/60">
                <span className="material-symbols-outlined text-lg">notes</span>
             </div>
             <div>
                <h2 className="text-xl font-extrabold text-[#2d3a23]">Full Transcript</h2>
                <p className="text-xs font-bold text-earth/50 uppercase tracking-widest mt-0.5">Raw Audio Text</p>
             </div>
           </div>
           
           <div 
             className="p-8 rounded-2xl text-earth font-fraunces text-lg leading-relaxed italic inner-soft-glow"
             style={{ background: 'linear-gradient(135deg, #f7f8f6 0%, #f2f0eb 100%)', border: '1px solid #e5e1d8' }}
           >
             {note.transcript ? `"${note.transcript}"` : <span className="text-earth/40 not-italic font-manrope font-medium flex items-center gap-2"><span className="material-symbols-outlined">mic_off</span> No transcript available.</span>}
           </div>

           {/* Audio Player */}
           <AudioPlayer noteId={note.note_id} />
        </div>

        {/* Data Outputs (Tabs) */}
        <div className="flex flex-col animate-slide-up" style={{ animationDelay: '0.3s' }}>
           <div className="flex gap-4 mb-4 pl-2">
             <button className={tabClass('a')} onClick={() => setActiveTab('a')}>
                <span className="material-symbols-outlined">data_object</span>
               Schema A: Structured
             </button>
             <button className={tabClass('b')} onClick={() => setActiveTab('b')}>
               <span className="material-symbols-outlined">smart_toy</span>
               Schema B: AI Output
             </button>
           </div>
           
           <div className="clay-card-light bg-white rounded-[32px] p-6 lg:p-8 flex flex-col relative min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="font-extrabold text-[#2d3a23] text-lg">
                     {activeTab === 'a' ? 'Predefined Output' : 'Dynamic Extraction'}
                   </h3>
                   <p className="text-earth/60 text-sm font-medium mt-1">
                     {activeTab === 'a' 
                       ? 'Data mapped to strict agricultural types.' 
                       : 'Flexible JSON with all detected contexts.'}
                   </p>
                </div>
                <button 
                  onClick={handleCopy}
                  className="w-10 h-10 rounded-full bg-stone-warm hover:bg-stone-border flex items-center justify-center text-earth/60 transition-all hover:scale-110 active:scale-95"
                  title="Copy JSON"
                >
                  <span className="material-symbols-outlined text-[20px]">{copied ? 'check' : 'content_copy'}</span>
                </button>
              </div>
              
              <div className="bg-[#2d3a23] rounded-2xl p-6 overflow-auto flex-grow relative inner-soft-glow custom-scroll min-h-[300px]">
                 <pre className="text-[#CEDEBD] font-mono text-sm leading-relaxed">
                   {activeTab === 'a' 
                     ? JSON.stringify(note.structured_schema_a, null, 2) || 'No data generated.'
                     : JSON.stringify(note.structured_schema_b, null, 2) || 'No data generated.'}
                 </pre>
              </div>
           </div>
        </div>

        {/* Duplicate reference */}
        {note.is_duplicate && note.duplicate_of && (
          <div className="p-5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-700 text-sm font-medium flex items-center gap-3 animate-fade-in">
            <span className="material-symbols-outlined">content_copy</span>
            <div>
              <span className="font-bold">Duplicate note detected.</span>
              <span className="block text-xs opacity-70 mt-0.5">Original: {note.duplicate_of}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
