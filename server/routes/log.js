const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { getMembership, getRecordAndMembership } = require('../middleware/membershipCheck')
const { sendNewEntryEmail } = require('../services/email')

const router = express.Router()
router.use(requireAuth)

// GET /api/v1/log?recipient_id=&page=1&limit=20&category=&search=
router.get('/', async (req, res) => {
  const { recipient_id, page = 1, limit = 20, category, search } = req.query

  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  let query = supabase
    .from('log_entries')
    .select('*', { count: 'exact' })
    .eq('recipient_id', recipient_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1)

  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('body', `%${search}%`)

  const { data: entries, error, count } = await query
  if (error) return res.status(400).json({ error: error.message })

  // Enrich with author profiles (2-query join workaround for auth.users FK)
  const authorIds = [...new Set((entries || []).map((e) => e.author_id))]
  let profileMap = {}
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds)
    profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  }

  const enriched = (entries || []).map((e) => ({
    ...e,
    author: profileMap[e.author_id] || null,
  }))

  return res.json({
    entries: enriched,
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil((count || 0) / limitNum),
  })
})

// POST /api/v1/log
router.post('/', async (req, res) => {
  const { recipient_id, category, body, severity = 'normal' } = req.body

  if (!recipient_id || !category || !body) {
    return res.status(400).json({ error: 'recipient_id, category, and body are required' })
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: 'body must be 2000 characters or fewer' })
  }

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })
  if (membership.role === 'viewer') return res.status(403).json({ error: 'Viewers cannot create log entries' })

  const validCategories = ['health', 'medication', 'mood', 'appointment', 'general']
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` })
  }

  const { data: entry, error } = await supabase
    .from('log_entries')
    .insert({ recipient_id, author_id: req.user.id, category, body: body.trim(), severity })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', req.user.id)
    .single()

  // ── Fire-and-forget: notify other circle members ──────────────────────────
  ;(async () => {
    try {
      const authorName = profiles?.full_name || req.user.email || 'A caregiver'

      // Get recipient name
      const { data: recipientRow } = await supabase
        .from('care_recipients').select('full_name').eq('id', recipient_id).single()
      const recipientName = recipientRow?.full_name || 'your loved one'

      // Get all circle members except the author
      const { data: members } = await supabase
        .from('care_circles')
        .select('user_id, profiles(full_name, notification_prefs)')
        .eq('recipient_id', recipient_id)
        .neq('user_id', req.user.id)

      console.log(`[notify] new entry: ${members?.length ?? 0} other member(s) in circle`)

      for (const m of members || []) {
        if (m.profiles?.notification_prefs?.email_new_entry === false) {
          console.log(`[notify] skipping ${m.user_id} — new entry alerts off`)
          continue
        }
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(m.user_id)
        const email = authUser?.email
        if (!email) continue
        await sendNewEntryEmail({
          to: email,
          memberName: m.profiles?.full_name || email,
          authorName,
          recipientName,
          category,
          body: body.trim(),
          severity,
        })
        console.log(`[notify] new entry email sent → ${email}`)
      }
    } catch (err) {
      console.error('[notify] new entry email error:', err.message)
    }
  })()

  return res.status(201).json({ entry: { ...entry, author: profiles || null } })
})

// PATCH /api/v1/log/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { body, category, severity } = req.body
  const updates = {}

  if (body !== undefined) {
    if (body.length > 2000) return res.status(400).json({ error: 'body must be 2000 characters or fewer' })
    updates.body = body.trim()
  }
  if (category !== undefined) updates.category = category
  if (severity !== undefined) updates.severity = severity

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  // Verify circle membership; authors can only edit their own entries
  const memberResult = await getRecordAndMembership(res, 'log_entries', id, req.user.id)
  if (!memberResult) return

  const { data: entry, error } = await supabase
    .from('log_entries')
    .update(updates)
    .eq('id', id)
    .eq('author_id', req.user.id) // only the author may edit their own entry
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  if (!entry) return res.status(404).json({ error: 'Entry not found or not authorized' })

  return res.json({ entry })
})

// DELETE /api/v1/log/:id
router.delete('/:id', async (req, res) => {
  const memberResult = await getRecordAndMembership(res, 'log_entries', req.params.id, req.user.id)
  if (!memberResult) return

  const { error } = await supabase
    .from('log_entries')
    .delete()
    .eq('id', req.params.id)
    .eq('author_id', req.user.id) // only the author may delete their own entry

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ message: 'Entry deleted' })
})

module.exports = router
