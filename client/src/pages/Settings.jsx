import { useState } from 'react'
import { User, Bell, LogOut, ChevronRight, Check, Users, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-sage" />
      <h2 className="text-xs font-semibold text-mid uppercase tracking-wide">{title}</h2>
    </div>
  )
}

function NotifToggle({ label, description, enabled, toggling, onToggle }) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="pr-4">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <p className="text-xs text-mid mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={toggling}
        role="switch"
        aria-checked={enabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 disabled:opacity-50 ${
          enabled ? 'bg-sage' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, profile, logout, refreshProfile } = useAuth()
  const { recipients, recipient, selectRecipient } = useCircle()
  const navigate = useNavigate()

  // Account form
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving] = useState(false)

  // Notification prefs — sourced from profile, defaults to true
  const digestEnabled    = profile?.notification_prefs?.email_digest     !== false
  const newEntryEnabled  = profile?.notification_prefs?.email_new_entry  !== false
  const redStatusEnabled = profile?.notification_prefs?.email_status_red !== false
  const [digestToggling,    setDigestToggling]    = useState(false)
  const [newEntryToggling,  setNewEntryToggling]  = useState(false)
  const [redStatusToggling, setRedStatusToggling] = useState(false)

  async function saveName() {
    if (!nameValue.trim()) return
    setNameSaving(true)
    try {
      await api.patch('/auth/profile', { full_name: nameValue.trim() })
      await refreshProfile()
      toast.success('Name updated')
      setEditingName(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update name')
    } finally {
      setNameSaving(false)
    }
  }

  async function togglePref(key, currentValue, setToggling, labels) {
    setToggling(true)
    const newValue = !currentValue
    const newPrefs = { ...(profile?.notification_prefs || {}), [key]: newValue }
    try {
      await api.patch('/auth/profile', { notification_prefs: newPrefs })
      await refreshProfile()
      toast.success(newValue ? labels.on : labels.off)
    } catch (err) {
      toast.error('Failed to update preferences')
    } finally {
      setToggling(false)
    }
  }

  const toggleDigest    = () => togglePref('email_digest',     digestEnabled,    setDigestToggling,    { on: 'Weekly digest enabled',        off: 'Weekly digest disabled' })
  const toggleNewEntry  = () => togglePref('email_new_entry',  newEntryEnabled,  setNewEntryToggling,  { on: 'New entry alerts enabled',     off: 'New entry alerts disabled' })
  const toggleRedStatus = () => togglePref('email_status_red', redStatusEnabled, setRedStatusToggling, { on: 'Red status alerts enabled',    off: 'Red status alerts disabled' })

  async function handleLogout() {
    try {
      await logout()
    } catch {
      toast.error('Sign-out failed')
    }
  }

  const displayEmail = user?.email || '—'
  const displayName = profile?.full_name || user?.user_metadata?.full_name || '—'

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-charcoal">Settings</h1>

      {/* ── Account ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={User} title="Account" />
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">

          {/* Display name */}
          <div className="p-4">
            <p className="text-xs font-medium text-mid mb-1">Display name</p>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  maxLength={100}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sage"
                />
                <button
                  onClick={saveName}
                  disabled={nameSaving || !nameValue.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-sage text-white disabled:opacity-40 hover:bg-sage-light transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(profile?.full_name || '') }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-mid hover:bg-cream transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-charcoal">{displayName}</p>
                <button
                  onClick={() => { setNameValue(profile?.full_name || ''); setEditingName(true) }}
                  className="text-xs text-sage hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="p-4">
            <p className="text-xs font-medium text-mid mb-1">Email</p>
            <p className="text-sm text-charcoal">{displayEmail}</p>
          </div>

          {/* Role badge */}
          {profile?.role && (
            <div className="p-4">
              <p className="text-xs font-medium text-mid mb-1">Role</p>
              <p className="text-sm text-charcoal capitalize">{profile.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── People in your care ───────────────────────────────────── */}
      <div>
        <SectionHeader icon={Users} title="People in your care" />
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">
          {recipients.map((r) => (
            <button
              key={r.id}
              onClick={() => { selectRecipient(r.id); navigate('/home') }}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-cream transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-lighter flex items-center justify-center text-sage text-xs font-semibold shrink-0">
                  {r.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">{r.full_name}</p>
                  <p className="text-xs text-mid capitalize">{r.role}</p>
                </div>
              </div>
              {r.id === recipient?.id && (
                <Check size={15} className="text-sage shrink-0" />
              )}
            </button>
          ))}

          <button
            onClick={() => navigate('/onboarding?new=true')}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-cream transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-cream border-2 border-dashed border-sage flex items-center justify-center shrink-0">
              <Plus size={14} className="text-sage" />
            </div>
            <p className="text-sm font-medium text-sage">Add another person</p>
          </button>
        </div>
      </div>

      {/* ── Notifications ─────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Bell} title="Notifications" />
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">

          {/* New log entry alerts */}
          <NotifToggle
            label="New log entry alerts"
            description="Get an email when someone else adds a care log entry"
            enabled={newEntryEnabled}
            toggling={newEntryToggling}
            onToggle={toggleNewEntry}
          />

          {/* Red status alerts */}
          <NotifToggle
            label="Red status alerts"
            description="Get an email immediately when a red 'needs attention' status is set"
            enabled={redStatusEnabled}
            toggling={redStatusToggling}
            onToggle={toggleRedStatus}
          />

          {/* Weekly digest */}
          <NotifToggle
            label="Weekly digest email"
            description="Receive a Sunday summary of the past week's care activity"
            enabled={digestEnabled}
            toggling={digestToggling}
            onToggle={toggleDigest}
          />

        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────────────────── */}
      <div>
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-cream transition-colors group"
          >
            <div className="flex items-center gap-3">
              <LogOut size={16} className="text-rose" />
              <span className="text-sm font-medium text-rose">Sign out</span>
            </div>
            <ChevronRight size={16} className="text-mid group-hover:text-charcoal transition-colors" />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-mid pb-4">My Care Circle · Version 0.1</p>
    </div>
  )
}
