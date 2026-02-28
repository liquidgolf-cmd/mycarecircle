import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Mail, Crown, Eye, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const ROLE_META = {
  admin:       { label: 'Admin',       icon: Crown,  color: 'text-sage',  bg: 'bg-sage/10'  },
  contributor: { label: 'Contributor', icon: Pencil, color: 'text-amber', bg: 'bg-amber/10' },
  viewer:      { label: 'Viewer',      icon: Eye,    color: 'text-mist',  bg: 'bg-dawn'     },
}

function MemberAvatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-twilight text-cloud flex items-center justify-center text-sm font-semibold shrink-0">
      {initials}
    </div>
  )
}

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? ROLE_META.viewer
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

export default function Circle() {
  const { user } = useAuth()
  const { recipient, members, userRole, refresh } = useCircle()
  const navigate = useNavigate()
  const isAdmin = userRole === 'admin'

  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('contributor')
  const [sending, setSending] = useState(false)

  // Suggested helpers from onboarding — local copy so dismissals are instant
  const [localSuggestions, setLocalSuggestions] = useState([])
  useEffect(() => {
    setLocalSuggestions(recipient?.suggested_helpers || [])
  }, [recipient?.suggested_helpers])

  const fetchInvites = useCallback(async () => {
    if (!isAdmin) return
    setInvitesLoading(true)
    try {
      const { data } = await api.get('/circle/invites')
      setInvites(data.invites || [])
    } catch {
      // non-fatal — don't show an error for a background load
    } finally {
      setInvitesLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSending(true)
    try {
      const sentName = inviteName.trim()
      await api.post('/circle/invites', { name: sentName, email: inviteEmail.trim(), role: inviteRole })
      toast.success(`Invite sent to ${sentName || inviteEmail.trim()}`)

      // If this invite was for a suggested helper, remove them from suggestions
      if (sentName && localSuggestions.includes(sentName)) {
        const updated = localSuggestions.filter((n) => n !== sentName)
        setLocalSuggestions(updated)
        api.patch('/circle/recipient', {
          recipient_id: recipient.id,
          suggested_helpers: updated,
        }).catch(() => {})
      }

      setInviteName('')
      setInviteEmail('')
      setInviteRole('contributor')
      setShowInviteForm(false)
      fetchInvites()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  async function handleRevokeInvite(id) {
    try {
      await api.delete(`/circle/invites/${id}`)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success('Invite revoked')
    } catch {
      toast.error('Failed to revoke invite')
    }
  }

  // Pre-fill the invite form with a suggested helper's name and open it
  function handleInviteSuggestion(name) {
    setInviteName(name)
    setInviteEmail('')
    setInviteRole('contributor')
    setShowInviteForm(true)
    // Scroll to top so the form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Remove a suggestion from the DB and local list (no invite sent)
  async function handleRemoveSuggestion(name) {
    const updated = localSuggestions.filter((n) => n !== name)
    setLocalSuggestions(updated)
    try {
      await api.patch('/circle/recipient', {
        recipient_id: recipient.id,
        suggested_helpers: updated,
      })
    } catch {
      // Non-fatal — the UI already updated; silently ignore
    }
  }

  if (!recipient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-4xl mb-4">🌿</div>
        <h2 className="text-lg font-semibold text-night mb-2">No care circle yet</h2>
        <p className="text-mist text-sm mb-6">Set up a circle first to start inviting family members.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-gradient-sage text-white px-6 py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity shadow-sage"
        >
          Set Up Circle
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-night">Care Circle</h1>
          <p className="text-sm text-mist mt-0.5">
            Caring for <strong>{recipient.full_name}</strong>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteForm((v) => !v)}
            className="flex items-center gap-1.5 bg-gradient-sage text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sage"
          >
            <UserPlus size={15} />
            Invite
          </button>
        )}
      </div>

      {/* Invite form (admin-only, toggled) */}
      {showInviteForm && (
        <div className="bg-white rounded-card shadow-card p-5">
          <h2 className="text-sm font-semibold text-night mb-4">Invite a family member</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-xl border border-cloud px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage bg-white"
              >
                <option value="admin">Admin — full access including circle management</option>
                <option value="contributor">Contributor — can add entries and status</option>
                <option value="viewer">Viewer — read-only access</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="flex-1 py-2.5 rounded-full border border-cloud text-sm font-medium text-night hover:bg-dawn transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !inviteEmail.trim()}
                className="flex-1 py-2.5 rounded-full bg-gradient-sage text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suggested helpers from onboarding — admin only */}
      {isAdmin && localSuggestions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-1">
            Suggested Helpers
          </h2>
          <p className="text-xs text-mist mb-3">
            Mentioned during your setup — invite them to join {recipient.full_name}'s circle.
          </p>
          <div className="space-y-2">
            {localSuggestions.map((name) => (
              <div
                key={name}
                className="bg-white rounded-card shadow-card border border-sage/20 px-4 py-3 flex items-center gap-3"
              >
                <MemberAvatar name={name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-night truncate">{name}</p>
                  <p className="text-xs text-mist">From your setup conversation</p>
                </div>
                <button
                  onClick={() => handleInviteSuggestion(name)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-sage text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
                >
                  <UserPlus size={12} />
                  Invite
                </button>
                <button
                  onClick={() => handleRemoveSuggestion(name)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-dawn text-mist hover:text-night transition-colors shrink-0"
                  aria-label={`Remove ${name} from suggestions`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members list */}
      <section>
        <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-3">
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => {
            const isYou = m.user_id === user?.id
            const displayName = m.full_name || 'Unknown'
            return (
              <div
                key={m.circle_id}
                className="bg-white rounded-card shadow-card px-4 py-3 flex items-center gap-3"
              >
                <MemberAvatar name={displayName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-night truncate">
                    {displayName}
                    {isYou && (
                      <span className="ml-1.5 text-xs text-mist font-normal">(you)</span>
                    )}
                  </p>
                </div>
                <RoleBadge role={m.role} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Pending invites — admin only */}
      {isAdmin && (
        <section>
          <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-3 flex items-center gap-2">
            Pending Invites
            {invites.length > 0 && (
              <span className="bg-amber text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {invites.length}
              </span>
            )}
          </h2>
          {invitesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-white rounded-card shadow-card animate-pulse" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-6 text-center">
              <Mail size={20} className="text-mist mx-auto mb-2" />
              <p className="text-sm text-mist">No pending invites</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-card shadow-card px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-dawn border border-cloud flex items-center justify-center shrink-0">
                    {inv.name ? (
                      <span className="text-sm font-semibold text-sage">
                        {inv.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    ) : (
                      <Mail size={15} className="text-mist" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {inv.name && (
                      <p className="text-sm font-medium text-night truncate">{inv.name}</p>
                    )}
                    <p className={`truncate ${inv.name ? 'text-xs text-mist' : 'text-sm font-medium text-night'}`}>
                      {inv.email}
                    </p>
                    <p className="text-xs text-mist mt-0.5">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose/10 text-mist hover:text-rose transition-colors shrink-0"
                    aria-label="Revoke invite"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Role legend */}
      <section className="bg-dawn rounded-card p-4">
        <h2 className="text-xs font-semibold text-mist uppercase tracking-wide mb-3">
          Role Permissions
        </h2>
        <div className="space-y-2.5">
          {[
            { role: 'admin',       desc: 'Full access: log entries, status, medications, recipient profile, and circle management' },
            { role: 'contributor', desc: 'Can add log entries, daily status, and medication records' },
            { role: 'viewer',      desc: 'Read-only access to all care information' },
          ].map(({ role, desc }) => {
            const meta = ROLE_META[role]
            const Icon = meta.icon
            return (
              <div key={role} className="flex items-start gap-2">
                <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color} shrink-0`}>
                  <Icon size={11} />
                  {meta.label}
                </span>
                <p className="text-xs text-mist leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
