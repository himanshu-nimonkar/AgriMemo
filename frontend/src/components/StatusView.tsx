/**
 * AgriMemo — System Status View
 * Shows backend health, provider config, and store stats.
 */
import { useQuery } from '@tanstack/react-query'
import { getHealth, getProvider } from '../services/api'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex w-3 h-3 justify-center items-center">
      {ok && <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-40 animate-ping"></span>}
      <span className={`relative inline-flex rounded-full w-2 h-2 ${ok ? 'bg-primary' : 'bg-red-500'}`}></span>
    </span>
  )
}

function StatCard({ label, value, ok, subtext }: { label: string; value: string; ok?: boolean, subtext?: string }) {
  return (
    <div className="clay-card-light bg-white rounded-[24px] p-6 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
          ok === true ? 'bg-[#f0f7ed] text-primary group-hover:bg-primary group-hover:text-white' : 
          ok === false ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 
          'bg-[#f2f0eb] text-earth/60 group-hover:bg-[#e5e1d8]'
        }`}>
          {ok === undefined ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : ok ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div>
          <h4 className="text-base font-extrabold text-[#2d3a23] leading-tight mb-1">{label}</h4>
          {subtext && <p className="text-xs font-bold text-earth/50 uppercase tracking-widest">{subtext}</p>}
        </div>
      </div>
      <div className="text-right">
        {ok !== undefined && (
           <div className="flex justify-end mb-1">
             <StatusDot ok={ok} />
           </div>
        )}
        <div className={`text-sm font-extrabold pb-0.5 ${
          ok === true ? 'text-primary' : 
          ok === false ? 'text-red-500' : 
          'text-earth/60'
        }`}>{value}</div>
      </div>
    </div>
  )
}

export function StatusView() {
  const { data: health, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15_000,
  })
  const { data: provider, isLoading: provLoading } = useQuery({
    queryKey: ['provider'],
    queryFn: getProvider,
    staleTime: 60_000,
  })

  const isHealthy = health?.status === 'healthy'
  const isDegraded = health?.status === 'degraded'

  const statusColor =
    health?.status === 'healthy' ? 'text-primary' :
    health?.status === 'degraded' ? 'text-amber-500' : 'text-red-500'

  const statusBg =
    health?.status === 'healthy' ? 'bg-white border-[#f0f7ed]' :
    health?.status === 'degraded' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  const iconBg =
    health?.status === 'healthy' ? 'bg-[#f0f7ed] text-primary' :
    health?.status === 'degraded' ? 'bg-amber-200 text-amber-700' : 'bg-red-200 text-red-700'

  const formatUptime = (sec?: number) => {
    if (!sec) return '—'
    if (sec < 60) return `${Math.round(sec)}s`
    if (sec < 3600) return `${Math.round(sec / 60)}min`
    return `${(sec / 3600).toFixed(1)}hr`
  }

  return (
    <div className="flex-grow p-6 lg:p-8 overflow-y-auto animate-slide-up custom-scroll">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#2d3a23] mb-2">System Status</h1>
          <p className="text-earth/60 font-medium">Real-time health of AgriMemo infrastructure and services.</p>
        </div>

        {/* Error Alert */}
        {healthError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-4 text-red-700">
            <span className="material-symbols-outlined">error</span>
            <div className="text-sm font-bold">
              Failed to connect to backend: {(healthError as any).message || 'Unknown error'}
              <br/>
              <span className="text-[10px] opacity-70 uppercase tracking-tighter">Check if backend is running on http://localhost:8000</span>
            </div>
          </div>
        )}

        {/* Overall Health Banner */}
        <div className={`clay-card-light rounded-[32px] p-6 lg:p-8 flex flex-col md:flex-row items-center gap-6 border-2 ${statusBg}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 relative ${iconBg}`}>
            {isHealthy && <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping opacity-20"></div>}
            {healthLoading ? (
               <div className="w-8 h-8 border-4 border-earth/20 border-t-primary rounded-full animate-spin"></div>
            ) : isHealthy ? (
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : isDegraded ? (
              <span className="text-3xl font-black">⚠</span>
            ) : (
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="text-center md:text-left flex-grow">
            <h2 className={`text-3xl font-black mb-1 ${statusColor}`}>
              {healthLoading ? 'Checking...' : isHealthy ? 'All Systems Operational' : isDegraded ? 'Service Degraded' : 'System Offline'}
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <span className="px-3 py-1 bg-[#f2f0eb] rounded-lg text-earth/60 text-xs font-bold uppercase tracking-widest border border-[#e5e1d8]">
                {health ? `v${health.version}` : 'v--'}
              </span>
              <span className="px-3 py-1 bg-[#f2f0eb] rounded-lg text-earth/60 text-xs font-bold uppercase tracking-widest border border-[#e5e1d8]">
                {health ? health.environment : '---'}
              </span>
            </div>
          </div>
          {health && (
            <div className={`text-center md:text-right shrink-0 mt-4 md:mt-0 px-8 py-4 rounded-2xl border ${isHealthy ? 'bg-[#f0f7ed] border-primary/10' : 'bg-white border-[#e5e1d8]'}`}>
              <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isHealthy ? 'text-primary' : 'text-earth/50'}`}>Uptime</div>
              <div className="text-2xl font-black text-[#2d3a23]">{formatUptime(health.uptime_seconds)}</div>
            </div>
          )}
        </div>

        {/* Service checks */}
        {health && (
          <div>
            <h3 className="text-sm font-extrabold text-earth/40 uppercase tracking-widest mb-4 pl-2">Core Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                label="Deepgram API"
                subtext="Speech-to-Text inference"
                value={health.deepgram_available ? 'Online' : 'Offline'}
                ok={health.deepgram_available}
              />
              <StatCard
                label="Cloudflare Workers AI"
                subtext="LLM Structure extraction"
                value={health.cloudflare_ai_available ? 'Online' : 'Offline'}
                ok={health.cloudflare_ai_available}
              />
              <StatCard
                label="JSON File Storage"
                subtext="Persistent data layer"
                value={health.json_store_available ? 'Writable' : 'Error'}
                ok={health.json_store_available}
              />
              <StatCard
                label="In-Memory Cache"
                subtext="Fast transient storage"
                value={health.memory_store_available ? 'Active' : 'Error'}
                ok={health.memory_store_available}
              />
            </div>
          </div>
        )}

        {/* Provider info */}
        {provider && (
          <div>
            <h3 className="text-sm font-extrabold text-earth/40 uppercase tracking-widest mb-4 pl-2 mt-8">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Model" subtext={provider.provider} value={provider.model} />
              <StatCard label="Language Focus" subtext="ASR Param" value={provider.language.toUpperCase()} />
              <StatCard label="Smart Formatting" subtext="Punctuation" value={provider.smart_format ? 'Enabled' : 'Disabled'} />
              <StatCard label="Confidence Req." subtext="Threshold" value={`${Math.round(provider.confidence_threshold * 100)}%`} />
              <StatCard label="Processing Retries" subtext="Max attempts" value={String(provider.max_retries)} />
              <StatCard label="Setup Status" subtext="Provider keys" value={provider.configured ? 'Configured' : 'Missing'} />
            </div>
          </div>
        )}

        {(healthLoading || provLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white border border-[#e5e1d8] rounded-[24px] h-28 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
