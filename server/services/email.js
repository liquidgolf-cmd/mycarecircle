const { Resend } = require('resend')

// Use RESEND_FROM_EMAIL in production once your domain is verified in Resend.
// Resend's default onboarding@resend.dev works without domain verification (dev/testing).
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'My Care Circle <onboarding@resend.dev>'
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

let resend = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
} else {
  console.warn('[email] RESEND_API_KEY not set — emails will be logged to console only')
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[email:mock] to=${to} | subject="${subject}"`)
    return { id: 'mock' }
  }
  const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  if (error) throw new Error(error.message)
  return data
}

// ── Invite email ────────────────────────────────────────────────────────────

async function sendInviteEmail({ to, inviterName, recipientName, role, token }) {
  const inviteUrl = `${APP_URL}/invite/${token}`
  const roleLabel =
    role === 'admin' ? 'Admin' : role === 'contributor' ? 'Contributor' : 'Viewer'

  return sendEmail({
    to,
    subject: `${inviterName} invited you to My Care Circle — ${recipientName}'s circle`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f4ef;border-radius:16px">
        <h2 style="color:#2c2c2c;margin:0 0 12px">You're invited to join a care circle 💙</h2>
        <p style="color:#666;line-height:1.6;margin:0 0 20px">
          <strong>${inviterName}</strong> has invited you to help care for
          <strong>${recipientName}</strong> on My Care Circle as a
          <strong style="color:#4a6e57">${roleLabel}</strong>.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#4a6e57;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">
          Accept Invitation →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;line-height:1.5">
          This link expires in 7 days. If you weren't expecting this invitation you can safely ignore it.
        </p>
      </div>
    `,
  })
}

// ── Weekly digest email ─────────────────────────────────────────────────────

async function sendDigestEmail({ to, memberName, recipientName, digestText }) {
  // Convert newlines to HTML paragraphs for nicer email rendering
  const digestHtml = digestText
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:0 0 10px">${l}</p>`)
    .join('')

  return sendEmail({
    to,
    subject: `Weekly update for ${recipientName} — My Care Circle`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f4ef;border-radius:16px">
        <h2 style="color:#2c2c2c;margin:0 0 8px">Weekly Summary 🌿</h2>
        <p style="color:#666;margin:0 0 16px">
          Hi ${memberName}, here's the past week for <strong>${recipientName}</strong>:
        </p>
        <div style="background:#fff;padding:20px;border-radius:12px;color:#2c2c2c;line-height:1.7">
          ${digestHtml}
        </div>
        <p style="color:#999;font-size:12px;margin-top:20px;line-height:1.5">
          You're receiving this because you're part of ${recipientName}'s care circle on My Care Circle.
        </p>
      </div>
    `,
  })
}

// ── New log entry notification ───────────────────────────────────────────────

async function sendNewEntryEmail({ to, memberName, authorName, recipientName, category, body, severity }) {
  const severityBadge =
    severity === 'urgent'
      ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600">Urgent</span>'
      : severity === 'concerning'
      ? '<span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600">Concerning</span>'
      : ''

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1)

  return sendEmail({
    to,
    subject: `New ${categoryLabel} log for ${recipientName}${severity !== 'normal' ? ` — ${severity}` : ''}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f4ef;border-radius:16px">
        <h2 style="color:#2c2c2c;margin:0 0 12px">New care log entry 📋</h2>
        <p style="color:#666;line-height:1.6;margin:0 0 16px">
          Hi ${memberName}, <strong>${authorName}</strong> added a new
          <strong style="color:#4a6e57">${categoryLabel}</strong> entry for
          <strong>${recipientName}</strong>.
          ${severityBadge}
        </p>
        <div style="background:#fff;padding:20px;border-radius:12px;color:#2c2c2c;line-height:1.7;font-size:15px">
          ${body}
        </div>
        <a href="${APP_URL}/log"
           style="display:inline-block;margin-top:20px;background:#4a6e57;color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
          View full log →
        </a>
        <p style="color:#999;font-size:12px;margin-top:20px;line-height:1.5">
          You're receiving this because you're part of ${recipientName}'s care circle on My Care Circle.
        </p>
      </div>
    `,
  })
}

// ── Red status alert ─────────────────────────────────────────────────────────

async function sendRedStatusEmail({ to, memberName, authorName, recipientName, note }) {
  return sendEmail({
    to,
    subject: `⚠️ Status alert for ${recipientName} — needs attention`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fef2f2;border-radius:16px;border:2px solid #fca5a5">
        <h2 style="color:#dc2626;margin:0 0 12px">⚠️ Status alert</h2>
        <p style="color:#666;line-height:1.6;margin:0 0 16px">
          Hi ${memberName}, <strong>${authorName}</strong> marked
          <strong>${recipientName}</strong>'s status as
          <strong style="color:#dc2626">Red — needs attention</strong> today.
        </p>
        ${note ? `
        <div style="background:#fff;padding:16px;border-radius:12px;color:#2c2c2c;line-height:1.7;font-size:15px;margin-bottom:16px">
          ${note}
        </div>` : ''}
        <a href="${APP_URL}/home"
           style="display:inline-block;background:#dc2626;color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
          View care circle →
        </a>
        <p style="color:#999;font-size:12px;margin-top:20px;line-height:1.5">
          You're receiving this because you're part of ${recipientName}'s care circle on My Care Circle.
        </p>
      </div>
    `,
  })
}

module.exports = { sendEmail, sendInviteEmail, sendDigestEmail, sendNewEntryEmail, sendRedStatusEmail }
