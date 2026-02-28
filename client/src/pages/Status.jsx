import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format, subDays } from 'date-fns'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const OPTIONS = [
  {
    value: 'green',
    label: 'Good Day',
    emoji: '😊',
    bg: 'bg-status-green/8',
    border: 'border-status-green/30',
    dot: 'bg-status-green',
    activeBg: 'bg-status-green',
    activeText: 'text-white',
  },
  {
    value: 'yellow',
    label: 'Okay Day',
    emoji: '😐',
    bg: 'bg-status-yellow/8',
    border: 'border-status-yellow/30',
    dot: 'bg-status-yellow',
    activeBg: 'bg-status-yellow',
    activeText: 'text-white',
  },
  {
    value: 'red',
    label: 'Tough Day',
    emoji: '😔',
    bg: 'bg-status-red/8',
    border: 'border-status-red/30',
    dot: 'bg-status-red',
    activeBg: 'bg-status-red',
    activeText: 'text-white',
  },
]

const DOT_COLORS = {
  green:  'bg-status-green',
  yellow: 'bg-status-yellow',
  red:    'bg-status-red',
}

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
      const { data } = await api.post('/status', {
        recipient_id: recipient.id,
        status: selected,
        note: note.trim() || null,
      })
      setTodayStatus(data.status)
      toast.success('Status saved')
      load()
    } catch { toast.error('Failed to save status') }
    finally { setSaving(false) }
  }

  if (!recipient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mist text-sm">Set up your care circle first.</p>
        <button onClick={() => navigate('/onboarding')} className="text-sage text-sm mt-2 hover:underline">Get started</button>
      </div>
    )
  }

  const today = new Date()
  const historyMap = Object.fromEntries(history.map((h) => [h.status_date, h.status]))
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, 29 - i)
    const key = format(d, 'yyyy-MM-dd')
    return { date: key, status: historyMap[key] || null }
  })

  return (
    <div className="p-4 lg:p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold text-night mb-1">Daily Status</h1>
      <p className="text-sm text-mist mb-6">{format(today, 'EEEE, MMMM d')}</p>

      {/* Three big tap targets */}
      <div className="space-y-3 mb-5">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => canEdit && setSelected(opt.value)}
              disabled={!canEdit}
              aria-pressed={isSelected}
              className={`w-full flex items-center gap-4 p-4 rounded-card border-2 transition-all ${
                isSelected
                  ? `${opt.activeBg} ${opt.activeText} border-transparent shadow-card-md scale-[1.01]`
                  : `${opt.bg} ${opt.border} text-night hover:scale-[1.005]`
              } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div className="text-left">
                <p className={`font-semibold ${isSelected ? 'text-white' : 'text-night'}`}>{opt.label}</p>
                <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-mist'}`}>
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

      {/* Note */}
      {canEdit && selected && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Any details worth noting…"
            className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage resize-none"
          />
        </div>
      )}

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full bg-gradient-sage text-white py-3 rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sage mb-8"
        >
          {saving ? 'Saving…' : todayStatus ? 'Update Status' : 'Save Status'}
        </button>
      )}

      {/* 30-day history dots */}
      <div className="bg-white rounded-card shadow-card p-4">
        <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-3">Last 30 Days</h2>
        <div className="flex gap-1.5 flex-wrap">
          {last30.map(({ date, status }) => (
            <div
              key={date}
              title={`${date}${status ? ` — ${status}` : ''}`}
              className={`w-5 h-5 rounded-full ${status ? DOT_COLORS[status] : 'bg-dawn border border-cloud'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {Object.entries(DOT_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${c}`} />
              <span className="text-xs text-mist capitalize">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-dawn border border-cloud" />
            <span className="text-xs text-mist">No entry</span>
          </div>
        </div>
      </div>
    </div>
  )
}
