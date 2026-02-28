import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Image, Upload, Trash2, Download, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCircle } from '../context/CircleContext'
import api from '../services/api'

const LABELS = ['Medical Record', 'Lab Result', 'Insurance', 'Prescription', 'Doctor Note', 'Hospital Discharge', 'Other']

function FileIcon({ mimeType, size = 24 }) {
  const isImage = mimeType?.startsWith('image/')
  const Icon = isImage ? Image : FileText
  const color = isImage ? 'text-amber' : 'text-sage'
  return <Icon size={size} className={color} />
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Documents() {
  const { recipient } = useCircle()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Upload form state
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const fileInputRef = useRef(null)

  const fetchDocuments = useCallback(async () => {
    if (!recipient) return
    setLoading(true)
    try {
      const { data } = await api.get(`/documents?recipient_id=${recipient.id}`)
      setDocuments(data.documents || [])
    } catch {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [recipient])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  function resetForm() {
    setFile(null)
    setLabel('')
    setNotes('')
    setUploadProgress(null)
    setShowForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowed.includes(f.type)) {
      toast.error('Only photos (JPEG, PNG, WebP, HEIC) and PDFs are supported')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('File must be under 20 MB')
      return
    }
    setFile(f)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadProgress('Getting upload URL…')

    try {
      // Step 1: get a signed upload URL from our server
      const { data: urlData } = await api.post('/documents/upload-url', {
        recipient_id: recipient.id,
        file_name: file.name,
        mime_type: file.type,
      })

      setUploadProgress('Uploading…')

      // Step 2: PUT the file directly to Supabase Storage
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed (${uploadRes.status})`)
      }

      setUploadProgress('Saving…')

      // Step 3: save metadata to our DB
      await api.post('/documents', {
        recipient_id: recipient.id,
        file_name: file.name,
        mime_type: file.type,
        storage_path: urlData.path,
        label: label || undefined,
        notes: notes.trim() || undefined,
        file_size: file.size,
      })

      toast.success('Document uploaded')
      resetForm()
      fetchDocuments()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/documents/${id}`)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      toast.success('Document removed')
    } catch {
      toast.error('Failed to remove document')
    }
  }

  if (!recipient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText size={40} className="text-mid mb-4" />
        <h2 className="text-lg font-semibold text-charcoal mb-2">No care circle yet</h2>
        <p className="text-mid text-sm">Set up a circle first to start storing documents.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Documents</h1>
          <p className="text-sm text-mid mt-0.5">
            Medical records, lab results &amp; more for <strong>{recipient.full_name}</strong>
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
          className="flex items-center gap-1.5 bg-sage text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-sage-light transition-colors"
        >
          <Plus size={15} />
          Upload
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-charcoal mb-4">Upload a document</h2>
          <form onSubmit={handleUpload} className="space-y-3">

            {/* File drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? 'border-sage bg-sage/5' : 'border-border hover:border-sage/50 hover:bg-cream'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileIcon mimeType={file.type} size={20} />
                  <span className="text-sm font-medium text-charcoal truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-mid">({formatBytes(file.size)})</span>
                  <button
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-mid hover:text-rose ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-mid mx-auto mb-2" />
                  <p className="text-sm text-mid">Tap to select a photo or PDF</p>
                  <p className="text-xs text-mid mt-0.5">JPEG, PNG, WebP, HEIC, PDF — up to 20 MB</p>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-mid mb-1 uppercase tracking-wide">Label</label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage bg-white"
              >
                <option value="">No label</option>
                {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-mid mb-1 uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What is this document? Any context…"
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage resize-none"
              />
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-sage font-medium">
                <span className="w-4 h-4 border-2 border-sage border-t-transparent rounded-full animate-spin shrink-0" />
                {uploadProgress}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-charcoal hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage-light disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents list */}
      <section>
        <h2 className="text-xs font-semibold text-mid uppercase tracking-wide mb-3">
          All Documents ({documents.length})
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <FileText size={32} className="text-mid mx-auto mb-3" />
            <p className="text-sm font-medium text-charcoal mb-1">No documents yet</p>
            <p className="text-xs text-mid">Upload medical records, lab results, prescriptions, and more.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                <div className="shrink-0">
                  <FileIcon mimeType={doc.mime_type} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {doc.label && (
                      <span className="text-xs bg-sage/10 text-sage px-2 py-0.5 rounded-full font-medium">
                        {doc.label}
                      </span>
                    )}
                    <span className="text-xs text-mid">
                      {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {doc.uploader?.full_name && (
                      <span className="text-xs text-mid">· {doc.uploader.full_name}</span>
                    )}
                    {doc.file_size && (
                      <span className="text-xs text-mid">· {formatBytes(doc.file_size)}</span>
                    )}
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-mid mt-0.5 truncate">{doc.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream text-mid hover:text-charcoal transition-colors"
                      aria-label="Download"
                    >
                      <Download size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose/10 text-mid hover:text-rose transition-colors"
                    aria-label="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
