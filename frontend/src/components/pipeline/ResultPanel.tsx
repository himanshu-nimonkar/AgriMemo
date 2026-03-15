/**
 * AgriMemo — Result Panel Component
 * Displays transcript + Schema A/B tabs after processing.
 */
import { useState } from 'react'
import type { FullNoteResponse } from '../../types'
import { formatConfidence, formatDuration, formatPipelineMs, getNoteTypeColor } from '../../utils/formatters'

interface ResultPanelProps {
  note: FullNoteResponse
  onUploadAnother: () => void
}

function JsonViewer({ data, title, description }: { data: Record<string, unknown> | null | undefined, title: string, description: string }) {
  const [copied, setCopied] = useState(false)

  if (!data) {
    return (
      <div className="clay-card-light p-8 flex-grow flex flex-col justify-center items-center text-earth/40 text-sm font-medium text-center">
        Schema extraction failed — transcript was still captured.
      </div>
    )
  }

  const jsonStr = JSON.stringify(data, null, 2)

  const copy = () => {
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="clay-card-light p-8 flex-grow flex flex-col h-full max-h-[600px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-earth text-xl mb-1">{title}</h3>
          <p className="text-earth/60 text-sm font-medium">{description}</p>
        </div>
        <button
          onClick={copy}
          className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-earth/60 transition-all flex-shrink-0 logo-clay active:scale-90 active:bg-brand-muted active:text-brand"
          title="Copy JSON"
        >
          {copied ? (
            <span className="material-symbols-outlined text-brand">check</span>
          ) : (
            <span className="material-symbols-outlined">content_copy</span>
          )}
        </button>
      </div>

      <div className="clay-input !bg-[#2d3a23] !p-6 overflow-auto flex-grow relative custom-scroll ring-inset ring-4 ring-black/10">
        <pre className="text-[#CEDEBD] font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
          {jsonStr}
        </pre>
      </div>

      <StructuredFieldsView data={data} />
    </div>
  )
}

export function ResultPanel({ note, onUploadAnother }: ResultPanelProps) {
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a')
  const schemaB = note.structured_schema_b as Record<string, unknown> | null
  const isNonAgri = schemaB?.agri_relevant === false
  const nonAgriReason = schemaB?.rejection_reason as string | null

  const tabClass = (tab: 'a' | 'b') =>
    tab === activeTab
      ? 'clay-button px-6 py-3 font-bold !rounded-xl'
      : 'clay-button-secondary px-6 py-3 font-bold !rounded-xl'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12 animate-slide-up pb-12">
      {isNonAgri && (
        <div className="col-span-12 p-5 clay-card-light bg-amber-50/50 flex items-start gap-4 animate-fade-in ring-2 ring-amber-200/50">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 logo-clay">
            <span className="material-symbols-outlined">agriculture</span>
          </div>
          <div>
            <h4 className="font-extrabold text-amber-800 text-sm">Non-Agricultural Content Detected</h4>
            <p className="text-amber-700/80 text-sm mt-1 font-medium">
              {nonAgriReason || 'This recording does not appear to be related to agricultural or field operations.'}
              {' '}The note has been processed and stored as a general note.
            </p>
          </div>
        </div>
      )}
      {/* Left Side: Transcript */}
      <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
        <div className="clay-card-light p-8 pb-10 flex-col flex gap-6">
          <div className="flex justify-between items-center w-full pb-4 border-b border-[#e5e1d8]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f0f7ed] flex items-center justify-center text-primary logo-clay">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                 </svg>
              </div>
              <h2 className="text-xl font-extrabold text-earth">Transcript</h2>
            </div>
          </div>

          <div
            className="p-6 clay-input font-fraunces text-lg leading-relaxed italic !bg-transparent"
          >
            {note.transcript
              ? `"${note.transcript}"`
              : <span className="text-earth/40 not-italic font-manrope">No transcript captured</span>
            }
          </div>

          <div className="flex flex-wrap gap-4 pt-4 text-[10px] text-earth/50 font-black uppercase tracking-widest items-center">
            {note.audio_duration_seconds && (
              <span>Duration: {formatDuration(note.audio_duration_seconds)}</span>
            )}
            <span>·</span>
            <span>Processed in {formatPipelineMs(note.pipeline_duration_ms)}</span>
          </div>

          <button
            onClick={onUploadAnother}
            className="clay-button w-full py-5 font-extrabold text-lg mt-4"
          >
            <span className="material-symbols-outlined">add</span>
            Upload Another
          </button>
        </div>
      </div>

      {/* Right Size: Multi-Schema Results */}
      <div className="col-span-1 lg:col-span-7 flex flex-col h-full pl-0 lg:pl-6 border-l-0 lg:border-l border-[#e5e1d8]/30">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button className={tabClass('a')} onClick={() => setActiveTab('a')}>
             <span className="material-symbols-outlined text-[20px]">list_alt</span>
            Schema A
          </button>
          <button className={tabClass('b')} onClick={() => setActiveTab('b')}>
            <span className="material-symbols-outlined text-[20px]">psychology</span>
            Schema B
          </button>
        </div>

        {activeTab === 'a' ? (
          <JsonViewer 
            data={note.structured_schema_a} 
            title="Predefined Schema" 
            description="Mapped agricultural parameters." 
          />
        ) : (
          <JsonViewer 
            data={note.structured_schema_b} 
            title="Dynamic Insights" 
            description="AI-extracted free-form patterns." 
          />
        )}
      </div>
    </div>
  )
}

function StructuredFieldsView({ data }: { data: Record<string, unknown> }) {
  const SKIP = ['type', 'tags', 'agri_relevant', 'rejection_reason']
  const entries = Object.entries(data).filter(
    ([k, v]) => !SKIP.includes(k) && v !== null && v !== undefined && v !== ''
  )

  if (!entries.length) return null

  return (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key} className="p-3 bg-[#f0f7ed] rounded-xl logo-clay">
          <div className="text-[9px] font-black text-primary uppercase tracking-tighter mb-1 opacity-60">
            {key.replace(/_/g, ' ')}
          </div>
          <div className="text-[11px] font-extrabold text-earth truncate">
            {Array.isArray(value)
              ? value.join(', ')
              : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)}
          </div>
        </div>
      ))}
    </div>
  )
}
