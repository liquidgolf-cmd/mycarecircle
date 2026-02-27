const { createClient } = require('@supabase/supabase-js')

// Dedicated client used ONLY for validating incoming user JWTs.
// Kept isolated from the shared service-role data client
// (../services/supabase) so that auth.getUser(userJwt) — which stores
// the validated user session in the GoTrueClient's internal state —
// cannot contaminate the Authorization header used by data operations.
// Without this separation, the data client would switch from sending
//   Authorization: Bearer <service_role_key>   (bypasses RLS)
// to
//   Authorization: Bearer <user_jwt>           (RLS is enforced)
// causing every Supabase insert/update to fail with an RLS violation.
let _tokenValidationClient = null
function getTokenValidationClient() {
  if (!_tokenValidationClient) {
    _tokenValidationClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _tokenValidationClient
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { data, error } = await getTokenValidationClient().auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = data.user
  next()
}

module.exports = { requireAuth }
