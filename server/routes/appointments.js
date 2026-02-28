const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { sendAppointmentEmail } = require('../services/email')

const router = express.Router()
router.use(requireAuth)

// GET /api/v1/appointments?recipient_id=
// Returns all appointments (upcoming first, then past) with assignee profile attached.
router.get('/', async (req, res) => {
  const { recipient_id } = req.query
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('recipient_id', recipient_id)
    .order('appt_date', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })

  // Enrich with assignee display name
  const assigneeIds = [...new Set((data || []).map((a) => a.assignee_id).filter(Boolean))]
  let profileMap = {}
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', assigneeIds)
    profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  }

  const enriched = (data || []).map((a) => ({
    ...a,
    assignee: profileMap[a.assignee_id] || null,
  }))

  return res.json({ appointments: enriched })
})

// POST /api/v1/appointments
// Create appointment, auto-log it, and email the assignee if set.
router.post('/', async (req, res) => {
  const { recipient_id, title, doctor, location, appt_date, assignee_id, notes } = req.body

  if (!recipient_id || !title || !appt_date) {
    return res.status(400).json({ error: 'recipient_id, title, and appt_date are required' })
  }
  if (title.length > 200) return res.status(400).json({ error: 'title must be 200 characters or fewer' })

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      recipient_id,
      created_by: req.user.id,
      assignee_id: assignee_id || null,
      title: title.trim(),
      doctor: doctor?.trim() || null,
      location: location?.trim() || null,
      appt_date,
      notes: notes?.trim() || null,
      status: 'upcoming',
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // Auto-log entry — fire-and-forget
  ;(async () => {
    try {
      const dateStr = new Date(appt_date).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
      const parts = [`Scheduled appointment: ${appt.title}`]
      if (appt.doctor) parts.push(`with ${appt.doctor}`)
      if (appt.location) parts.push(`at ${appt.location}`)
      parts.push(`on ${dateStr}`)
      await supabase.from('log_entries').insert({
        recipient_id,
        author_id: req.user.id,
        category: 'appointment',
        body: parts.join(', '),
        severity: 'normal',
      })
    } catch { /* silent */ }
  })()

  // Email assignee — fire-and-forget
  if (assignee_id) {
    ;(async () => {
      try {
        const [
          { data: assigneeProfile },
          { data: { user: authUser } },
          { data: creatorProfile },
          { data: recipientRow },
        ] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', assignee_id).single(),
          supabase.auth.admin.getUserById(assignee_id),
          supabase.from('profiles').select('full_name').eq('id', req.user.id).single(),
          supabase.from('care_recipients').select('full_name').eq('id', recipient_id).single(),
        ])
        const email = authUser?.email
        if (email) {
          await sendAppointmentEmail({
            to: email,
            assigneeName: assigneeProfile?.full_name || email,
            assignerName: creatorProfile?.full_name || req.user.email,
            recipientName: recipientRow?.full_name || 'your loved one',
            title: appt.title,
            doctor: appt.doctor,
            location: appt.location,
            apptDate: appt.appt_date,
            notes: appt.notes,
          })
        }
      } catch (err) {
        console.error('[appointments] assignee email error:', err.message)
      }
    })()
  }

  return res.status(201).json({ appointment: appt })
})

// PATCH /api/v1/appointments/:id
router.patch('/:id', async (req, res) => {
  const allowed = ['title', 'doctor', 'location', 'appt_date', 'assignee_id', 'notes', 'status']
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Appointment not found' })

  // Auto-log status changes
  if (updates.status && updates.status !== 'upcoming') {
    ;(async () => {
      try {
        const label = updates.status === 'completed' ? 'Completed' : 'Cancelled'
        await supabase.from('log_entries').insert({
          recipient_id: data.recipient_id,
          author_id: req.user.id,
          category: 'appointment',
          body: `${label} appointment: ${data.title}`,
          severity: 'normal',
        })
      } catch { /* silent */ }
    })()
  }

  return res.json({ appointment: data })
})

// DELETE /api/v1/appointments/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ ok: true })
})

module.exports = router
