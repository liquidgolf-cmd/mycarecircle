const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { sendInviteEmail } = require('../services/email')

const router = express.Router()
router.use(requireAuth)

// GET /api/v1/circle/list
// Returns all care recipients the user belongs to
router.get('/list', async (req, res) => {
  const { data, error } = await supabase
    .from('care_circles')
    .select('role, recipient_id, care_recipients(id, full_name)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })

  const recipients = (data || []).map((row) => ({
    id: row.care_recipients.id,
    full_name: row.care_recipients.full_name,
    role: row.role,
  }))

  return res.json({ recipients })
})

// GET /api/v1/circle
// Returns the user's active care circle with recipient + members.
// Pass ?recipient_id= to load a specific circle; otherwise the first is returned.
router.get('/', async (req, res) => {
  const recipientIdFilter = req.query.recipient_id

  let query = supabase
    .from('care_circles')
    .select('role, recipient_id, care_recipients(*)')
    .eq('user_id', req.user.id)

  if (recipientIdFilter) {
    query = query.eq('recipient_id', recipientIdFilter)
  } else {
    query = query.limit(1)
  }

  const { data: membership, error } = await query.maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  if (!membership) return res.status(404).json({ error: 'No care circle found' })

  const recipient = membership.care_recipients
  const userRole = membership.role

  const { data: allMembers, error: membersError } = await supabase
    .from('care_circles')
    .select('id, role, user_id')
    .eq('recipient_id', recipient.id)

  if (membersError) return res.status(400).json({ error: membersError.message })

  // Fetch profiles separately — PostgREST can't auto-join care_circles.user_id → profiles
  // because both reference auth.users.id but there's no direct FK between the two tables.
  const memberUserIds = (allMembers || []).map((m) => m.user_id)
  const { data: profileRows } = memberUserIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', memberUserIds)
    : { data: [] }
  const profileMap = Object.fromEntries((profileRows || []).map((p) => [p.id, p]))

  const members = (allMembers || []).map((m) => ({
    circle_id: m.id,
    role: m.role,
    user_id: m.user_id,
    ...(profileMap[m.user_id] || {}),
  }))

  return res.json({ recipient, members, userRole })
})

// POST /api/v1/circle/create
// Creates a care recipient and adds the creator as admin
router.post('/create', async (req, res) => {
  const {
    full_name, date_of_birth, city, state,
    primary_physician, allergies, conditions, emergency_contact,
  } = req.body

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'full_name is required' })
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('care_recipients')
    .insert({
      full_name: full_name.trim(),
      date_of_birth: date_of_birth || null,
      city: city || null,
      state: state || null,
      primary_physician: primary_physician || null,
      allergies: allergies || [],
      conditions: conditions || [],
      emergency_contact: emergency_contact || null,
      created_by: req.user.id,
    })
    .select()
    .single()

  if (recipientError) return res.status(400).json({ error: recipientError.message })

  const { error: circleError } = await supabase
    .from('care_circles')
    .insert({ user_id: req.user.id, recipient_id: recipient.id, role: 'admin' })

  if (circleError) return res.status(400).json({ error: circleError.message })

  return res.status(201).json({ recipient })
})

// PATCH /api/v1/circle/recipient
// Update care recipient fields (admin only — also enforced by RLS)
router.patch('/recipient', async (req, res) => {
  const { recipient_id, ...updates } = req.body

  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  // Server-side admin check (spec §9)
  const { data: circle } = await supabase
    .from('care_circles')
    .select('role')
    .eq('user_id', req.user.id)
    .eq('recipient_id', recipient_id)
    .maybeSingle()

  if (!circle) return res.status(403).json({ error: 'Not a member of this circle' })
  if (circle.role !== 'admin') return res.status(403).json({ error: 'Admin role required' })

  const allowed = ['full_name', 'date_of_birth', 'city', 'state', 'primary_physician', 'allergies', 'conditions', 'emergency_contact']
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  if (Object.keys(filtered).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const { data, error } = await supabase
    .from('care_recipients')
    .update(filtered)
    .eq('id', recipient_id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ recipient: data })
})

// ── Invite management (admin-only, auth required) ────────────────────────────

// POST /api/v1/circle/invites
// Create and email an invite to join the circle
router.post('/invites', async (req, res) => {
  const { email, role = 'contributor', name = '' } = req.body

  if (!email || !email.trim()) return res.status(400).json({ error: 'email is required' })
  if (!['admin', 'contributor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin, contributor, or viewer' })
  }

  // Get caller's circle membership
  const { data: membership } = await supabase
    .from('care_circles')
    .select('role, recipient_id, care_recipients(full_name)')
    .eq('user_id', req.user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a member of any circle' })
  if (membership.role !== 'admin') return res.status(403).json({ error: 'Admin role required' })

  const recipientId = membership.recipient_id
  const recipientName = membership.care_recipients.full_name

  // Insert invite row
  const { data: invite, error } = await supabase
    .from('circle_invites')
    .insert({
      recipient_id: recipientId,
      invited_by: req.user.id,
      email: email.toLowerCase().trim(),
      role,
      name: name.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A pending invite for this email already exists' })
    }
    return res.status(400).json({ error: error.message })
  }

  // Fetch inviter's display name
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', req.user.id)
    .single()
  const inviterName = inviterProfile?.full_name || req.user.email || 'Someone'
  const inviteeName = invite.name || null

  // Fire-and-forget: send email (don't fail the request if email fails)
  sendInviteEmail({ to: invite.email, inviterName, inviteeName, recipientName, role, token: invite.token })
    .catch((err) => console.error('[invite email error]', err.message))

  return res.status(201).json({ invite })
})

// GET /api/v1/circle/invites
// List pending invites for the caller's circle (admin only)
router.get('/invites', async (req, res) => {
  const { data: membership } = await supabase
    .from('care_circles')
    .select('role, recipient_id')
    .eq('user_id', req.user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not in a circle' })
  if (membership.role !== 'admin') return res.status(403).json({ error: 'Admin role required' })

  const { data: invites, error } = await supabase
    .from('circle_invites')
    .select('id, email, name, role, status, expires_at, created_at')
    .eq('recipient_id', membership.recipient_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ invites: invites || [] })
})

// DELETE /api/v1/circle/invites/:id
// Revoke a pending invite (admin only)
router.delete('/invites/:id', async (req, res) => {
  const { data: membership } = await supabase
    .from('care_circles')
    .select('role, recipient_id')
    .eq('user_id', req.user.id)
    .limit(1)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' })
  }

  const { error } = await supabase
    .from('circle_invites')
    .delete()
    .eq('id', req.params.id)
    .eq('recipient_id', membership.recipient_id) // scoped to caller's circle

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ ok: true })
})

module.exports = router
