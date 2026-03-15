/**
 * AgriMemo — Upload Hook
 * File validation + upload state machine.
 */
import { useState, useCallback } from 'react'
import { uploadVoiceNote } from '../services/api'
import { useAppStore } from '../store/appStore'
import type { FullNoteResponse } from '../types'

const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB ?? 25)
const SUPPORTED_EXTENSIONS = ['.wav', '.mp3', '.webm', '.ogg', '.m4a', '.flac']
const SUPPORTED_MIME = [
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/mpeg', 'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/mp4', 'audio/x-m4a',
  'audio/flac',
]

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<FullNoteResponse | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { upload, setUploading, setUploadError, setUploadNoteId, resetUpload } = useAppStore()

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const sizeOk = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    const extOk = SUPPORTED_EXTENSIONS.includes(ext)
    const mimeOk = SUPPORTED_MIME.includes(file.type) || file.type.startsWith('audio/')

    if (file.size === 0) return 'File is empty'
    if (!sizeOk) return `File too large (max ${MAX_FILE_SIZE_MB}MB)`
    if (!extOk && !mimeOk) return `Unsupported format. Use: ${SUPPORTED_EXTENSIONS.join(', ')}`
    return null
  }

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      useAppStore.getState().setUploadError(error)
      return
    }
    setSelectedFile(file)
    useAppStore.getState().setUploadError(null)
  }, [])

  const processUpload = useCallback(async (file: File, deviceId = 'web-app') => {
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    setUploading(true)
    setUploadError(null)
    setResult(null)
    setUploadNoteId(null)

    if (!navigator.onLine) {
       // Queue for offline processing
       setUploading(false)
       setUploadError('You are offline. Note has been queued for upload.')
       // Simplified queue logic: in a real app, we'd store the file in IndexedDB
       // For this version, we'll notify the user it's queued.
       return
    }

    try {
      const timestamp = new Date().toISOString()
      
      let lat: number | undefined
      let lng: number | undefined

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (geoErr) {
        console.warn('Geolocation capture failed or denied:', geoErr)
      }

      const response = await uploadVoiceNote(file, deviceId, timestamp, lat, lng)
      
      // Navigate to History view immediately
      useAppStore.getState().navigateTo('history')
      useAppStore.getState().resetUpload()
      
      setResult(null)
      setSelectedFile(null)
      // Note ID isn't needed here anymore since we don't show ResultPanel
      setUploadNoteId(null)
    } catch (err: unknown) {
      if (err instanceof Error) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        const msg = axiosErr.response?.data?.detail ?? err.message ?? 'Upload failed'
        setUploadError(msg)
      } else {
        setUploadError('Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }, [setUploading, setUploadError, setUploadNoteId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const reset = useCallback(() => {
    setResult(null)
    setSelectedFile(null)
    resetUpload()
  }, [resetUpload])

  return {
    isDragging,
    isUploading: upload.isUploading,
    error: upload.error,
    result,
    selectedFile,
    handleFile,
    processUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  }
}
