const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// Dedicated Supabase client for auth-only operations (signup / login / logout).
// Kept separate from the shared service-role client in ../services/supabase so
// that supabase.auth.signInWithPassword() — which stores the user session in
// memory — never leaks into that singleton and causes data routes to send the
// user JWT as the Authorization header, which would re-enable RLS and break
// service-role inserts.
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/v1/auth/signup
// Uses admin.createUser with email_confirm:true so users don't need to
// verify their email before using the app (appropriate for MVP).
router.post('/signup', async (req, res) => {
  const { email, password, full_name } = req.body

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, and full_name are required' })
  }

  if (full_name.length > 100) {
    return res.status(400).json({ error: 'full_name must be 100 characters or fewer' })
  }

  const cleanEmail = email.trim().toLowerCase()

  // Create the user with email pre-confirmed so the session is available immediately
  const { data: created, error: createError } = await authClient.auth.admin.createUser({
    email: cleanEmail,
    password,
    user_metadata: { full_name: full_name.trim() },
    email_confirm: true,
  })

  if (createError) {
    return res.status(400).json({ error: createError.message })
  }

  // Sign in to get a live session token
  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (signInError) {
    return res.status(400).json({ error: signInError.message })
  }

  return res.status(201).json({
    user: signIn.user,
    session: signIn.session,
  })
})

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    return res.status(401).json({ error: error.message })
  }

  return res.json({
    user: data.user,
    session: data.session,
  })
})

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader.split(' ')[1]

  const { error } = await authClient.auth.admin.signOut(token)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.json({ message: 'Logged out successfully' })
})

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Profile not found' })
  }

  return res.json({
    user: req.user,
    profile,
  })
})

// PATCH /api/v1/auth/profile
// Update the caller's own profile (full_name, notification_prefs)
router.patch('/profile', requireAuth, async (req, res) => {
  const allowed = ['full_name', 'notification_prefs']
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  if (updates.full_name !== undefined) {
    if (!updates.full_name || !updates.full_name.trim()) {
      return res.status(400).json({ error: 'full_name cannot be empty' })
    }
    updates.full_name = updates.full_name.trim().slice(0, 100)
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  return res.json({ profile })
})

// POST /api/v1/auth/forgot-password (magic link)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'email is required' })
  }

  const { error } = await authClient.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${process.env.FRONTEND_URL}/reset-password` }
  )

  // Always return 200 to avoid email enumeration
  if (error) {
    console.error('Reset password error:', error.message)
  }

  return res.json({ message: 'If that email exists, a reset link has been sent.' })
})

module.exports = router
