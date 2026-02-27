import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

/**
 * Resize + compress an image File to a JPEG Blob ≤ ~700 KB.
 * Uses a canvas so the payload stays well under the server's 1 MB body limit.
 */
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * OcrButton
 *
 * Props:
 *   mode        'medication' | 'document'
 *   onExtracted (data) => void   — called with the parsed JSON from the server
 *   label       optional button label (default "Scan")
 *   className   extra Tailwind classes
 */
export default function OcrButton({ mode, onExtracted, label = 'Scan', className = '' }) {
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    // Reset so the same file can be chosen again
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setProcessing(true)
    try {
      const compressed = await compressImage(file)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (ev) => resolve(ev.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })

      const { data } = await api.post('/ai/ocr', {
        image_base64: base64,
        media_type: 'image/jpeg',
        mode,
      })

      onExtracted(data.extracted)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not read image — try a clearer photo')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      {/* Hidden file input — no capture attr so user can choose camera OR gallery */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        title={mode === 'medication' ? 'Scan prescription label' : 'Scan document or note'}
        className={`inline-flex items-center gap-1.5 disabled:opacity-50 ${className}`}
      >
        {processing
          ? <Loader2 size={15} className="animate-spin" />
          : <Camera size={15} />
        }
        <span>{processing ? 'Reading…' : label}</span>
      </button>
    </>
  )
}
