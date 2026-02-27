import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CircleContext = createContext(null)

// localStorage key scoped to the logged-in user so switching accounts
// doesn't bleed the active recipient from a previous session.
const STORAGE_KEY = (userId) => `cc_active_${userId}`

const initialState = {
  recipient: null,
  recipients: [],   // all care recipients this user belongs to
  members: [],
  userRole: null,
  loading: true,
  error: null,
}

function circleReducer(state, action) {
  switch (action.type) {
    case 'SET_CIRCLE':
      return {
        ...state,
        recipient: action.payload.recipient,
        members: action.payload.members,
        userRole: action.payload.userRole,
        loading: false,
        error: null,
      }
    case 'SET_RECIPIENTS':
      return { ...state, recipients: action.payload }
    case 'CLEAR':
      return { ...initialState, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    default:
      return state
  }
}

export function CircleProvider({ children }) {
  const [state, dispatch] = useReducer(circleReducer, initialState)
  const { user, loading: authLoading } = useAuth()

  // Load a specific circle (by recipient ID) or fall back to the first one.
  const fetchCircle = useCallback(async (recipientId) => {
    if (!user) {
      dispatch({ type: 'CLEAR' })
      return
    }
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const url = recipientId ? `/circle?recipient_id=${recipientId}` : '/circle'
      const { data } = await api.get(url)
      dispatch({ type: 'SET_CIRCLE', payload: data })
      // Persist the active selection so the correct circle loads on refresh.
      if (data.recipient?.id) {
        localStorage.setItem(STORAGE_KEY(user.id), data.recipient.id)
      }
    } catch (err) {
      if (err.response?.status === 404) {
        dispatch({ type: 'CLEAR' })
      } else {
        dispatch({ type: 'SET_ERROR', payload: err.response?.data?.error || 'Failed to load circle' })
      }
    }
  }, [user])

  // Fetch the full list of recipients this user belongs to.
  const fetchRecipientsList = useCallback(async () => {
    if (!user) return []
    try {
      const { data } = await api.get('/circle/list')
      dispatch({ type: 'SET_RECIPIENTS', payload: data.recipients })
      return data.recipients
    } catch {
      return []
    }
  }, [user])

  // Switch the active recipient: persist to localStorage, reload circle data,
  // and refresh the recipients list (handles newly-created recipients).
  const selectRecipient = useCallback(async (id) => {
    if (user) localStorage.setItem(STORAGE_KEY(user.id), id)
    await Promise.all([fetchCircle(id), fetchRecipientsList()])
  }, [user, fetchCircle, fetchRecipientsList])

  // Re-load the currently-active circle (used by Onboarding after DB create).
  const refresh = useCallback(async () => {
    const storedId = user ? localStorage.getItem(STORAGE_KEY(user.id)) : undefined
    await fetchCircle(storedId || undefined)
  }, [user, fetchCircle])

  // On mount / user change: load recipients list then load the active circle.
  //
  // IMPORTANT: guard on authLoading before acting on user === null.
  // AuthContext starts with loading: true; without this guard the effect fires
  // immediately with user=null, dispatches CLEAR (loading: false, recipient: null),
  // and causes every page to flash the "no circle" empty state for ~500 ms while
  // api.get('/auth/me') is in flight.  Returning early keeps circleLoading: true
  // (from initialState) so the app stays in a neutral loading state until auth
  // resolves, then loads the correct circle on the second effect run.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      dispatch({ type: 'CLEAR' })
      return
    }
    const storedId = localStorage.getItem(STORAGE_KEY(user.id))
    fetchRecipientsList()
    fetchCircle(storedId || undefined)
  }, [authLoading, user, fetchCircle, fetchRecipientsList])

  return (
    <CircleContext.Provider value={{ ...state, refresh, selectRecipient }}>
      {children}
    </CircleContext.Provider>
  )
}

export function useCircle() {
  const ctx = useContext(CircleContext)
  if (!ctx) throw new Error('useCircle must be used within CircleProvider')
  return ctx
}
