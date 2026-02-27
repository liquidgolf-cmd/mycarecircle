import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import CategoryBadge from './CategoryBadge'

const severityStyles = {
  normal:     '',
  concerning: 'border-l-4 border-amber',
  urgent:     'border-l-4 border-rose',
}

export default function LogEntryCard({ entry, currentUserId, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isAuthor = entry.author_id === currentUserId
  const canEdit = isAuthor

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-border relative ${severityStyles[entry.severity] || ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={entry.category} />
          {entry.severity !== 'normal' && (
            <span className={`text-xs font-medium ${entry.severity === 'urgent' ? 'text-rose' : 'text-amber'}`}>
              {entry.severity === 'urgent' ? '⚠️ Urgent' : '⚠ Concerning'}
            </span>
          )}
        </div>

        {canEdit && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream text-mid transition-colors"
              aria-label="Entry options"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white border border-border rounded-xl shadow-lg py-1 w-32">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit?.(entry) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-charcoal hover:bg-cream"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete?.(entry) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose hover:bg-rose-light"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{entry.body}</p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 text-xs text-mid">
        <span>{entry.author?.full_name || 'Circle member'}</span>
        <span>·</span>
        <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  )
}
