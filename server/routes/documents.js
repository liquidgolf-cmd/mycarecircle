const express = require('express')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { getMembership } = require('../middleware/membershipCheck')

const router = express.Router()
router.use(requireAuth)

const BUCKET = 'documents'

// POST /api/v1/documents/upload-url
// Returns a signed upload URL so the client can PUT the file directly to
// Supabase Storage without routing large files through the server.
router.post('/upload-url', async (req, res) => {
  const { recipient_id, file_name, mime_type } = req.body
  if (!recipient_id || !file_name || !mime_type) {
    return res.status(400).json({ error: 'recipient_id, file_name, and mime_type are required' })
  }

  // Verify caller belongs to the circle
  const { data: membership } = await supabase
    .from('care_circles')
    .select('role')
    .eq('user_id', req.user.id)
    .eq('recipient_id', recipient_id)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not a member of this circle' })

  // Unique path: recipient_id/userId/timestamp-filename
  const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${recipient_id}/${req.user.id}/${Date.now()}-${safeName}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error) return res.status(400).json({ error: error.message })

  return res.json({ signedUrl: data.signedUrl, path })
})

// GET /api/v1/documents?recipient_id=
// Returns documents list with short-lived signed download URLs.
router.get('/', async (req, res) => {
  const { recipient_id } = req.query
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })

  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .eq('recipient_id', recipient_id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })

  // Attach signed download URL (1 hour) and uploader name to each doc
  const uploaderIds = [...new Set((docs || []).map((d) => d.uploaded_by))]
  let profileMap = {}
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds)
    profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  }

  const enriched = await Promise.all(
    (docs || []).map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600)
      return {
        ...doc,
        url: urlData?.signedUrl || null,
        uploader: profileMap[doc.uploaded_by] || null,
      }
    })
  )

  return res.json({ documents: enriched })
})

// POST /api/v1/documents
// Save document metadata after the client has uploaded the file directly to Storage.
router.post('/', async (req, res) => {
  const { recipient_id, file_name, mime_type, storage_path, label, notes, file_size } = req.body

  if (!recipient_id || !file_name || !mime_type || !storage_path) {
    return res.status(400).json({ error: 'recipient_id, file_name, mime_type, and storage_path are required' })
  }

  const membership = await getMembership(req.user.id, recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })
  if (membership.role === 'viewer') return res.status(403).json({ error: 'Viewers cannot upload documents' })

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      recipient_id,
      uploaded_by: req.user.id,
      file_name: file_name.trim(),
      mime_type,
      storage_path,
      label: label?.trim() || null,
      notes: notes?.trim() || null,
      file_size: file_size || null,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.status(201).json({ document: doc })
})

// DELETE /api/v1/documents/:id
// Remove the DB record and the file from Storage.
router.delete('/:id', async (req, res) => {
  // Fetch record before deleting (needed for membership check and Storage cleanup)
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, recipient_id, uploaded_by')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const membership = await getMembership(req.user.id, doc.recipient_id)
  if (!membership) return res.status(403).json({ error: 'Not a member of this care circle' })
  if (membership.role !== 'admin' && doc.uploaded_by !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or the uploader can delete documents' })
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })

  // Remove from Storage — fire-and-forget
  if (doc?.storage_path) {
    supabase.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {})
  }

  return res.json({ ok: true })
})

module.exports = router
