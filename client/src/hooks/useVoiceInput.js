import { useState, useRef, useCallback } from 'react'

/**
 * Web Speech API hook for voice input.
 * Returns isListening, isSupported, startListening, stopListening, permissionDenied.
 * onResult(transcript) is called when speech is recognised.
 *
 * Fixes vs original:
 *  - onResult stored in a ref so startListening never rebuilds on re-render
 *  - try/catch around recognition.start() to prevent unhandled throws
 *  - Guard against calling start() when already listening
 *  - Cleans up handlers on error/end to prevent memory leaks
 *  - Exposes permissionDenied so callers can show a helpful message
 */
export function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const recognitionRef = useRef(null)

  // Keep onResult in a ref so startListening stays stable across renders
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return
    if (recognitionRef.current) return // already listening — ignore double-tap

    setPermissionDenied(false)

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResultRef.current?.(transcript)
      recognitionRef.current = null
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      recognitionRef.current = null
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true)
      }
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
    } catch (err) {
      // start() can throw InvalidStateError if already started, or NotAllowedError
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [isSupported]) // stable — onResult is read from ref, not captured

  return { isListening, isSupported, startListening, stopListening, permissionDenied }
}
