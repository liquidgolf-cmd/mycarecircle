import { useState, useEffect, useCallback } from 'react'
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
  { value: 'normal',     label: 'Normal',     color: 'text-mist' },
  { value: 'concerning', label: 'Concerning', color: 'text-amber' },
  { value: 'urgent',     label: 'Urgent',     color: 'text-rose' },
]

// Used both as a standalone page (/log/new) and embedded in a Modal when editing
export default function LogEntryForm({ existingEntry, onSaved, onCancel }) {
  const { recipient } = useCircle()
  const navigate = useNavigate()
  const isEditing = !!existingEntry
  const isStandalone = !onSaved

  const [category, setCategory] = useState(existingEntry?.category || 'general')
  const [body, setBody] = useState(existingEntry?.body || '')
  const [severity, setSeverity] = useState(existingEntry?.severity || 'normal')
  const [saving, setSaving] = useState(false)

  const { isListening, isSupported, startListening, stopListening, permissionDenied, noSpeechDetected } = useVoiceInput((transcript) => {
    setBody((prev) => prev + (prev ? ' ' : '') + transcript)
  })

  useEffect(() => {
    if (permissionDenied) {
      toast.error('Microphone access denied — allow it in your browser settings and try again.')
    }
  }, [permissionDenied])

  useEffect(() => {
    if (noSpeechDetected) {
      toast('No speech detected — tap the mic and speak clearly.', { icon: '🎤' })
    }
  }, [noSpeechDetected])

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
        <label className="block text-xs font-medium text-mist mb-2 uppercase tracking-wide">Category</label>
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                category === cat.value
                  ? 'border-sage bg-sage text-white'
                  : 'border-cloud bg-white text-mist hover:bg-dawn'
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
          <label className="block text-xs font-medium text-mist uppercase tracking-wide">Note</label>
          <div className="flex items-center gap-3">
            <OcrButton
              mode="document"
              onExtracted={handleDocumentScanned}
              label="Scan doc"
              className="text-xs text-sage font-medium hover:text-sage-light transition-colors"
            />
            <span className={`text-xs ${body.length > 1900 ? 'text-rose' : 'text-mist'}`}>
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
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage resize-none transition-colors ${
              isListening ? 'border-rose' : 'border-cloud'
            }`}
          />
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`absolute bottom-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                isListening ? 'bg-rose text-white' : 'bg-dawn hover:bg-cloud text-mist'
              }`}
              aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              title={isListening ? 'Tap to stop' : 'Tap to speak'}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
        </div>
        {isListening && (
          <div className="flex items-center gap-2 px-3 py-2 bg-rose/10 border border-rose/20 rounded-xl mt-1">
            <span className="flex gap-0.5 items-end h-4">
              <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
              <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '60%', animationDelay: '300ms' }} />
            </span>
            <span className="text-xs font-medium text-rose">Listening… speak now, tap mic to stop</span>
          </div>
        )}
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-mist mb-2 uppercase tracking-wide">Severity</label>
        <div className="flex gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                severity === s.value
                  ? 'border-sage bg-sage text-white'
                  : `border-cloud bg-white ${s.color} hover:bg-dawn`
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
          className="flex-1 py-3 rounded-full border border-cloud bg-white text-night text-sm font-medium hover:bg-dawn transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !body.trim()}
          className="flex-1 py-3 rounded-full bg-gradient-sage text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </div>
  )

  if (isStandalone) {
    return (
      <div className="p-4 lg:p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-night mb-5">New Entry</h1>
        {content}
      </div>
    )
  }

  return content
}
