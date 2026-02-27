import { useState, useRef, useCallback } from 'react'

/**
 * Web Speech API hook for voice input.
 * Returns isListening, isSupported, startListening, stopListening.
 * onResult(transcript) is called when speech is recognised.
 */
export function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult?.(transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isSupported, onResult])

  return { isListening, isSupported, startListening, stopListening }
}
