import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCircle } from '../../context/CircleContext'

export default function RecipientSwitcher() {
  const { recipient, recipients, selectRecipient } = useCircle()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Nothing to show until the circle is loaded
  if (!recipient) return null

  // Always show a clickable dropdown — even with one recipient —
  // so "Add another person" is always discoverable.
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-cream transition-colors text-sm font-medium text-charcoal max-w-[200px]"
      >
        <span className="truncate">{recipient.full_name}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-border py-1 z-50">
          {recipients.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                selectRecipient(r.id)
                setOpen(false)
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-charcoal hover:bg-cream transition-colors"
            >
              <span className="truncate">{r.full_name}</span>
              {r.id === recipient.id && (
                <Check size={14} className="text-sage shrink-0 ml-2" />
              )}
            </button>
          ))}

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/onboarding?new=true')
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-sage font-medium hover:bg-cream transition-colors"
            >
              <Plus size={14} />
              Add another person
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
