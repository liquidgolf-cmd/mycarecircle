import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Pill, Calendar, Users } from 'lucide-react'

// Status removed — 5 items keeps the bottom nav comfortable on all phones
const navItems = [
  { to: '/home',         label: 'Home',   Icon: Home },
  { to: '/log',          label: 'Log',    Icon: BookOpen },
  { to: '/medications',  label: 'Meds',   Icon: Pill },
  { to: '/appointments', label: 'Appts',  Icon: Calendar },
  { to: '/circle',       label: 'Circle', Icon: Users },
]

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-dusk safe-area-bottom">
      <div className="flex">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-sage-light' : 'text-mist'
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
