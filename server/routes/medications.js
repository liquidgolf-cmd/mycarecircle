const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// GET /api/v1/medications?recipient_id=
router.get('/', async (req, res) => {
  const { recipient_id } = req.query
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('recipient_id', recipient_id)
    .order('is_active', { ascending: false })
    .order('name')

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ medications: data || [] })
})

// POST /api/v1/medications
router.post('/', async (req, res) => {
  const { recipient_id, name, dosage, frequency, prescribing_doctor, pharmacy, notes } = req.body

  if (!recipient_id || !name) {
    return res.status(400).json({ error: 'recipient_id and name are required' })
  }
  if (name.length > 100) return res.status(400).json({ error: 'name must be 100 characters or fewer' })
  if (notes && notes.length > 500) return res.status(400).json({ error: 'notes must be 500 characters or fewer' })

  const { data, error } = await supabase
    .from('medications')
    .insert({
      recipient_id,
      name: name.trim(),
      dosage: dosage || null,
      frequency: frequency || null,
      prescribing_doctor: prescribing_doctor || null,
      pharmacy: pharmacy || null,
      notes: notes || null,
      added_by: req.user.id,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  // Auto-log: fire-and-forget — never fails the request
  ;(async () => {
    try {
      const parts = [data.name]
      if (data.dosage) parts.push(data.dosage)
      if (data.frequency) parts.push(data.frequency)
      if (data.prescribing_doctor) parts.push(`prescribed by ${data.prescribing_doctor}`)
      await supabase.from('log_entries').insert({
        recipient_id: data.recipient_id,
        author_id: req.user.id,
        category: 'medication',
        body: `Added medication: ${parts.join(', ')}`,
        severity: 'normal',
      })
    } catch { /* silent */ }
  })()

  return res.status(201).json({ medication: data })
})

// PATCH /api/v1/medications/:id
router.patch('/:id', async (req, res) => {
  const allowed = ['name', 'dosage', 'frequency', 'prescribing_doctor', 'pharmacy', 'notes', 'is_active']
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const { data, error } = await supabase
    .from('medications')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Medication not found' })

  // Auto-log: fire-and-forget
  ;(async () => {
    try {
      let body
      if (updates.is_active === false) {
        body = `Discontinued medication: ${data.name}`
      } else if (updates.is_active === true) {
        body = `Restarted medication: ${data.name}`
      } else {
        const changed = Object.keys(updates).join(', ')
        body = `Updated medication: ${data.name} (${changed} changed)`
      }
      await supabase.from('log_entries').insert({
        recipient_id: data.recipient_id,
        author_id: req.user.id,
        category: 'medication',
        body,
        severity: 'normal',
      })
    } catch { /* silent */ }
  })()

  return res.json({ medication: data })
})

// DELETE /api/v1/medications/:id
router.delete('/:id', async (req, res) => {
  // Fetch name + recipient_id before deleting so we can write the log entry
  const { data: med } = await supabase
    .from('medications')
    .select('name, recipient_id')
    .eq('id', req.params.id)
    .single()

  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })

  // Auto-log: fire-and-forget
  if (med) {
    ;(async () => {
      try {
        await supabase.from('log_entries').insert({
          recipient_id: med.recipient_id,
          author_id: req.user.id,
          category: 'medication',
          body: `Removed medication: ${med.name}`,
          severity: 'normal',
        })
      } catch { /* silent */ }
    })()
  }

  return res.json({ message: 'Medication deleted' })
})

module.exports = router
