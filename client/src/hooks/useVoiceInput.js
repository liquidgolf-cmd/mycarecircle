import { useState, useRef, useCallback } from 'react'

/**
 * Web Speech API hook for voice input.
 * Returns isListening, isSupported, startListening, stopListening,
 *         permissionDenied, noSpeechDetected.
 */
export function useVoiceInput(onResult) {
  const [isListening, setIsListening]         = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [noSpeechDetected, setNoSpeechDetected] = useState(false)

  const recognitionRef  = useRef(null)
  const gotResultRef    = useRef(false)   // did we receive a transcript before onend?
  const onResultRef     = useRef(onResult)
  onResultRef.current   = onResult

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror  = null
      recognitionRef.current.onend    = null
      try { recognitionRef.current.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return
    if (recognitionRef.current) return  // guard double-tap

    setPermissionDenied(false)
    setNoSpeechDetected(false)
    gotResultRef.current = false

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // continuous + interimResults lets the user speak longer naturally
    recognition.continuous      = true
    recognition.interimResults  = false
    recognition.lang            = 'en-US'

    // Auto-stop after 15 seconds so it never hangs forever
    const autoStopTimer = setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ignore */ }
      }
    }, 15000)

    recognition.onresult = (event) => {
      gotResultRef.current = true
      clearTimeout(autoStopTimer)
      // Collect all final results
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript.trim()) {
        onResultRef.current?.(transcript.trim())
      }
      // Stop after first complete utterance
      try { recognition.stop() } catch { /* ignore */ }
    }

    recognition.onerror = (event) => {
      clearTimeout(autoStopTimer)
      recognitionRef.current = null
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true)
      } else if (event.error === 'no-speech') {
        setNoSpeechDetected(true)
      }
    }

    recognition.onend = () => {
      clearTimeout(autoStopTimer)
      if (!gotResultRef.current) {
        setNoSpeechDetected(true)
      }
      recognitionRef.current = null
      setIsListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      clearTimeout(autoStopTimer)
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [isSupported])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    permissionDenied,
    noSpeechDetected,
  }
}
