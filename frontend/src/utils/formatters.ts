/**
 * AgriMemo — Utility Formatters
 */

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function formatPipelineMs(ms?: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatConfidence(confidence?: number): string {
  if (confidence === undefined || confidence === null) return '—'
  return `${Math.round(confidence * 100)}%`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function getNoteTypeColor(type?: string): string {
  const colors: Record<string, string> = {
    task: 'bg-blue-100 text-blue-700 border-blue-200',
    observation: 'bg-amber-100 text-amber-700 border-amber-200',
    reminder: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scheduling: 'bg-purple-100 text-purple-700 border-purple-200',
    field_observation: 'bg-teal-100 text-teal-700 border-teal-200',
    note: 'bg-stone-100 text-stone-600 border-stone-200',
  }
  return colors[type || ''] ?? 'bg-sage/20 text-earth border-sage/30'
}

export function getNoteTypeIcon(type?: string): string {
  const icons: Record<string, string> = {
    task: '✓',
    observation: '◉',
    reminder: '◷',
    scheduling: '◫',
    field_observation: '⬡',
    note: '◎',
  }
  return icons[type || ''] ?? '○'
}
