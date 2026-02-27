import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pill } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import OcrButton from '../components/ui/OcrButton'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'
import Modal from '../components/ui/Modal'

function MedCard({ med, onToggle, onDelete, userRole }) {
  const canEdit = userRole === 'admin' || userRole === 'contributor'

  return (
    <div className={`bg-white rounded-xl border border-border p-4 flex items-start gap-3 ${!med.is_active ? 'opacity-60' : ''}`}>
      <div className="w-9 h-9 bg-sage-lighter rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <Pill size={16} className="text-sage" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-charcoal">{med.name}</p>
        {(med.dosage || med.frequency) && (
          <p className="text-xs text-mid mt-0.5">
            {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
          </p>
        )}
        {med.prescribing_doctor && (
          <p className="text-xs text-mid">Dr. {med.prescribing_doctor}</p>
        )}
        {med.notes && <p className="text-xs text-mid italic mt-1">{med.notes}</p>}
      </div>
      {canEdit && (
        <button
          onClick={() => onToggle(med)}
          className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
            med.is_active ? 'bg-sage' : 'bg-border'
          }`}
          aria-label={med.is_active ? 'Deactivate' : 'Activate'}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
              med.is_active ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      )}
    </div>
  )
}

export default function Medications() {
  const { recipient, userRole } = useCircle()
  const navigate = useNavigate()
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm()

  function handlePrescriptionScanned(extracted) {
    if (extracted.name)               setValue('name',               extracted.name)
    if (extracted.dosage)             setValue('dosage',             extracted.dosage)
    if (extracted.frequency)          setValue('frequency',          extracted.frequency)
    if (extracted.prescribing_doctor) setValue('prescribing_doctor', extracted.prescribing_doctor)
    if (extracted.notes)              setValue('notes',              extracted.notes)
    toast.success('Prescription scanned — please review and correct any details')
  }

  const fetchMeds = useCallback(async () => {
    if (!recipient) return
    try {
      const { data } = await api.get(`/medications?recipient_id=${recipient.id}`)
      setMeds(data.medications || [])
    } catch { toast.error('Failed to load medications') }
    finally { setLoading(false) }
  }, [recipient])

  useEffect(() => { fetchMeds() }, [fetchMeds])

  async function handleToggle(med) {
    try {
      const { data } = await api.patch(`/medications/${med.id}`, { is_active: !med.is_active })
      setMeds((prev) => prev.map((m) => (m.id === med.id ? data.medication : m)))
    } catch { toast.error('Could not update medication') }
  }

  async function handleAdd(values) {
    try {
      const { data } = await api.post('/medications', { recipient_id: recipient.id, ...values })
      setMeds((prev) => [data.medication, ...prev])
      reset()
      setAddOpen(false)
      toast.success('Medication added')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add medication')
    }
  }

  if (!recipient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mid text-sm">Set up your care circle first.</p>
        <button onClick={() => navigate('/onboarding')} className="text-sage text-sm mt-2 hover:underline">Get started</button>
      </div>
    )
  }

  const active = meds.filter((m) => m.is_active)
  const inactive = meds.filter((m) => !m.is_active)
  const canEdit = userRole === 'admin' || userRole === 'contributor'

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-charcoal">Medications</h1>
        {canEdit && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-sage text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-sage-light transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-border" />)}
        </div>
      ) : (
        <>
          {/* Active */}
          <section className="mb-6">
            <h2 className="text-xs font-medium text-mid uppercase tracking-wide mb-2">
              Active · {active.length}
            </h2>
            {active.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-mid">No active medications.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((med) => (
                  <MedCard key={med.id} med={med} onToggle={handleToggle} userRole={userRole} />
                ))}
              </div>
            )}
          </section>

          {/* Inactive */}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-mid uppercase tracking-wide mb-2">
                Inactive · {inactive.length}
              </h2>
              <div className="space-y-2">
                {inactive.map((med) => (
                  <MedCard key={med.id} med={med} onToggle={handleToggle} userRole={userRole} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Add Medication Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Medication">
        <form onSubmit={handleSubmit(handleAdd)} className="space-y-4">

          {/* OCR scan banner */}
          <div className="flex items-center justify-between bg-sage-lighter rounded-xl px-4 py-3">
            <div>
              <p className="text-xs font-medium text-sage">Have a prescription label?</p>
              <p className="text-xs text-mid mt-0.5">Scan it to fill in the fields automatically</p>
            </div>
            <OcrButton
              mode="medication"
              onExtracted={handlePrescriptionScanned}
              label="Scan label"
              className="text-xs font-semibold text-sage bg-white border border-sage rounded-lg px-3 py-1.5 hover:bg-cream transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-mid mb-1">Name *</label>
            <input
              {...register('name', { required: 'Name is required', maxLength: { value: 100, message: 'Max 100 characters' } })}
              placeholder="e.g. Lisinopril"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage ${errors.name ? 'border-rose' : 'border-border'}`}
            />
            {errors.name && <p className="text-xs text-rose mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-mid mb-1">Dosage</label>
              <input {...register('dosage')} placeholder="e.g. 10mg" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
            <div>
              <label className="block text-xs font-medium text-mid mb-1">Frequency</label>
              <input {...register('frequency')} placeholder="e.g. Once daily" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-mid mb-1">Prescribing Doctor</label>
            <input {...register('prescribing_doctor')} placeholder="Dr. Smith" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
          </div>
          <div>
            <label className="block text-xs font-medium text-mid mb-1">Notes</label>
            <textarea {...register('notes', { maxLength: { value: 500, message: 'Max 500 characters' } })} placeholder="Take with food…" rows={2} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-cream">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-light disabled:opacity-50">
              {isSubmitting ? 'Adding…' : 'Add Medication'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
