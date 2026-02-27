import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-charcoal">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-mid"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-mid z-10"
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
