import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'
import LogEntryCard from '../components/ui/LogEntryCard'

const statusConfig = {
  green:  { label: 'Good day',   bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500',  text: 'text-green-700' },
  yellow: { label: 'Okay day',   bg: 'bg-amber-light', border: 'border-amber',    dot: 'bg-amber',      text: 'text-amber' },
  red:    { label: 'Tough day',  bg: 'bg-rose-light', border: 'border-rose',      dot: 'bg-rose',       text: 'text-rose' },
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
        <div className="text-4xl mb-4">🌿</div>
        <h2 className="text-lg font-semibold text-charcoal mb-2">Welcome to CareCircle</h2>
        <p className="text-mid text-sm mb-6 max-w-xs">
          Set up your care circle so the whole family can stay in sync.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-sage text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-sage-light transition-colors"
        >
          Set Up Your Circle
        </button>
      </div>
    )
  }

  const sc = todayStatus ? statusConfig[todayStatus.status] : null

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-charcoal">
          {recipient ? `Caring for ${recipient.full_name}` : 'Home'}
        </h1>
        <p className="text-sm text-mid mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's status card */}
      <div
        className={`rounded-2xl border p-4 ${sc ? `${sc.bg} ${sc.border}` : 'bg-white border-border'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sc ? (
              <>
                <span className={`w-3 h-3 rounded-full ${sc.dot}`} />
                <span className={`font-medium text-sm ${sc.text}`}>{sc.label}</span>
                {todayStatus.note && (
                  <span className="text-xs text-mid ml-1">— {todayStatus.note}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-mid">No check-in today</span>
            )}
          </div>
          <button
            onClick={() => navigate('/status')}
            className="text-xs text-sage font-medium hover:underline"
          >
            {sc ? 'Update' : 'Check in'}
          </button>
        </div>
      </div>

      {/* Catch Me Up */}
      <button
        onClick={handleCatchUp}
        className="w-full flex items-center justify-center gap-2 bg-white border border-border rounded-2xl py-3 px-4 text-sm font-medium text-charcoal hover:bg-cream transition-colors shadow-sm"
      >
        <Sparkles size={16} className="text-sage" />
        Catch Me Up
      </button>

      {/* Catch Me Up Modal */}
      {catchUpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={() => setCatchUpOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-charcoal flex items-center gap-2">
                <Sparkles size={16} className="text-sage" /> Last 14 days
              </h2>
              <button onClick={() => setCatchUpOpen(false)} className="text-mid hover:text-charcoal">
                <X size={18} />
              </button>
            </div>
            {catchUpLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{catchUpText}</p>
            )}
          </div>
        </div>
      )}

      {/* Recent entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-charcoal text-sm">Recent Updates</h2>
          <button onClick={() => navigate('/log')} className="text-xs text-sage hover:underline">See all</button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-border" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-mid">No entries yet.</p>
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

      {/* FAB */}
      <button
        onClick={() => navigate('/log/new')}
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 w-14 h-14 bg-sage text-white rounded-full shadow-lg flex items-center justify-center hover:bg-sage-light transition-colors z-30"
        aria-label="Add log entry"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
