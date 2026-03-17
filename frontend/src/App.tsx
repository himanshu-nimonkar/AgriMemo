/**
 * AgriMemo — Root App Component
 */
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout/Layout'
import { AudioUploader } from './components/upload/AudioUploader'
import { NotesList } from './components/notes/NotesList'
import { NoteDetail } from './components/notes/NoteDetail'
import { StatusView } from './components/StatusView'
import { useAppStore } from './store/appStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})



function AppContent() {
  const { view, setView } = useAppStore()

  useEffect(() => {
    const handleUrl = () => {
      const path = window.location.pathname.replace(/^\/|\/$/g, '')
      if (path === 'status') {
        setView('status')
      } else if (path === '') {
        // Only reset if it was specifically trying to go home, 
        // otherwise let store handle state
      }
    }

    handleUrl()
    window.addEventListener('popstate', handleUrl)
    return () => window.removeEventListener('popstate', handleUrl)
  }, [setView])

  return (
    <Layout>
      {view === 'upload' && <AudioUploader />}
      {view === 'history' && <NotesList />}
      {view === 'detail' && <NoteDetail />}
      {view === 'status' && <StatusView />}
    </Layout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
