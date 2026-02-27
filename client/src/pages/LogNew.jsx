import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCircle } from '../context/CircleContext'
import { useVoiceInput } from '../hooks/useVoiceInput'
import OcrButton from '../components/ui/OcrButton'
import api from '../services/api'

const CATEGORIES = [
  { value: 'health',      label: 'Health',      icon: '🩺' },
  { value: 'medication',  label: 'Medication',  icon: '💊' },
  { value: 'mood',        label: 'Mood',        icon: '😊' },
  { value: 'appointment', label: 'Appointment', icon: '📅' },
  { value: 'general',     label: 'General',     icon: '📝' },
]

const SEVERITIES = [
  { value: 'normal',     label: 'Normal',     color: 'text-mid' },
  { value: 'concerning', label: 'Concerning', color: 'text-amber' },
  { value: 'urgent',     label: 'Urgent',     color: 'text-rose' },
]

// This component is used both as a standalone page (/log/new)
// and embedded inside a Modal when editing from Log.jsx
export default function LogEntryForm({ existingEntry, onSaved, onCancel }) {
  const { recipient } = useCircle()
  const navigate = useNavigate()
  const isEditing = !!existingEntry
  const isStandalone = !onSaved

  const [category, setCategory] = useState(existingEntry?.category || 'general')
  const [body, setBody] = useState(existingEntry?.body || '')
  const [severity, setSeverity] = useState(existingEntry?.severity || 'normal')
  const [saving, setSaving] = useState(false)

  const { isListening, isSupported, startListening } = useVoiceInput((transcript) => {
    setBody((prev) => prev + (prev ? ' ' : '') + transcript)
  })

  function handleDocumentScanned(extracted) {
    if (extracted.body)     setBody(extracted.body)
    if (extracted.category) setCategory(extracted.category)
    if (extracted.severity) setSeverity(extracted.severity)
    toast.success('Document scanned — please review the text below')
  }

  async function handleSave() {
    if (!body.trim()) { toast.error('Please write something'); return }
    if (!recipient && !isEditing) { toast.error('No care circle found'); return }

    setSaving(true)
    try {
      if (isEditing) {
        await api.patch(`/log/${existingEntry.id}`, { body: body.trim(), category, severity })
        toast.success('Entry updated')
      } else {
        await api.post('/log', { recipient_id: recipient.id, category, body: body.trim(), severity })
        toast.success('Entry added')
      }
      onSaved ? onSaved() : navigate('/log')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    onCancel ? onCancel() : navigate(-1)
  }

  const content = (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-mid mb-2 uppercase tracking-wide">Category</label>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                category === cat.value
                  ? 'border-sage bg-sage text-white'
                  : 'border-border bg-white text-mid hover:bg-cream'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-[10px]">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-mid uppercase tracking-wide">Note</label>
          <div className="flex items-center gap-3">
            <OcrButton
              mode="document"
              onExtracted={handleDocumentScanned}
              label="Scan doc"
              className="text-xs text-sage font-medium hover:text-sage-light transition-colors"
            />
            <span className={`text-xs ${body.length > 1900 ? 'text-rose' : 'text-mid'}`}>
              {body.length}/2000
            </span>
          </div>
        </div>
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's happening with your loved one today?"
            maxLength={2000}
            rows={5}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-sage resize-none"
          />
          {isSupported && (
            <button
              type="button"
              onClick={startListening}
              className={`absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                isListening ? 'bg-rose text-white' : 'bg-cream hover:bg-cream-dark text-mid'
              }`}
              aria-label="Voice input"
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-mid mb-2 uppercase tracking-wide">Severity</label>
        <div className="flex gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                severity === s.value
                  ? 'border-sage bg-sage text-white'
                  : `border-border bg-white ${s.color} hover:bg-cream`
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-3 rounded-xl border border-border bg-white text-charcoal text-sm font-medium hover:bg-cream transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !body.trim()}
          className="flex-1 py-3 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-light disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </div>
  )

  // Standalone page — wrap in a page shell
  if (isStandalone) {
    return (
      <div className="p-4 lg:p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-charcoal mb-5">New Entry</h1>
        {content}
      </div>
    )
  }

  return content
}
