import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Check, X, MapPin, User, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage">
        <Check size={10} /> Done
      </span>
    )
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dawn text-mist">
        <X size={10} /> Cancelled
      </span>
    )
  }
  return null
}

export default function Appointments() {
  const { recipient, members } = useCircle()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPast, setShowPast] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [doctor, setDoctor] = useState('')
  const [location, setLocation] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAppointments = useCallback(async () => {
    if (!recipient) return
    setLoading(true)
    try {
      const { data } = await api.get(`/appointments?recipient_id=${recipient.id}`)
      setAppointments(data.appointments || [])
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [recipient])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  function resetForm() {
    setTitle(''); setDoctor(''); setLocation('')
    setApptDate(''); setAssigneeId(''); setNotes('')
    setShowForm(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim() || !apptDate) return
    setSaving(true)
    try {
      await api.post('/appointments', {
        recipient_id: recipient.id,
        title: title.trim(),
        doctor: doctor.trim() || undefined,
        location: location.trim() || undefined,
        appt_date: new Date(apptDate).toISOString(),
        assignee_id: assigneeId || undefined,
        notes: notes.trim() || undefined,
      })
      toast.success('Appointment scheduled')
      resetForm()
      fetchAppointments()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule appointment')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(id, status) {
    try {
      const { data } = await api.patch(`/appointments/${id}`, { status })
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data.appointment } : a)))
      toast.success(status === 'completed' ? 'Marked as done' : 'Appointment cancelled')
    } catch {
      toast.error('Failed to update appointment')
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/appointments/${id}`)
      setAppointments((prev) => prev.filter((a) => a.id !== id))
      toast.success('Appointment removed')
    } catch {
      toast.error('Failed to remove appointment')
    }
  }

  const upcoming = appointments.filter((a) => a.status === 'upcoming')
  const past = appointments.filter((a) => a.status !== 'upcoming')

  if (!recipient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Calendar size={40} className="text-mist mb-4" />
        <h2 className="text-lg font-semibold text-night mb-2">No care circle yet</h2>
        <p className="text-mist text-sm">Set up a circle first to start tracking appointments.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-night">Appointments</h1>
          <p className="text-sm text-mist mt-0.5">Caring for <strong>{recipient.full_name}</strong></p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
          className="flex items-center gap-1.5 bg-gradient-sage text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sage"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-card shadow-card p-5">
          <h2 className="text-sm font-semibold text-night mb-4">Schedule an appointment</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cardiology follow-up"
                required
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">Date & Time *</label>
              <input
                type="datetime-local"
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                required
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">Doctor / Provider</label>
                <input
                  type="text"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Clinic or address"
                  className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Assign to a circle member
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage bg-white"
              >
                <option value="">No one assigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.full_name || m.user_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bring insurance card, fasting required, etc."
                rows={2}
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-full border border-cloud text-sm font-medium text-night hover:bg-dawn transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !apptDate}
                className="flex-1 py-2.5 rounded-full bg-gradient-sage text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-3">
          Upcoming ({upcoming.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-card shadow-card animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-card shadow-card p-8 text-center">
            <Calendar size={28} className="text-mist mx-auto mb-2" />
            <p className="text-sm text-mist">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onStatus={handleStatus}
                onDelete={handleDelete}
                showActions
              />
            ))}
          </div>
        )}
      </section>

      {/* Past (collapsible) */}
      {past.length > 0 && (
        <section>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-mist uppercase tracking-wide mb-3 w-full text-left"
          >
            Past ({past.length})
            {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showPast && (
            <div className="space-y-3">
              {past.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onDelete={handleDelete}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function AppointmentCard({ appt, onStatus, onDelete, showActions }) {
  const isPast = appt.status !== 'upcoming'

  return (
    <div className={`bg-white rounded-card shadow-card px-4 py-4 ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Date block */}
        <div className={`shrink-0 rounded-xl px-3 py-2 text-center min-w-[52px] ${isPast ? 'bg-dawn' : 'bg-sage/10'}`}>
          <p className={`text-xs font-semibold uppercase leading-none ${isPast ? 'text-mist' : 'text-sage'}`}>
            {new Date(appt.appt_date).toLocaleString('en-US', { month: 'short' })}
          </p>
          <p className={`text-xl font-bold leading-tight ${isPast ? 'text-mist' : 'text-sage'}`}>
            {new Date(appt.appt_date).getDate()}
          </p>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-night leading-snug">{appt.title}</p>
            <StatusBadge status={appt.status} />
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 text-xs text-mist">
              <Clock size={11} />
              {formatDate(appt.appt_date)} · {formatTime(appt.appt_date)}
            </span>
            {appt.doctor && (
              <span className="flex items-center gap-1 text-xs text-mist">
                <User size={11} /> {appt.doctor}
              </span>
            )}
            {appt.location && (
              <span className="flex items-center gap-1 text-xs text-mist">
                <MapPin size={11} /> {appt.location}
              </span>
            )}
          </div>

          {appt.assignee && (
            <p className="mt-1 text-xs text-mist">
              Assigned to <span className="font-medium text-sage">{appt.assignee.full_name}</span>
            </p>
          )}

          {appt.notes && (
            <p className="mt-1.5 text-xs text-mist italic">{appt.notes}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-cloud">
          <button
            onClick={() => onStatus(appt.id, 'completed')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sage/10 text-sage text-xs font-semibold hover:bg-sage/20 transition-colors"
          >
            <Check size={13} /> Mark Done
          </button>
          <button
            onClick={() => onStatus(appt.id, 'cancelled')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-dawn text-mist text-xs font-semibold hover:bg-cloud transition-colors"
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={() => onDelete(appt.id)}
            className="w-9 flex items-center justify-center rounded-xl hover:bg-rose/10 text-mist hover:text-rose transition-colors"
            aria-label="Delete appointment"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
