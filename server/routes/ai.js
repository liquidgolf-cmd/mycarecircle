const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const supabase = require('../services/supabase')
const { requireAuth } = require('../middleware/auth')
const { runDigestForRecipient } = require('../services/digest')

const router = express.Router()
router.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const WILLOW_SYSTEM_PROMPT = `You are Willow, a warm and gentle AI guide for The CareCircle. Your role is to quietly onboard a new family caregiver by learning about the person they care for — through calm, unhurried conversation, not forms.

Speak with warmth, patience, and simplicity. Keep each response to 1–3 sentences. Ask only one question at a time. Never rush or overwhelm. If the caregiver seems uncertain about any detail, reassure them gently that everything can be updated later — this is just a starting point.

Your goal is to gather the following through natural conversation:
- The care recipient's full name
- Their approximate age or date of birth
- Their city and state
- Their current medications (name, dosage, frequency if known)
- Their medical conditions and known allergies
- The names of EVERYONE who helps with care — family members, friends, neighbors, or anyone else involved

HELPERS — REQUIRED QUESTION:
You MUST ask "Who else helps you care for [name]?" before the conversation ends. This is not optional.
- Capture every name the user mentions as a helper — family, friends, neighbors, hired helpers, anyone
- If the user mentions a helper name anywhere in the conversation (e.g. "my sister Jane drives her to appointments"), add that name immediately
- Capture first names, full names, or however the user refers to them

DATA EXTRACTION — CRITICAL:
After every single response you send, you MUST append an <extract> JSON block containing all data collected so far in the conversation. The app uses this block to save data to the database — it is never shown to the user, so never reference or describe it.

Rules for the <extract> block:
- Include it after EVERY response, even your opening greeting
- recipient_name: once the user tells you a name, always include it as a string — never revert it to null
- age: a number (years) or null
- city, state: strings or null
- medications: array of strings, e.g. ["metformin 500mg twice daily", "lisinopril 10mg"]
- conditions: array of strings, e.g. ["type 2 diabetes", "hypertension"]
- allergies: array of strings, e.g. ["penicillin"]
- family_members: array of names of EVERYONE who helps with care — add a name the moment it is mentioned, never remove names already listed
- Keep accumulating — never drop data that was mentioned earlier in the conversation

Example after learning the recipient is Margaret, has diabetes, takes metformin, and her daughter Sarah and neighbor Tom help out:
<extract>{"recipient_name":"Margaret","age":null,"city":null,"state":null,"medications":["metformin 500mg daily"],"conditions":["type 2 diabetes"],"allergies":[],"family_members":["Sarah","Tom"]}</extract>

When you have recipient_name plus at least one other detail, offer to finish setup. The user can also say they're done at any time.

Begin by warmly welcoming the caregiver to The CareCircle and asking for the name of the person they are caring for.`

// POST /api/v1/ai/onboarding  (streaming)
router.post('/onboarding', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  // Empty messages = initial load; inject a silent starter so Willow sends its opening greeting
  const apiMessages = messages.length === 0
    ? [{ role: 'user', content: 'Hello' }]
    : messages

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Transfer-Encoding', 'chunked')

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: WILLOW_SYSTEM_PROMPT,
      messages: apiMessages,
    })

    stream.on('text', (text) => {
      res.write(text)
    })

    await stream.finalMessage()
    res.end()
  } catch (err) {
    console.error('Willow streaming error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service unavailable' })
    } else {
      res.end()
    }
  }
})

// POST /api/v1/ai/extract
// One-shot extraction of care recipient data from the full Willow conversation.
// Called by the client at "Finish Setup" time as a reliable fallback when the
// mid-stream <extract> blocks failed to populate extractedData on the client.
router.post('/extract', async (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Caregiver' : 'Willow'}: ${m.content}`)
    .join('\n\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Read this care-coordination onboarding conversation and extract information about the care recipient.

Return ONLY a single valid JSON object with exactly these keys (no extra text, no markdown, no code fences):
{"recipient_name":null,"age":null,"city":null,"state":null,"medications":[],"conditions":[],"allergies":[],"family_members":[]}

Rules:
- recipient_name: the full name of the person being cared for (string or null)
- age: a number in years (derive from DOB if given), or null
- city, state: strings or null
- medications: array of strings like "metformin 500mg twice daily"
- conditions: array of strings like "type 2 diabetes"
- allergies: array of strings like "penicillin"
- family_members: array of name strings of everyone who helps with care (family, friends, neighbors, anyone mentioned)

Conversation:
${conversationText}`,
        },
      ],
    })

    let text = response.content[0].text.trim()
    // Strip any accidental markdown code fences
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const extracted = JSON.parse(text)
    return res.json({ extracted })
  } catch (err) {
    console.error('[ai/extract] error:', err.message)
    return res.status(500).json({ error: 'Failed to extract data' })
  }
})

// POST /api/v1/ai/ocr
// Accepts a base64-encoded image and returns structured data extracted by Claude vision.
// mode=medication → extract prescription label fields
// mode=document   → extract free-text note + suggested category/severity
router.post('/ocr', async (req, res) => {
  const { image_base64, media_type, mode } = req.body

  if (!image_base64 || !media_type || !mode) {
    return res.status(400).json({ error: 'image_base64, media_type, and mode are required' })
  }
  if (!['medication', 'document'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be medication or document' })
  }

  const prompt = mode === 'medication'
    ? `Look at this image of a medication label or prescription bottle and extract the medication information.
Return ONLY a valid JSON object with exactly these keys (no extra text, no markdown):
{"name":"","dosage":"","frequency":"","prescribing_doctor":"","notes":""}
- name: medication name (string, required)
- dosage: dosage amount e.g. "10mg" (string or "")
- frequency: how often e.g. "twice daily" (string or "")
- prescribing_doctor: prescribing doctor's name without "Dr." prefix (string or "")
- notes: important instructions e.g. "take with food" (string or "")`
    : `Look at this image of a medical document, doctor's note, or handwritten note and extract its content.
Return ONLY a valid JSON object with exactly these keys (no extra text, no markdown):
{"body":"","category":"general","severity":"normal"}
- body: the full extracted text, cleaned up and readable (string)
- category: one of "health", "medication", "mood", "appointment", "general"
- severity: one of "normal", "concerning", "urgent"`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    let text = response.content[0].text.trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return res.json({ extracted: JSON.parse(text) })
  } catch (err) {
    console.error('[ai/ocr] error:', err.message)
    return res.status(500).json({ error: 'Failed to process image' })
  }
})

// POST /api/v1/ai/catchup
router.post('/catchup', async (req, res) => {
  const { recipient_id } = req.body
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' })

  const since = new Date()
  since.setDate(since.getDate() - 14)

  const { data: entries, error } = await supabase
    .from('log_entries')
    .select('created_at, category, body, severity')
    .eq('recipient_id', recipient_id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })

  if (!entries || entries.length === 0) {
    return res.json({ summary: "There haven't been any care log entries in the last 14 days." })
  }

  const entryText = entries
    .map((e) => `[${e.created_at.split('T')[0]} · ${e.category}${e.severity !== 'normal' ? ` · ${e.severity}` : ''}] ${e.body}`)
    .join('\n')

  const { data: aiResponse } = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Here are the last 14 days of care log entries:\n\n${entryText}\n\nPlease write a warm, plain-language summary under 200 words. Use flowing paragraphs — no bullet points. Cover notable health observations, any medication changes, upcoming appointments, the overall pattern, and flag anything worth discussing with a doctor.`,
      },
    ],
  })

  return res.json({ summary: aiResponse.content[0].text })
})

// POST /api/v1/ai/digest
// On-demand weekly digest for the caller's care circle (admin only).
// In production the cron job calls runWeeklyDigest(); this endpoint
// is useful for testing a single circle without waiting for Sunday.
router.post('/digest', async (req, res) => {
  const { data: membership } = await supabase
    .from('care_circles')
    .select('role, recipient_id, care_recipients(full_name)')
    .eq('user_id', req.user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return res.status(403).json({ error: 'Not in a circle' })
  if (membership.role !== 'admin') return res.status(403).json({ error: 'Admin role required' })

  try {
    const result = await runDigestForRecipient(
      membership.recipient_id,
      membership.care_recipients.full_name
    )
    return res.json(result)
  } catch (err) {
    console.error('[digest endpoint]', err.message)
    return res.status(500).json({ error: 'Failed to generate digest' })
  }
})

module.exports = router
