/**
 * Weekly digest service.
 *
 * Generates an AI-powered 7-day summary for every active care circle
 * and emails it to all members who have email_digest=true in their
 * notification_prefs profile field.
 *
 * Called by:
 *   • node-cron scheduler (every Sunday 8 am) in index.js
 *   • POST /api/v1/ai/digest (on-demand, for testing)
 */

const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('./supabase')
const { sendDigestEmail } = require('./email')

const anthropic = new Anthropic()

/**
 * Generate a plain-text digest summary for one recipient using Claude.
 */
async function generateDigestText(recipientName, entries, statuses) {
  const entrySummary = entries.length
    ? entries
        .map((e) => `[${e.category}] ${e.body} (${new Date(e.created_at).toLocaleDateString()})`)
        .join('\n')
    : 'No log entries this week.'

  const statusSummary = statuses.length
    ? statuses
        .map((s) => `${s.status_date}: ${s.status}${s.note ? ` — ${s.note}` : ''}`)
        .join('\n')
    : 'No daily status check-ins this week.'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: `You are a warm, concise assistant generating a brief weekly care summary for family caregivers. Write in plain text (no markdown). Keep it to 3–5 short paragraphs. Be empathetic and factual.`,
    messages: [
      {
        role: 'user',
        content: `Please summarize the past week of care for ${recipientName}.\n\nDaily status check-ins:\n${statusSummary}\n\nCare log entries:\n${entrySummary}`,
      },
    ],
  })

  return message.content[0]?.text ?? 'No summary available.'
}

/**
 * Run the digest for a single recipient.
 * Returns { sent: number } — how many emails were dispatched.
 */
async function runDigestForRecipient(recipientId, recipientName) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch last 7 days of log entries
  const { data: entries } = await supabase
    .from('log_entries')
    .select('category, body, severity, created_at')
    .eq('recipient_id', recipientId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true })

  // Fetch last 7 days of daily status
  const { data: statuses } = await supabase
    .from('daily_status')
    .select('status, note, status_date')
    .eq('recipient_id', recipientId)
    .gte('status_date', sevenDaysAgo.slice(0, 10))
    .order('status_date', { ascending: true })

  // Only send if there's something to report
  if ((!entries || entries.length === 0) && (!statuses || statuses.length === 0)) {
    console.log(`[digest] ${recipientName}: no activity this week, skipping`)
    return { sent: 0 }
  }

  // Generate AI summary
  const digestText = await generateDigestText(recipientName, entries || [], statuses || [])

  // Find all members who want the weekly digest
  const { data: members } = await supabase
    .from('care_circles')
    .select('user_id, profiles(full_name, notification_prefs)')
    .eq('recipient_id', recipientId)

  // Fetch emails for each member from auth.users via the admin API
  let sent = 0
  for (const m of members || []) {
    const prefs = m.profiles?.notification_prefs ?? {}
    if (prefs.email_digest === false) continue

    // Get user's email from auth admin API
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(m.user_id)
    const email = authUser?.email
    const memberName = m.profiles?.full_name || email || 'Caregiver'

    if (!email) continue

    try {
      await sendDigestEmail({ to: email, memberName, recipientName, digestText })
      sent++
    } catch (err) {
      console.error(`[digest] failed to send to ${email}:`, err.message)
    }
  }

  console.log(`[digest] ${recipientName}: sent ${sent} email(s)`)
  return { sent }
}

/**
 * Run the weekly digest for ALL care circles.
 * Called by node-cron every Sunday at 8 am.
 */
async function runWeeklyDigest() {
  console.log('[digest] Starting weekly digest run…')

  // Get all unique recipients
  const { data: circles } = await supabase
    .from('care_circles')
    .select('recipient_id, care_recipients(full_name)')

  // Deduplicate recipients
  const seen = new Set()
  const recipients = []
  for (const c of circles || []) {
    if (!seen.has(c.recipient_id)) {
      seen.add(c.recipient_id)
      recipients.push({ id: c.recipient_id, name: c.care_recipients?.full_name ?? 'Unknown' })
    }
  }

  let totalSent = 0
  for (const r of recipients) {
    try {
      const { sent } = await runDigestForRecipient(r.id, r.name)
      totalSent += sent
    } catch (err) {
      console.error(`[digest] error for recipient ${r.id}:`, err.message)
    }
  }

  console.log(`[digest] Weekly digest complete. ${totalSent} total email(s) sent.`)
  return { recipients: recipients.length, totalSent }
}

module.exports = { runWeeklyDigest, runDigestForRecipient }
