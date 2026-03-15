/**
 * AgriMemo — Root App Component
 */
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
  const { view } = useAppStore()

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
