/**
 * Health Check Script
 * Verifies that all required environment variables and external services
 * are correctly configured for My CareCircle backend.
 *
 * Usage: node server/scripts/healthCheck.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')

const PASS = '✅ PASS'
const FAIL = '❌ FAIL'

function result(label, passed, detail = '') {
  const status = passed ? PASS : FAIL
  const suffix = detail ? `  → ${detail}` : ''
  console.log(`  ${status}  ${label}${suffix}`)
  return passed
}

async function main() {
  console.log('\n═══════════════════════════════════════')
  console.log('  My CareCircle — Environment Health Check')
  console.log('═══════════════════════════════════════\n')

  let allPassed = true

  // ── 1. Required environment variables ──────────────────────────────────────
  console.log('1. Environment Variables')
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'FRONTEND_URL',
  ]
  for (const key of required) {
    const ok = Boolean(process.env[key])
    if (!result(key, ok, ok ? '' : 'not set')) allPassed = false
  }

  // ── 2. Supabase connection ──────────────────────────────────────────────────
  console.log('\n2. Supabase Connection')
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    result('Database query (profiles table)', true)

    // Verify all expected tables exist
    const tables = [
      'profiles', 'care_recipients', 'care_circles',
      'log_entries', 'medications', 'daily_status',
      'circle_invites', 'appointments', 'documents',
    ]
    for (const table of tables) {
      const { error: tableErr } = await supabase.from(table).select('id').limit(1)
      if (!result(`Table: ${table}`, !tableErr, tableErr?.message)) allPassed = false
    }
  } catch (err) {
    result('Supabase connection', false, err.message)
    allPassed = false
  }

  // ── 3. Anthropic API ────────────────────────────────────────────────────────
  console.log('\n3. Anthropic API')
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }],
    })
    const ok = resp?.content?.length > 0
    if (!result('API key valid & reachable', ok, ok ? '' : 'unexpected response')) allPassed = false
  } catch (err) {
    result('Anthropic API', false, err.message)
    allPassed = false
  }

  // ── 4. Resend ───────────────────────────────────────────────────────────────
  console.log('\n4. Resend Email')
  // We just verify the key is set — no live send to avoid spam/cost
  const resendKeySet = Boolean(process.env.RESEND_API_KEY)
  const fromSet = Boolean(process.env.RESEND_FROM_EMAIL)
  if (!result('RESEND_API_KEY present', resendKeySet)) allPassed = false
  if (!result('RESEND_FROM_EMAIL present', fromSet)) allPassed = false

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  if (allPassed) {
    console.log('  ✅ All checks passed — ready to run!\n')
  } else {
    console.log('  ❌ Some checks failed — review the output above.\n')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
