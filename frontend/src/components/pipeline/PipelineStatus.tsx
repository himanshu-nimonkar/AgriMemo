import type { NoteStatus } from '../../types'

const PIPELINE_STEPS: { status: NoteStatus; label: string; }[] = [
  { status: 'received', label: 'Received' },
  { status: 'transcribing', label: 'Transcribing' },
  { status: 'structuring', label: 'Structuring' },
  { status: 'stored', label: 'Saving' },
]

const STATUS_ORDER: NoteStatus[] = [
  'received', 'transcribing', 'transcribed', 'structuring', 'structured', 'stored'
]

function getStepState(stepStatus: NoteStatus, currentStatus: NoteStatus): 'complete' | 'active' | 'pending' {
  if (currentStatus === 'failed') return 'pending'
  const stepIdx = STATUS_ORDER.indexOf(stepStatus)
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  
  if (currentIdx > stepIdx) return 'complete'
  if (currentIdx === stepIdx) {
     if (stepStatus === 'stored') return 'complete' 
     return 'active'
  }
  
  if (stepStatus === 'transcribing' && currentIdx >= STATUS_ORDER.indexOf('transcribed')) return 'complete'
  if (stepStatus === 'structuring' && currentIdx >= STATUS_ORDER.indexOf('structured')) return 'complete'
  if (stepStatus === 'transcribing' && currentStatus === 'transcribing') return 'active'
  if (stepStatus === 'structuring' && currentStatus === 'structuring') return 'active'

  return 'pending'
}

export function PipelineStatus({ status }: { status: NoteStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(status)
  const progressPct = Math.max(
    0,
    Math.min(100, (currentIdx / (STATUS_ORDER.length - 1)) * 100)
  )

  return (
    <section className="mb-16 mt-8" data-purpose="pipeline-status-container">
      <div className="flex justify-between items-center max-w-4xl mx-auto relative px-4">
        {/* Connecting Line */}
        <div className="absolute top-6 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-1000 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {PIPELINE_STEPS.map((step) => {
          const state = getStepState(step.status, status)
          
          return (
            <div key={step.status} className="flex flex-col items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                  ${state === 'complete' || state === 'active'
                    ? 'bg-brand text-white shadow-glow border-4 border-brand-light'
                    : 'bg-white border-4 border-slate-200 text-slate-300'
                  }
                  ${state === 'active' ? 'animate-glow' : ''}
                `}
              >
                {state === 'complete' ? (
                  <span className="material-symbols-outlined text-xl">check</span>
                ) : state === 'active' ? (
                  <span className="material-symbols-outlined text-xl animate-pulse">more_horiz</span>
                ) : (
                  <span className="material-symbols-outlined text-xl">circle</span>
                )}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${state === 'pending' ? 'text-slate-400' : 'text-moss'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
