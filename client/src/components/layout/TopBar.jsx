import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import RecipientSwitcher from '../ui/RecipientSwitcher'

export default function TopBar() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="h-14 bg-dusk flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Wordmark */}
      <button
        onClick={() => navigate('/home')}
        className="shrink-0 leading-none"
      >
        <span className="font-display text-lg text-cloud font-medium tracking-wide hidden sm:inline">
          My CareCircle
        </span>
        <span className="font-display text-lg text-cloud font-medium tracking-wide sm:hidden">
          MC
        </span>
      </button>

      {/* Recipient switcher — centered */}
      <RecipientSwitcher />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-twilight/60 transition-colors text-mist"
        >
          <Bell size={20} />
        </button>
        <button
          aria-label="Account"
          onClick={() => navigate('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-twilight text-cloud font-semibold text-sm hover:bg-horizon transition-colors"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
