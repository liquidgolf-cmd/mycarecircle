import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Pill, Activity, Users, User, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/log', label: 'Care Log', Icon: BookOpen },
  { to: '/medications', label: 'Medications', Icon: Pill },
  { to: '/status', label: 'Daily Status', Icon: Activity },
  { to: '/circle', label: 'Care Circle', Icon: Users },
  { to: '/profile', label: 'Profile', Icon: User },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export default function Sidebar() {
  const { logout, profile } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-border shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <span className="text-xl mr-2">🌿</span>
        <span className="text-sage font-semibold text-base">My Care Circle</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sage text-white'
                  : 'text-mid hover:bg-cream hover:text-charcoal'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-sage-lighter flex items-center justify-center text-sage text-xs font-semibold">
            {profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">{profile?.full_name || '—'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-mid hover:text-charcoal transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
