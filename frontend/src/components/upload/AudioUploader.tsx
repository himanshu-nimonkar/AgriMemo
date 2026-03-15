import { useRef } from 'react'
import { useUpload } from '../../hooks/useUpload'
import { PipelineStatus } from '../pipeline/PipelineStatus'
import { ResultPanel } from '../pipeline/ResultPanel'

export function AudioUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    isDragging,
    isUploading,
    error,
    result,
    selectedFile,
    handleFile,
    processUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
  } = useUpload()

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleProcessClick = () => {
    if (selectedFile) processUpload(selectedFile)
  }

  if (result) {
    return (
      <div className="max-w-6xl mx-auto px-4 w-full animate-slide-up">
        <PipelineStatus status={result.status} />
        <ResultPanel note={result} onUploadAnother={reset} />
      </div>
    )
  }

  return (
    <div className="flex-grow flex items-center justify-center p-6 lg:p-12 animate-fade-in w-full">
      <div className="max-w-5xl w-full" data-purpose="upload-container">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-[#2d3a23]">
            Convert Field Notes <span className="text-brand">to Insights</span>
          </h1>
          <p className="text-earth/60 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            Capture your voice in the field. Let AgriMemo handle the documentation, instantly.
          </p>
        </div>

        <section className="clay-card p-4 md:p-6 rounded-[40px]" data-purpose="main-upload-area">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`clay-drop-zone rounded-[32px] py-16 md:py-20 px-6 md:px-10 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden transition-all duration-400 ease-in-out ${
               isDragging ? 'drag-active bg-[#b8cc9f] border-brand' : 'bg-stone border-[3px] border-dashed border-sage'
            } ${!selectedFile ? 'animate-breathing' : ''}`}
            style={{
               boxShadow: 'inset 8px 8px 16px rgba(0, 0, 0, 0.04), inset -8px -8px 16px rgba(255, 255, 255, 0.6)'
            }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-md group-hover:scale-110 transition-transform duration-500 logo-clay z-10"
                 style={{ boxShadow: 'inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.4)' }}
            >
              {isUploading ? (
                <span className="material-symbols-outlined text-brand text-5xl animate-spin">sync</span>
              ) : selectedFile ? (
                <span className="material-symbols-outlined text-brand text-5xl">inventory_2</span>
              ) : (
                <span className="material-symbols-outlined text-brand text-5xl">cloud_upload</span>
              )}
            </div>

            <div className="text-center space-y-3 mb-10 z-10">
              {selectedFile ? (
                <>
                  <h2 className="text-3xl font-extrabold text-brand truncate max-w-lg">
                    {selectedFile.name}
                  </h2>
                  <p className="text-earth/60 font-semibold">
                    Ready to process
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-extrabold text-earth">
                    {isDragging ? 'Release to upload' : 'Drop your audio file here'}
                  </h2>
                  <p className="text-earth/60 font-semibold">
                    Supports MP3, WAV, and M4A up to 25MB
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-4 z-10 flex-col md:flex-row w-full md:w-auto items-center">
              {selectedFile ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleProcessClick() }}
                    disabled={isUploading}
                    className="clay-button px-10 py-5 rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 w-full md:w-auto disabled:opacity-70 disabled:cursor-not-allowed text-white bg-brand transition-all hover:-translate-y-0.5"
                    style={{boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.2), inset 4px 4px 8px rgba(255, 255, 255, 0.3)'}}
                  >
                    {isUploading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span> Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">manufacturing</span> Process Note
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); fileInputRef.current?.click() }}
                    disabled={isUploading}
                    className="px-6 py-5 text-earth/60 bg-white/60 hover:bg-white rounded-2xl font-bold transition-all text-sm w-full md:w-auto disabled:opacity-50"
                  >
                    Change file
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                  className="clay-button px-10 py-5 rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 w-full md:w-auto text-white bg-brand transition-all hover:-translate-y-0.5"
                  style={{boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(0, 0, 0, 0.2), inset 4px 4px 8px rgba(255, 255, 255, 0.3)'}}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Select Audio File
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-6 p-4 bg-terracotta/10 border border-terracotta/20 rounded-2xl text-terracotta text-sm font-bold animate-fade-in z-10 w-full max-w-lg text-center shadow-sm">
                <span className="material-symbols-outlined text-sm">report</span> {error}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-0">
            <div className="p-6 text-center">
              <div className="text-brand font-extrabold text-3xl mb-1">99%</div>
              <p className="text-[10px] font-extrabold text-earth/30 uppercase tracking-[0.2em]">Speech Accuracy</p>
            </div>
            <div className="p-6 text-center border-y md:border-y-0 md:border-x border-earth/5">
              <div className="text-brand font-extrabold text-3xl mb-1">Instant</div>
              <p className="text-[10px] font-extrabold text-earth/30 uppercase tracking-[0.2em]">Cloud Processing</p>
            </div>
            <div className="p-6 text-center">
              <div className="text-brand font-extrabold text-3xl mb-1">Secure</div>
              <p className="text-[10px] font-extrabold text-earth/30 uppercase tracking-[0.2em]">End-to-End Privacy</p>
            </div>
          </div>
        </section>

        <div className="mt-12 text-center opacity-60 flex items-center justify-center gap-8 grayscale brightness-110">
          <span className="text-sm font-bold uppercase tracking-widest text-earth/40">Trusted by modern growers worldwide</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac,.webm"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  )
}
