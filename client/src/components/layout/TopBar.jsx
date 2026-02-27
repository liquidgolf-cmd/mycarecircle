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
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Logo — hide text on very small screens to give RecipientSwitcher room */}
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 text-sage font-semibold text-base shrink-0"
      >
        <span className="text-xl">🌿</span>
        <span className="hidden sm:inline">My Care Circle</span>
      </button>

      {/* Recipient switcher — centered */}
      <RecipientSwitcher />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-mid"
        >
          <Bell size={20} />
        </button>
        <button
          aria-label="Account"
          onClick={() => navigate('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-sage-lighter text-sage font-semibold text-sm hover:bg-sage-light hover:text-white transition-colors"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
