import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import { useRealtime } from '../hooks/useRealtime'
import api from '../services/api'
import LogEntryCard from '../components/ui/LogEntryCard'

// Status display tokens — use new palette
const statusConfig = {
  green:  { label: 'Good day',  bg: 'bg-status-green/10',  border: 'border-status-green/30',  dot: 'bg-status-green',  text: 'text-status-green' },
  yellow: { label: 'Okay day',  bg: 'bg-status-yellow/10', border: 'border-status-yellow/30', dot: 'bg-status-yellow', text: 'text-status-yellow' },
  red:    { label: 'Tough day', bg: 'bg-status-red/10',    border: 'border-status-red/30',    dot: 'bg-status-red',    text: 'text-status-red' },
}

// Mini landscape for the hero card
function HeroLandscape() {
  return (
    <svg
      viewBox="0 0 400 70"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax slice"
      className="w-full block"
      aria-hidden="true"
    >
      <path d="M0 48 Q90 26 200 38 Q310 50 400 28 L400 70 L0 70 Z" fill="#2d4a6e" opacity="0.5" />
      <path d="M0 56 Q110 38 230 50 Q330 60 400 44 L400 70 L0 70 Z" fill="#1e3a4a" />
      <path d="M0 63 Q140 52 270 60 Q350 64 400 54 L400 70 L0 70 Z" fill="#152435" />
      <g fill="#0f1f30">
        <polygon points="20,58 28,42 36,58" />
        <polygon points="34,59 43,45 52,59" />
        <polygon points="318,50 327,34 336,50" />
        <polygon points="335,52 345,38 355,52" />
      </g>
    </svg>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { recipient, loading: circleLoading } = useCircle()
  const navigate = useNavigate()

  const [todayStatus, setTodayStatus] = useState(null)
  const [entries, setEntries] = useState([])
  const [catchUpOpen, setCatchUpOpen] = useState(false)
  const [catchUpText, setCatchUpText] = useState('')
  const [catchUpLoading, setCatchUpLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!recipient) return
    setLoading(true)
    try {
      const [statusRes, logRes] = await Promise.all([
        api.get(`/status/today?recipient_id=${recipient.id}`),
        api.get(`/log?recipient_id=${recipient.id}&limit=5`),
      ])
      setTodayStatus(statusRes.data.status)
      setEntries(logRes.data.entries || [])
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [recipient])

  useEffect(() => { load() }, [load])

  // Live updates — new entries and status changes from other circle members
  useRealtime({
    recipientId: recipient?.id,
    onNewEntry: useCallback((entry) => {
      // Ignore writes we made ourselves (already in local state)
      if (entry.author_id === user?.id) return
      setEntries((prev) => [entry, ...prev].slice(0, 5))
      toast('New update from your circle', { icon: '🔔' })
    }, [user?.id]),
    onStatusChange: useCallback((status) => {
      setTodayStatus(status)
    }, []),
  })

  async function handleCatchUp() {
    if (!recipient) return
    setCatchUpOpen(true)
    setCatchUpText('')
    setCatchUpLoading(true)
    try {
      const { data } = await api.post('/ai/catchup', { recipient_id: recipient.id })
      setCatchUpText(data.summary)
    } catch {
      setCatchUpText('Unable to generate summary right now. Please try again.')
    } finally {
      setCatchUpLoading(false)
    }
  }

  function handleEditEntry(entry) { navigate(`/log?edit=${entry.id}`) }
  async function handleDeleteEntry(entry) {
    if (!window.confirm('Delete this entry?')) return
    try {
      await api.delete(`/log/${entry.id}`)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      toast.success('Entry deleted')
    } catch { toast.error('Could not delete entry') }
  }

  // No circle yet
  if (!circleLoading && !recipient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="font-display text-2xl text-night mb-2">My CareCircle</p>
        <p className="text-mist text-sm mb-6 max-w-xs">
          Set up your care circle so the whole team can stay in sync.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-gradient-sage text-white px-8 py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity shadow-sage"
        >
          Set Up Your Circle
        </button>
      </div>
    )
  }

  const sc = todayStatus ? statusConfig[todayStatus.status] : null

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">

      {/* Hero card — night-sky gradient with landscape */}
      <div className="bg-gradient-night overflow-hidden">
        {/* Text area */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-mist text-xs font-medium uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="font-display text-2xl text-cloud font-medium leading-snug">
            {recipient ? `Caring for ${recipient.full_name}` : 'Home'}
          </h1>

          {/* Status row */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <div className="flex items-center gap-2">
              {sc ? (
                <>
                  <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                  <span className="text-sm text-cloud font-medium">{sc.label}</span>
                  {todayStatus.note && (
                    <span className="text-xs text-mist ml-0.5">— {todayStatus.note}</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-mist">No check-in today</span>
              )}
            </div>
            <button
              onClick={() => navigate('/status')}
              className="text-xs text-mist hover:text-cloud underline transition-colors"
            >
              {sc ? 'Update' : 'Check in'}
            </button>
          </div>
        </div>
        {/* SVG landscape at the bottom of the card */}
        <HeroLandscape />
      </div>

      {/* Page content */}
      <div className="px-4 lg:px-6 space-y-4">

        {/* Catch Me Up */}
        <button
          onClick={handleCatchUp}
          className="w-full flex items-center justify-center gap-2 bg-white rounded-card shadow-card py-3.5 px-4 text-sm font-medium text-night hover:shadow-card-md transition-shadow"
        >
          <Sparkles size={16} className="text-sage" />
          Catch Me Up
        </button>

        {/* Recent entries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-night text-sm">Recent Updates</h2>
            <button onClick={() => navigate('/log')} className="text-xs text-sage hover:underline">See all</button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-card animate-pulse shadow-card" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-6 text-center">
              <p className="text-sm text-mist">No entries yet.</p>
              <button onClick={() => navigate('/log/new')} className="text-sm text-sage mt-1 hover:underline">
                Add the first one
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <LogEntryCard
                  key={entry.id}
                  entry={entry}
                  currentUserId={user?.id}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catch Me Up — bottom sheet */}
      {catchUpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-night/50 backdrop-blur-sm"
            onClick={() => setCatchUpOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-sheet sm:rounded-card shadow-card-md">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-cloud rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-night flex items-center gap-2">
                <Sparkles size={16} className="text-sage" /> Last 14 days
              </h2>
              <button
                onClick={() => setCatchUpOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dawn text-mist transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {catchUpLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <p className="text-sm text-night leading-relaxed whitespace-pre-wrap">{catchUpText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/log/new')}
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 w-14 h-14 bg-gradient-sage text-white rounded-full shadow-sage flex items-center justify-center hover:opacity-90 transition-opacity z-30"
        aria-label="Add log entry"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
