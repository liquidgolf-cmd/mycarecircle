import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'
import LogEntryCard from '../components/ui/LogEntryCard'
import Modal from '../components/ui/Modal'
import LogEntryForm from './LogNew'

const CATEGORIES = ['all', 'health', 'medication', 'mood', 'appointment', 'general']
const CAT_LABELS = { all: 'All', health: 'Health', medication: 'Medication', mood: 'Mood', appointment: 'Appt', general: 'General' }

export default function Log() {
  const { user } = useAuth()
  const { recipient } = useCircle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [editEntry, setEditEntry] = useState(null)

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && entries.length > 0) {
      const found = entries.find((e) => e.id === editId)
      if (found) setEditEntry(found)
    }
  }, [searchParams, entries])

  const fetchEntries = useCallback(async () => {
    if (!recipient) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        recipient_id: recipient.id,
        page,
        limit: 20,
        ...(category !== 'all' && { category }),
        ...(search && { search }),
      })
      const { data } = await api.get(`/log?${params}`)
      setEntries(data.entries || [])
      setTotalPages(data.pages || 1)
    } catch {
      toast.error('Failed to load log entries')
    } finally {
      setLoading(false)
    }
  }, [recipient, page, category, search])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  async function handleDelete(entry) {
    if (!window.confirm('Delete this entry?')) return
    try {
      await api.delete(`/log/${entry.id}`)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      toast.success('Entry deleted')
    } catch { toast.error('Could not delete entry') }
  }

  function handleSaved() {
    setEditEntry(null)
    setPage(1)
    fetchEntries()
  }

  if (!recipient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mist text-sm">Set up your care circle first.</p>
        <button onClick={() => navigate('/onboarding')} className="text-sage text-sm mt-2 hover:underline">
          Get started
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-night">Care Log</h1>
        <button
          onClick={() => navigate('/log/new')}
          className="flex items-center gap-1.5 bg-gradient-sage text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sage"
        >
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search entries…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-cloud text-sm text-night outline-none focus:ring-2 focus:ring-sage bg-white"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="px-3 py-2 rounded-xl border border-cloud bg-white text-mist hover:bg-dawn"
          >
            <X size={15} />
          </button>
        )}
      </form>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-sage text-white'
                : 'bg-white border border-cloud text-mist hover:bg-dawn'
            }`}
          >
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-card animate-pulse shadow-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <p className="text-mist text-sm">No entries found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <LogEntryCard
              key={entry.id}
              entry={entry}
              currentUserId={user?.id}
              onEdit={(e) => setEditEntry(e)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-full border border-cloud text-sm text-night disabled:opacity-40 hover:bg-dawn bg-white"
          >
            Previous
          </button>
          <span className="text-sm text-mist">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-full border border-cloud text-sm text-night disabled:opacity-40 hover:bg-dawn bg-white"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit bottom sheet */}
      <Modal isOpen={!!editEntry} onClose={() => setEditEntry(null)} title="Edit Entry">
        {editEntry && (
          <LogEntryForm
            existingEntry={editEntry}
            onSaved={handleSaved}
            onCancel={() => setEditEntry(null)}
          />
        )}
      </Modal>

      {/* FAB */}
      <button
        onClick={() => navigate('/log/new')}
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 w-14 h-14 bg-gradient-sage text-white rounded-full shadow-sage flex items-center justify-center hover:opacity-90 transition-opacity z-30 lg:hidden"
        aria-label="Add log entry"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
