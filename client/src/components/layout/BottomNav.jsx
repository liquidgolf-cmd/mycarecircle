import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Pill, Activity, Users, Calendar } from 'lucide-react'

const navItems = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/log', label: 'Log', Icon: BookOpen },
  { to: '/medications', label: 'Meds', Icon: Pill },
  { to: '/appointments', label: 'Appts', Icon: Calendar },
  { to: '/status', label: 'Status', Icon: Activity },
  { to: '/circle', label: 'Circle', Icon: Users },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-bottom">
      <div className="flex">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-sage' : 'text-mid'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
