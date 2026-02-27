const config = {
  health:      { label: 'Health',      bg: 'bg-rose-light',         text: 'text-rose',        icon: '🩺' },
  medication:  { label: 'Medication',  bg: 'bg-blue-100',           text: 'text-blue-700',    icon: '💊' },
  mood:        { label: 'Mood',        bg: 'bg-amber-light',        text: 'text-amber',       icon: '😊' },
  appointment: { label: 'Appointment', bg: 'bg-sage-lighter',       text: 'text-sage',        icon: '📅' },
  general:     { label: 'General',     bg: 'bg-cream-dark',         text: 'text-mid',         icon: '📝' },
}

export default function CategoryBadge({ category, showIcon = true }) {
  const c = config[category] || config.general
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {showIcon && <span>{c.icon}</span>}
      {c.label}
    </span>
  )
}

export { config as categoryConfig }
