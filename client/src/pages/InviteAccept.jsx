/**
 * /invite/:token — Invite acceptance landing page.
 *
 * Flow:
 *  1. Fetch invite details from the public GET /invite/:token endpoint.
 *  2. If valid, show what circle the user is being invited to join.
 *  3. If the user is already logged in, offer an "Accept" button.
 *  4. If not logged in, redirect to /signup (or /login) preserving the token
 *     so they land back here after authenticating.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const ROLE_LABELS = {
  admin: 'Admin',
  contributor: 'Contributor',
  viewer: 'Viewer',
}

export default function InviteAccept() {
  const { token } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { refresh } = useCircle()
  const navigate = useNavigate()

  const [invite, setInvite] = useState(null)   // { email, role, recipient_name }
  const [status, setStatus] = useState('loading') // loading | valid | error | accepted
  const [errorMsg, setErrorMsg] = useState('')
  const [accepting, setAccepting] = useState(false)

  // Look up the invite (public, no auth needed)
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Invalid invite link.')
      return
    }

    api.get(`/invite/${token}`)
      .then(({ data }) => {
        setInvite(data)
        setStatus('valid')
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(
          err.response?.data?.error || 'This invite link is invalid or has expired.'
        )
      })
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    try {
      await api.post(`/invite/${token}/accept`)
      await refresh()           // reload CircleContext so the new circle is visible
      toast.success(`You've joined ${invite?.recipient_name}'s care circle!`)
      setStatus('accepted')
      setTimeout(() => navigate('/home', { replace: true }), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  // Show a spinner while auth is resolving or invite is loading
  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / wordmark */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-sage rounded-2xl flex items-center justify-center text-white text-xl">🌿</div>
          <span className="text-xl font-semibold text-charcoal">My Care Circle</span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm text-center">
          {/* Error state */}
          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">😔</div>
              <h1 className="text-lg font-semibold text-charcoal mb-2">Invite not available</h1>
              <p className="text-sm text-mid mb-6">{errorMsg}</p>
              <Link
                to="/login"
                className="inline-block bg-sage text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-sage-light transition-colors"
              >
                Go to Login
              </Link>
            </>
          )}

          {/* Accepted state */}
          {status === 'accepted' && (
            <>
              <div className="text-4xl mb-4">🎉</div>
              <h1 className="text-lg font-semibold text-charcoal mb-2">You're in!</h1>
              <p className="text-sm text-mid">Redirecting to your home page…</p>
            </>
          )}

          {/* Valid invite — not yet logged in */}
          {status === 'valid' && !user && (
            <>
              <div className="text-4xl mb-4">💙</div>
              <h1 className="text-lg font-semibold text-charcoal mb-2">You're invited!</h1>
              <p className="text-sm text-mid mb-1">
                You've been invited to join{' '}
                <strong>{invite?.recipient_name}'s</strong> care circle as a{' '}
                <strong>{ROLE_LABELS[invite?.role] ?? invite?.role}</strong>.
              </p>
              <p className="text-sm text-mid mb-6">
                Sign in or create a free account to accept.
              </p>
              <div className="space-y-2">
                <Link
                  to={`/signup?invite=${token}`}
                  className="block w-full bg-sage text-white py-3 rounded-xl text-sm font-medium hover:bg-sage-light transition-colors"
                >
                  Create an account
                </Link>
                <Link
                  to={`/login?invite=${token}`}
                  className="block w-full border border-border text-charcoal py-3 rounded-xl text-sm font-medium hover:bg-cream transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}

          {/* Valid invite — logged in */}
          {status === 'valid' && user && (
            <>
              <div className="text-4xl mb-4">💙</div>
              <h1 className="text-lg font-semibold text-charcoal mb-2">You're invited!</h1>
              <p className="text-sm text-mid mb-6">
                Join <strong>{invite?.recipient_name}'s</strong> care circle as a{' '}
                <strong>{ROLE_LABELS[invite?.role] ?? invite?.role}</strong>.
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-sage text-white py-3 rounded-xl text-sm font-medium hover:bg-sage-light disabled:opacity-50 transition-colors"
              >
                {accepting ? 'Joining…' : 'Accept Invitation'}
              </button>
              <p className="text-xs text-mid mt-4">
                Signed in as <strong>{user.email}</strong>.{' '}
                <Link to="/login" className="text-sage hover:underline">
                  Not you?
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
