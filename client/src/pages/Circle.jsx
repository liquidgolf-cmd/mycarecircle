import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Mail, Crown, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const ROLE_META = {
  admin:       { label: 'Admin',       icon: Crown,  color: 'text-sage',  bg: 'bg-sage/10'  },
  contributor: { label: 'Contributor', icon: Pencil, color: 'text-amber', bg: 'bg-amber/10' },
  viewer:      { label: 'Viewer',      icon: Eye,    color: 'text-mid',   bg: 'bg-cream'    },
}

function MemberAvatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-sage text-white flex items-center justify-center text-sm font-semibold shrink-0">
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('contributor')
  const [sending, setSending] = useState(false)

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
      await api.post('/circle/invites', { email: inviteEmail.trim(), role: inviteRole })
      toast.success(`Invite sent to ${inviteEmail.trim()}`)
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

  if (!recipient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-4xl mb-4">🌿</div>
        <h2 className="text-lg font-semibold text-charcoal mb-2">No care circle yet</h2>
        <p className="text-mid text-sm mb-6">Set up a circle first to start inviting family members.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-sage text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-sage-light transition-colors"
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
          <h1 className="text-xl font-semibold text-charcoal">Care Circle</h1>
          <p className="text-sm text-mid mt-0.5">
            Caring for <strong>{recipient.full_name}</strong>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteForm((v) => !v)}
            className="flex items-center gap-1.5 bg-sage text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-sage-light transition-colors"
          >
            <UserPlus size={15} />
            Invite
          </button>
        )}
      </div>

      {/* Invite form (admin-only, toggled) */}
      {showInviteForm && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-charcoal mb-4">Invite a family member</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-mid mb-1 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="family@example.com"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-mid mb-1 uppercase tracking-wide">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage bg-white"
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
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-charcoal hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !inviteEmail.trim()}
                className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-light disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <section>
        <h2 className="text-xs font-semibold text-mid uppercase tracking-wide mb-3">
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => {
            const isYou = m.user_id === user?.id
            const displayName = m.full_name || 'Unknown'
            return (
              <div
                key={m.circle_id}
                className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                <MemberAvatar name={displayName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">
                    {displayName}
                    {isYou && (
                      <span className="ml-1.5 text-xs text-mid font-normal">(you)</span>
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
          <h2 className="text-xs font-semibold text-mid uppercase tracking-wide mb-3 flex items-center gap-2">
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
                <div key={i} className="h-14 bg-white rounded-xl border border-border animate-pulse" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <Mail size={20} className="text-mid mx-auto mb-2" />
              <p className="text-sm text-mid">No pending invites</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-cream border border-border flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-mid" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{inv.email}</p>
                    <p className="text-xs text-mid mt-0.5">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-light text-mid hover:text-rose transition-colors shrink-0"
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
      <section className="bg-cream rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-mid uppercase tracking-wide mb-3">
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
                <p className="text-xs text-mid leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
