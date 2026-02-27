import { Outlet, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useCircle } from '../../context/CircleContext'
import { useRealtime } from '../../hooks/useRealtime'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

// Inner shell — rendered after CircleProvider is mounted
function ShellInner() {
  const { user } = useAuth()
  const { recipient } = useCircle()

  // Spec §7: subscribe to realtime events for the active circle
  useRealtime({
    recipientId: recipient?.id ?? null,
    onNewEntry: (entry) => {
      if (entry.author_id !== user?.id) {
        toast('New care log entry added', {
          icon: '📝',
          style: { background: '#2c2c2c', color: '#f7f4ef' },
        })
      }
    },
    onStatusChange: () => {
      // Status updates are reflected on next page load
    },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export default function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <ShellInner />
}
