import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format, subDays, parseISO } from 'date-fns'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const OPTIONS = [
  { value: 'green',  label: 'Good Day',  emoji: '😊', bg: 'bg-green-50',   border: 'border-green-300',  dot: 'bg-green-500',  activeBg: 'bg-green-500',  activeText: 'text-white' },
  { value: 'yellow', label: 'Okay Day',  emoji: '😐', bg: 'bg-amber-light', border: 'border-amber',      dot: 'bg-amber',      activeBg: 'bg-amber',      activeText: 'text-white' },
  { value: 'red',    label: 'Tough Day', emoji: '😔', bg: 'bg-rose-light',  border: 'border-rose',       dot: 'bg-rose',       activeBg: 'bg-rose',       activeText: 'text-white' },
]

const DOT_COLORS = { green: 'bg-green-400', yellow: 'bg-amber', red: 'bg-rose' }

export default function Status() {
  const { recipient, userRole } = useCircle()
  const navigate = useNavigate()
  const [todayStatus, setTodayStatus] = useState(null)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)

  const canEdit = userRole === 'admin' || userRole === 'contributor'

  const load = useCallback(async () => {
    if (!recipient) return
    const [todayRes, histRes] = await Promise.all([
      api.get(`/status/today?recipient_id=${recipient.id}`).catch(() => ({ data: { status: null } })),
      api.get(`/status/history?recipient_id=${recipient.id}&days=30`).catch(() => ({ data: { history: [] } })),
    ])
    const today = todayRes.data.status
    setTodayStatus(today)
    if (today) { setSelected(today.status); setNote(today.note || '') }
    setHistory(histRes.data.history || [])
  }, [recipient])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!selected || !recipient) return
    setSaving(true)
    try {
      const { data } = await api.post('/status', { recipient_id: recipient.id, status: selected, note: note.trim() || null })
      setTodayStatus(data.status)
      toast.success('Status saved')
      load()
    } catch { toast.error('Failed to save status') }
    finally { setSaving(false) }
  }

  if (!recipient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mid text-sm">Set up your care circle first.</p>
        <button onClick={() => navigate('/onboarding')} className="text-sage text-sm mt-2 hover:underline">Get started</button>
      </div>
    )
  }

  // Build last 30 days array for history dots
  const today = new Date()
  const historyMap = Object.fromEntries(history.map((h) => [h.status_date, h.status]))
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i)
    const key = format(d, 'yyyy-MM-dd')
    return { date: key, status: historyMap[key] || null }
  })

  return (
    <div className="p-4 lg:p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-charcoal mb-1">Daily Status</h1>
      <p className="text-sm text-mid mb-6">
        {format(today, 'EEEE, MMMM d')}
      </p>

      {/* Three big tap targets */}
      <div className="space-y-3 mb-5">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => canEdit && setSelected(opt.value)}
              disabled={!canEdit}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? `${opt.activeBg} ${opt.activeText} border-transparent shadow-md scale-[1.01]`
                  : `${opt.bg} ${opt.border} text-charcoal hover:scale-[1.005]`
              } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div className="text-left">
                <p className={`font-semibold ${isSelected ? 'text-white' : ''}`}>{opt.label}</p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-mid'}`}>
                  {opt.value === 'green' && 'Feeling well, normal routine'}
                  {opt.value === 'yellow' && 'Some concerns, monitoring'}
                  {opt.value === 'red' && 'Needs extra attention today'}
                </p>
              </div>
              {isSelected && <span className="ml-auto text-white text-lg">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Optional note */}
      {canEdit && selected && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-mid mb-1.5 uppercase tracking-wide">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Any details worth noting…"
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-sage resize-none"
          />
        </div>
      )}

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full bg-sage text-white py-3 rounded-xl font-medium text-sm hover:bg-sage-light disabled:opacity-50 transition-colors mb-8"
        >
          {saving ? 'Saving…' : todayStatus ? 'Update Status' : 'Save Status'}
        </button>
      )}

      {/* 30-day history dots */}
      <div>
        <h2 className="text-xs font-medium text-mid uppercase tracking-wide mb-3">Last 30 Days</h2>
        <div className="flex gap-1.5 flex-wrap">
          {last30.map(({ date, status }) => (
            <div
              key={date}
              title={`${date}${status ? ` — ${status}` : ''}`}
              className={`w-5 h-5 rounded-full border border-border ${
                status ? DOT_COLORS[status] : 'bg-cream-dark'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {Object.entries(DOT_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${c}`} />
              <span className="text-xs text-mid capitalize">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cream-dark border border-border" />
            <span className="text-xs text-mid">No entry</span>
          </div>
        </div>
      </div>
    </div>
  )
}
