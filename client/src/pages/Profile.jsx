import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

function Field({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div>
      <p className="text-xs font-medium text-mid uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-charcoal">
        {Array.isArray(value) ? value.join(', ') : value}
      </p>
    </div>
  )
}

export default function Profile() {
  const { recipient, userRole, refresh } = useCircle()
  const isAdmin = userRole === 'admin'
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (recipient) {
      reset({
        full_name: recipient.full_name || '',
        date_of_birth: recipient.date_of_birth || '',
        city: recipient.city || '',
        state: recipient.state || '',
        primary_physician: recipient.primary_physician || '',
        allergies: (recipient.allergies || []).join(', '),
        conditions: (recipient.conditions || []).join(', '),
        emergency_name: recipient.emergency_contact?.name || '',
        emergency_phone: recipient.emergency_contact?.phone || '',
        emergency_relationship: recipient.emergency_contact?.relationship || '',
      })
    }
  }, [recipient, reset])

  async function onSubmit(values) {
    try {
      await api.patch('/circle/recipient', {
        recipient_id: recipient.id,
        full_name: values.full_name,
        date_of_birth: values.date_of_birth || null,
        city: values.city || null,
        state: values.state || null,
        primary_physician: values.primary_physician || null,
        allergies: values.allergies ? values.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        conditions: values.conditions ? values.conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        emergency_contact: (values.emergency_name || values.emergency_phone)
          ? { name: values.emergency_name, phone: values.emergency_phone, relationship: values.emergency_relationship }
          : null,
      })
      await refresh()
      setEditing(false)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    }
  }

  if (!recipient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mid text-sm">No care recipient found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-charcoal">Profile</h1>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-sage hover:underline"
          >
            <Pencil size={14} /> Edit
          </button>
        )}
        {editing && (
          <button onClick={() => { setEditing(false); reset() }} className="text-mid hover:text-charcoal">
            <X size={18} />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mid mb-1">Full Name *</label>
            <input
              {...register('full_name', { required: 'Required', maxLength: { value: 100, message: 'Max 100 chars' } })}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage ${errors.full_name ? 'border-rose' : 'border-border'}`}
            />
            {errors.full_name && <p className="text-xs text-rose mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-mid mb-1">Date of Birth</label>
              <input type="date" {...register('date_of_birth')} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
            <div>
              <label className="block text-xs font-medium text-mid mb-1">Primary Physician</label>
              <input {...register('primary_physician')} placeholder="Dr. Smith" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-mid mb-1">City</label>
              <input {...register('city')} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
            <div>
              <label className="block text-xs font-medium text-mid mb-1">State</label>
              <input {...register('state')} className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mid mb-1">Conditions (comma-separated)</label>
            <input {...register('conditions')} placeholder="Diabetes, hypertension…" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
          </div>

          <div>
            <label className="block text-xs font-medium text-mid mb-1">Allergies (comma-separated)</label>
            <input {...register('allergies')} placeholder="Penicillin, shellfish…" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage" />
          </div>

          <div className="bg-cream rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-mid uppercase tracking-wide">Emergency Contact</p>
            <input {...register('emergency_name')} placeholder="Name" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sage" />
            <input {...register('emergency_phone')} placeholder="Phone" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sage" />
            <input {...register('emergency_relationship')} placeholder="Relationship (e.g. Spouse)" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sage" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setEditing(false); reset() }} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-cream">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-light disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <Field label="Full Name" value={recipient.full_name} />
            <Field label="Date of Birth" value={recipient.date_of_birth} />
            <Field label="Location" value={[recipient.city, recipient.state].filter(Boolean).join(', ')} />
            <Field label="Primary Physician" value={recipient.primary_physician} />
          </div>

          {(recipient.conditions?.length > 0 || recipient.allergies?.length > 0) && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <Field label="Conditions" value={recipient.conditions} />
              <Field label="Allergies" value={recipient.allergies} />
            </div>
          )}

          {recipient.emergency_contact && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-2">
              <p className="text-xs font-medium text-mid uppercase tracking-wide">Emergency Contact</p>
              <p className="text-sm text-charcoal font-medium">{recipient.emergency_contact.name}</p>
              {recipient.emergency_contact.phone && <p className="text-sm text-mid">{recipient.emergency_contact.phone}</p>}
              {recipient.emergency_contact.relationship && <p className="text-sm text-mid">{recipient.emergency_contact.relationship}</p>}
            </div>
          )}

          {!isAdmin && (
            <p className="text-xs text-mid text-center">Only admins can edit the profile.</p>
          )}
        </div>
      )}
    </div>
  )
}
