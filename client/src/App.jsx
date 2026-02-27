import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CircleProvider } from './context/CircleContext'
import AppShell from './components/layout/AppShell'

// Public pages
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import InviteAccept from './pages/InviteAccept'

// Onboarding — full-screen, auth-guarded but no nav chrome
import Onboarding from './pages/Onboarding'

// Protected pages (inside AppShell with nav)
import Home from './pages/Home'
import Log from './pages/Log'
import LogNew from './pages/LogNew'
import Medications from './pages/Medications'
import Status from './pages/Status'
import Circle from './pages/Circle'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

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
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
        </CircleProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
