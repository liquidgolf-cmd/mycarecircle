const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { getMembership } = require('../middleware/membershipCheck')
const { sendRedStatusEmail } = require('../services/email')

const router = express.Router()
router.use(requireAuth)

function todayUTC() {
  return new Date().toISOString().split('T')[0]
}

// GET /api/v1/status/today?recipient_id=
router.get('/today', async (req, res) => {
  const { recipient_id } = req.query
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })

  const { data, error } = await supabase
    .from('daily_status')
    .select('*')
    .eq('recipient_id', recipient_id)
    .eq('status_date', todayUTC())
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ status: data || null })
})

// POST /api/v1/status  (upsert — one record per recipient per date)
router.post('/', async (req, res) => {
  const { recipient_id, status, note, status_date } = req.body

  if (!recipient_id || !status) {
    return res.status(400).json({ error: 'recipient_id and status are required' })
  }

  const validStatuses = ['green', 'yellow', 'red']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be green, yellow, or red' })
  }

  if (note && note.length > 500) {
    return res.status(400).json({ error: 'note must be 500 characters or fewer' })
  }

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })
  if (membership.role === 'viewer') return res.status(403).json({ error: 'Viewers cannot submit a status check-in' })

  const date = status_date || todayUTC()

  const { data, error } = await supabase
    .from('daily_status')
    .upsert(
      { recipient_id, author_id: req.user.id, status, note: note || null, status_date: date },
      { onConflict: 'recipient_id,status_date' }
    )
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // ── Fire-and-forget: alert other members when status is red ──────────────
  if (status === 'red') {
    ;(async () => {
      try {
        // Get author's display name
        const { data: authorProfile } = await supabase
          .from('profiles').select('full_name').eq('id', req.user.id).single()
        const authorName = authorProfile?.full_name || req.user.email || 'A caregiver'

        // Get recipient name
        const { data: recipientRow } = await supabase
          .from('care_recipients').select('full_name').eq('id', recipient_id).single()
        const recipientName = recipientRow?.full_name || 'your loved one'

        // Get all other circle members
        const { data: members } = await supabase
          .from('care_circles')
          .select('user_id, profiles(full_name, notification_prefs)')
          .eq('recipient_id', recipient_id)
          .neq('user_id', req.user.id)

        console.log(`[notify] red status: ${members?.length ?? 0} other member(s) in circle`)

        for (const m of members || []) {
          if (m.profiles?.notification_prefs?.email_status_red === false) {
            console.log(`[notify] skipping ${m.user_id} — red status alerts off`)
            continue
          }
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(m.user_id)
          const email = authUser?.email
          if (!email) continue
          await sendRedStatusEmail({
            to: email,
            memberName: m.profiles?.full_name || email,
            authorName,
            recipientName,
            note: note || null,
          })
          console.log(`[notify] red status email sent → ${email}`)
        }
      } catch (err) {
        console.error('[notify] red status email error:', err.message)
      }
    })()
  }

  return res.json({ status: data })
})

// GET /api/v1/status/history?recipient_id=&days=30
router.get('/history', async (req, res) => {
  const { recipient_id, days = 30 } = req.query
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })

  const daysNum = Math.min(90, Math.max(1, parseInt(days)))
  const since = new Date()
  since.setDate(since.getDate() - daysNum)

  const { data, error } = await supabase
    .from('daily_status')
    .select('*')
    .eq('recipient_id', recipient_id)
    .gte('status_date', since.toISOString().split('T')[0])
    .order('status_date', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ history: data || [] })
})

module.exports = router
