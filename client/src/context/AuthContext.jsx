import { createContext, useContext, useReducer, useEffect } from 'react'
import supabase from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        loading: false,
      }
    case 'SET_PROFILE':
      return { ...state, profile: action.payload }
    case 'CLEAR':
      return { ...initialState, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // On mount: restore session from our own token in localStorage
  useEffect(() => {
    const token = localStorage.getItem('cc_access_token')
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          dispatch({ type: 'SET_SESSION', payload: { user: data.user, session: { access_token: token } } })
          dispatch({ type: 'SET_PROFILE', payload: data.profile })
        })
        .catch(() => {
          localStorage.removeItem('cc_access_token')
          dispatch({ type: 'CLEAR' })
        })
    } else {
      dispatch({ type: 'CLEAR' })
    }
  }, [])

  // Listen only for explicit Supabase-managed events (OAuth, magic links, sign-out from another tab).
  // INITIAL_SESSION is intentionally ignored — cc_access_token is our source of truth.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          localStorage.setItem('cc_access_token', session.access_token)
          dispatch({ type: 'SET_SESSION', payload: { user: session.user, session } })
          try {
            const { data } = await api.get('/auth/me')
            dispatch({ type: 'SET_PROFILE', payload: data.profile })
          } catch { /* non-fatal */ }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('cc_access_token')
          dispatch({ type: 'CLEAR' })
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function signup({ email, password, full_name }) {
    const { data } = await api.post('/auth/signup', { email, password, full_name })
    if (data.session) {
      localStorage.setItem('cc_access_token', data.session.access_token)
      dispatch({ type: 'SET_SESSION', payload: { user: data.user, session: data.session } })
    }
    return data
  }

  async function login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.session) {
      localStorage.setItem('cc_access_token', data.session.access_token)
      dispatch({ type: 'SET_SESSION', payload: { user: data.user, session: data.session } })
      dispatch({ type: 'SET_PROFILE', payload: data.profile })
    }
    return data
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      await supabase.auth.signOut()
      localStorage.removeItem('cc_access_token')
      dispatch({ type: 'CLEAR' })
    }
  }

  async function refreshProfile() {
    try {
      const { data } = await api.get('/auth/me')
      dispatch({ type: 'SET_PROFILE', payload: data.profile })
    } catch { /* non-fatal */ }
  }

  async function forgotPassword(email) {
    await api.post('/auth/forgot-password', { email })
  }

  return (
    <AuthContext.Provider value={{ ...state, signup, login, logout, forgotPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
