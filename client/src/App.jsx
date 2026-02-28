import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CircleProvider } from './context/CircleContext'
import AppShell from './components/layout/AppShell'

// Lazy-load every page so each route is a separate chunk.
// AppShell stays eager — it's the layout wrapper, not a page.
const Welcome     = lazy(() => import('./pages/Welcome'))
const Signup      = lazy(() => import('./pages/Signup'))
const Login       = lazy(() => import('./pages/Login'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
const Onboarding  = lazy(() => import('./pages/Onboarding'))
const Home        = lazy(() => import('./pages/Home'))
const Log         = lazy(() => import('./pages/Log'))
const LogNew      = lazy(() => import('./pages/LogNew'))
const Medications = lazy(() => import('./pages/Medications'))
const Status      = lazy(() => import('./pages/Status'))
const Circle      = lazy(() => import('./pages/Circle'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Documents   = lazy(() => import('./pages/Documents'))
const Profile     = lazy(() => import('./pages/Profile'))
const Settings    = lazy(() => import('./pages/Settings'))

// Minimal inline fallback — matches the page background so there's no flash
function PageLoader() {
  return (
    <div className="min-h-screen bg-dawn flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-mist border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* CircleProvider lives here (above AppShell) so /onboarding can also call useCircle() */}
        <CircleProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#2c2c2c',
              color: '#f7f4ef',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#4a6e57', secondary: '#f7f4ef' } },
            error: { iconTheme: { primary: '#c47a7a', secondary: '#f7f4ef' } },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            {/* Invite acceptance — public landing page */}
            <Route path="/invite/:token" element={<InviteAccept />} />

            {/* Onboarding — full-screen chat, no AppShell nav */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected — wrapped in AppShell (CircleProvider + nav) */}
            <Route element={<AppShell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/log" element={<Log />} />
              <Route path="/log/new" element={<LogNew />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/status" element={<Status />} />
              <Route path="/circle" element={<Circle />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Suspense>
        </CircleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
