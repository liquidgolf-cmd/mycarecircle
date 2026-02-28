import { useEffect } from 'react'
import { X } from 'lucide-react'

// On mobile: slides up as a bottom sheet (rounded-sheet corners)
// On sm+: centred dialog
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-night/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centred card on sm+ */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-sheet sm:rounded-card shadow-card-md max-h-[92vh] flex flex-col`}>
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-cloud rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:pt-5 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-night">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dawn transition-colors text-mist"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-dawn transition-colors text-mist z-10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}
