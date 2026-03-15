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
      <div className="clay-card-light bg-white rounded-[32px] p-8 flex-grow flex flex-col justify-center items-center text-earth/40 text-sm font-medium text-center">
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
    <div className="clay-card-light bg-white rounded-[32px] p-8 flex-grow flex flex-col h-full max-h-[600px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-earth text-xl mb-1">{title}</h3>
          <p className="text-earth/60 text-sm font-medium">{description}</p>
        </div>
        <button
          onClick={copy}
          className="w-10 h-10 rounded-full bg-[#f2f0eb] hover:bg-[#e5e1d8] flex items-center justify-center text-earth/60 transition-colors flex-shrink-0"
          title="Copy JSON"
        >
          {copied ? (
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
             </svg>
          )}
        </button>
      </div>

      <div className="bg-[#2d3a23] rounded-2xl p-6 overflow-auto flex-grow relative inner-soft-glow custom-scroll">
        <pre className="text-[#CEDEBD] font-mono text-sm leading-relaxed">
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
      ? 'bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-clay-sm flex items-center gap-2 outline-none'
      : 'bg-transparent text-earth/60 hover:text-earth px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border border-transparent hover:border-[#e5e1d8] hover:bg-white outline-none'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12 animate-slide-up pb-12">
      {isNonAgri && (
        <div className="col-span-12 p-5 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-4 animate-fade-in shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
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
        <div className="clay-card-light bg-white rounded-[32px] p-8 pb-10 flex-col flex gap-6">
          <div className="flex justify-between items-center w-full pb-4 border-b border-[#e5e1d8]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f0f7ed] flex items-center justify-center text-primary">
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                 </svg>
              </div>
              <h2 className="text-xl font-extrabold text-earth">Transcript</h2>
            </div>
            <div className="flex gap-2">
              {note.low_confidence && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                  <span className="material-symbols-outlined text-sm">report</span> Low Confidence
                </span>
              )}
              {note.transcript_confidence !== undefined && (
                <span className="px-3 py-1 bg-[#f0f7ed] text-[#2d7a0e] text-xs font-bold rounded-full border border-primary/20">
                  {formatConfidence(note.transcript_confidence)}
                </span>
              )}
            </div>
          </div>

          <div
            className="p-6 rounded-2xl text-earth font-fraunces text-lg leading-relaxed italic"
            style={{ background: 'linear-gradient(135deg, #f7f8f6 0%, #f2f0eb 100%)', border: '1px solid #e5e1d8' }}
          >
            {note.transcript
              ? `"${note.transcript}"`
              : <span className="text-earth/40 not-italic font-manrope">No transcript captured</span>
            }
          </div>

          <div className="flex flex-wrap gap-4 pt-4 text-xs text-earth/50 font-medium items-center">
            {note.audio_duration_seconds && (
              <span>Duration: {formatDuration(note.audio_duration_seconds)}</span>
            )}
            <span>·</span>
            <span>Processed in {formatPipelineMs(note.pipeline_duration_ms)}</span>
            
            {note.note_type && (
              <>
                <span>·</span>
                <span className={`px-3 py-1 rounded-full border text-xs font-bold bg-[#f7f8f6] ${getNoteTypeColor(note.note_type)}`}>
                  {note.note_type.replace(/_/g, ' ')}
                </span>
              </>
            )}
          </div>

          {note.is_duplicate && (
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 font-medium flex items-start gap-3">
              <span className="material-symbols-outlined text-sm">report</span>
              <div>
                Duplicate submission detected.
                {note.duplicate_of && <span className="block opacity-70 mt-1 text-xs">(Ref: {note.duplicate_of})</span>}
              </div>
            </div>
          )}

          {note.errors.length > 0 && (
            <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 space-y-1">
              {note.errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>

        <button
          onClick={onUploadAnother}
          className="clay-button w-full py-5 rounded-2xl font-extrabold text-lg flex justify-center items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Another Note
        </button>
      </div>

      {/* Right Size: Multi-Schema Results */}
      <div className="col-span-1 lg:col-span-7 flex flex-col h-full pl-0 lg:pl-6 border-l-0 lg:border-l border-[#e5e1d8]">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button className={tabClass('a')} onClick={() => setActiveTab('a')}>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
             </svg>
            Schema A Output
          </button>
          <button className={tabClass('b')} onClick={() => setActiveTab('b')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Schema B Generation
          </button>
        </div>

        {activeTab === 'a' ? (
          <JsonViewer 
            data={note.structured_schema_a} 
            title="Predefined Field Schema" 
            description="Mapped to expected agricultural parameters." 
          />
        ) : (
          <JsonViewer 
            data={note.structured_schema_b} 
            title="AI-Generated Dynamic Output" 
            description="Free-form extraction for unrecognized patterns." 
          />
        )}
      </div>
    </div>
  )
}

function StructuredFieldsView({ data }: { data: Record<string, unknown> }) {
  const SKIP = ['type', 'tags']
  const entries = Object.entries(data).filter(
    ([k, v]) => !SKIP.includes(k) && v !== null && v !== undefined && v !== ''
  )

  if (!entries.length) return null

  return (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key} className="p-4 bg-[#f0f7ed] rounded-xl border border-primary/10">
          <div className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-1">
            {key.replace(/_/g, ' ')}
          </div>
          <div className="text-sm font-bold text-earth truncate">
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
