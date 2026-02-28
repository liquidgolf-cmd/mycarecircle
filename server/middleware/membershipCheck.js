const supabase = require('../services/supabase')

/**
 * Returns the circle membership row { role } for the given user + recipient,
 * or null if the user is not a member of that circle.
 *
 * @param {string} userId      - req.user.id from the auth middleware
 * @param {string} recipientId - care_recipient UUID from query/body
 * @returns {{ role: string } | null}
 */
async function getMembership(userId, recipientId) {
  if (!userId || !recipientId) return null
  const { data } = await supabase
    .from('care_circles')
    .select('role')
    .eq('user_id', userId)
    .eq('recipient_id', recipientId)
    .maybeSingle()
  return data // null = not a member; { role } = member
}

/**
 * For routes that operate on a record by ID (PATCH / DELETE), fetch the record
 * first to obtain its recipient_id, then verify circle membership.
 *
 * Sends 404 or 403 directly via `res` if the check fails, so callers should
 * just `return` when this returns null.
 *
 * @param {object} res       - Express response object
 * @param {string} table     - Supabase table name
 * @param {string} recordId  - UUID of the record being modified
 * @param {string} userId    - req.user.id
 * @returns {{ record: object, membership: object } | null}
 */
async function getRecordAndMembership(res, table, recordId, userId) {
  const { data: record } = await supabase
    .from(table)
    .select('id, recipient_id')
    .eq('id', recordId)
    .maybeSingle()

  if (!record) {
    res.status(404).json({ error: 'Not found' })
    return null
  }

  const membership = await getMembership(userId, record.recipient_id)
  if (!membership) {
    res.status(403).json({ error: 'Not a member of this care circle' })
    return null
  }

  return { record, membership }
}

module.exports = { getMembership, getRecordAndMembership }
