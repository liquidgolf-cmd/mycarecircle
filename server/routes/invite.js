/**
 * Public invite routes — mounted at /api/v1/invite
 *
 * These are split from /circle routes because:
 *   GET  /:token         — no auth required (show invite landing page)
 *   POST /:token/accept  — auth required (join the circle)
 */

const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/v1/invite/:token
// Returns public invite details so the landing page can show what you're joining.
// No auth required — the token acts as the credential.
router.get('/:token', async (req, res) => {
  const { data: invite, error } = await supabase
    .from('circle_invites')
    .select('id, email, name, role, status, expires_at, recipient_id, care_recipients(full_name)')
    .eq('token', req.params.token)
    .maybeSingle()

  if (error || !invite) return res.status(404).json({ error: 'Invite not found' })

  if (invite.status !== 'pending') {
    return res.status(410).json({ error: 'This invite has already been used or revoked.' })
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark expired in DB (best-effort)
    supabase
      .from('circle_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id)
      .catch(() => {})
    return res.status(410).json({ error: 'This invite has expired.' })
  }

  return res.json({
    email: invite.email,
    name: invite.name || null,
    role: invite.role,
    recipient_name: invite.care_recipients?.full_name ?? 'Unknown',
  })
})

// POST /api/v1/invite/:token/accept
// Join the care circle associated with the invite token.
// Auth required — the user must be logged in (or sign up first).
router.post('/:token/accept', requireAuth, async (req, res) => {
  const { data: invite, error } = await supabase
    .from('circle_invites')
    .select('*')
    .eq('token', req.params.token)
    .maybeSingle()

  if (error || !invite) return res.status(404).json({ error: 'Invite not found' })

  if (invite.status !== 'pending') {
    return res.status(410).json({ error: 'This invite has already been used or revoked.' })
  }

  if (new Date(invite.expires_at) < new Date()) {
    supabase
      .from('circle_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id)
      .catch(() => {})
    return res.status(410).json({ error: 'This invite has expired.' })
  }

  // Add the user to the circle if not already a member
  const { data: existing } = await supabase
    .from('care_circles')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('recipient_id', invite.recipient_id)
    .maybeSingle()

  if (!existing) {
    const { error: joinError } = await supabase
      .from('care_circles')
      .insert({ user_id: req.user.id, recipient_id: invite.recipient_id, role: invite.role })

    if (joinError) return res.status(400).json({ error: joinError.message })
  }

  // Mark invite accepted
  await supabase
    .from('circle_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return res.json({ ok: true, recipient_id: invite.recipient_id })
})

module.exports = router
