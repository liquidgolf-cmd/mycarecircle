import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useCircle } from '../context/CircleContext'
import { useVoiceInput } from '../hooks/useVoiceInput'
import api from '../services/api'

function parseExtract(text) {
  const match = text.match(/<extract>([\s\S]*?)<\/extract>/)
  if (!match) return null
  try { return JSON.parse(match[1]) } catch { return null }
}

function stripExtract(text) {
  return text.replace(/<extract>[\s\S]*?<\/extract>/g, '').trim()
}

function mergeExtracted(prev, next) {
  if (!next) return prev
  const merged = { ...prev }
  if (next.recipient_name) merged.recipient_name = next.recipient_name
  if (next.age) merged.age = next.age
  if (next.city) merged.city = next.city
  if (next.state) merged.state = next.state
  if (next.medications?.length) merged.medications = [...new Set([...prev.medications, ...next.medications])]
  if (next.conditions?.length) merged.conditions = [...new Set([...prev.conditions, ...next.conditions])]
  if (next.allergies?.length) merged.allergies = [...new Set([...prev.allergies, ...next.allergies])]
  if (next.family_members?.length) merged.family_members = [...new Set([...prev.family_members, ...next.family_members])]
  return merged
}

export default function Onboarding() {
  const { user } = useAuth()
  const { recipient, refresh, selectRecipient } = useCircle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // ?new=true — adding a second (or subsequent) person; skip the "already
  // onboarded" redirect and start a fresh Willow conversation.
  const isNew = searchParams.get('new') === 'true'

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [recipientId, setRecipientId] = useState(null)
  const [extractedData, setExtractedData] = useState({
    recipient_name: null, age: null, city: null, state: null,
    medications: [], conditions: [], allergies: [], family_members: [],
  })
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recipientIdRef = useRef(null)
  const willowStarted = useRef(false)
  const voiceModeRef = useRef(false)
  const wasStreamingRef = useRef(false)
  const syncInProgressRef = useRef(false)

  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { recipientIdRef.current = recipientId }, [recipientId])

  // Already onboarded → go home, but only if:
  //   (a) the chat hasn't started yet (messages still empty), AND
  //   (b) the user didn't arrive via "Add another person" (?new=true).
  useEffect(() => {
    if (recipient && messages.length === 0 && !isNew) navigate('/home', { replace: true })
  }, [recipient, messages.length, isNew, navigate])

  // Willow's opening message — gated on `user` to ensure token is available.
  useEffect(() => {
    if (!user) return
    if (willowStarted.current) return
    willowStarted.current = true

    const controller = new AbortController()
    sendToWillow([], controller.signal)

    return () => {
      controller.abort()
      willowStarted.current = false
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput((transcript) => {
    if (voiceModeRef.current) {
      sendMessage(transcript)
    } else {
      setInput((prev) => prev + (prev ? ' ' : '') + transcript)
    }
  })

  // Auto-restart mic after Willow finishes responding (voice mode only)
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming && voiceModeRef.current) {
      const timer = setTimeout(() => {
        if (voiceModeRef.current) startListening()
      }, 800)
      return () => clearTimeout(timer)
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming, startListening])

  async function sendToWillow(conversationMessages, signal = null) {
    setIsStreaming(true)
    const newMsgIndex = conversationMessages.length

    setMessages((prev) => [
      ...prev.filter((m) => !m.streaming),
      { role: 'assistant', content: '', streaming: true },
    ])

    try {
      const token = localStorage.getItem('cc_access_token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: conversationMessages }),
        signal: signal ?? undefined,
      })

      if (signal?.aborted) return
      if (!response.ok) throw new Error('AI error')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (signal?.aborted) return
        fullText += decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m, i) =>
            i === newMsgIndex ? { ...m, content: stripExtract(fullText) } : m
          )
        )
      }

      if (signal?.aborted) return

      const extracted = parseExtract(fullText)
      const displayText = stripExtract(fullText)

      setMessages((prev) =>
        prev.map((m, i) =>
          i === newMsgIndex ? { role: 'assistant', content: displayText, streaming: false } : m
        )
      )

      if (extracted) {
        setExtractedData((prev) => {
          const merged = mergeExtracted(prev, extracted)
          syncToDatabase(merged, recipientIdRef.current)
          return merged
        })
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        toast.error('Willow is unavailable. Please try again.')
      }
    } finally {
      if (!signal?.aborted) {
        setMessages((prev) => prev.filter((m) => !m.streaming))
        setIsStreaming(false)
        setTimeout(() => inputRef.current?.focus(), 100)
        refresh()
      }
    }
  }

  async function syncToDatabase(data, currentRecipientId) {
    if (!data.recipient_name) return
    try {
      if (!currentRecipientId) {
        if (syncInProgressRef.current) return
        syncInProgressRef.current = true
        try {
          const { data: res } = await api.post('/circle/create', {
            full_name: data.recipient_name,
            city: data.city || null,
            state: data.state || null,
            conditions: data.conditions,
            allergies: data.allergies,
          })
          const newId = res.recipient.id
          setRecipientId(newId)
          recipientIdRef.current = newId
          for (const med of data.medications) {
            await api.post('/medications', { recipient_id: newId, name: med }).catch(() => {})
          }
          if (data.family_members?.length) {
            api.patch('/circle/recipient', {
              recipient_id: newId,
              suggested_helpers: data.family_members,
            }).catch(() => {})
          }
        } finally {
          syncInProgressRef.current = false
        }
      } else {
        await api.patch('/circle/recipient', {
          recipient_id: currentRecipientId,
          full_name: data.recipient_name,
          city: data.city || null,
          state: data.state || null,
          conditions: data.conditions,
          allergies: data.allergies,
        }).catch(() => {})
        if (data.family_members?.length) {
          api.patch('/circle/recipient', {
            recipient_id: currentRecipientId,
            suggested_helpers: data.family_members,
          }).catch(() => {})
        }
      }
    } catch { /* silent */ }
  }

  function sendMessage(text) {
    if (!text || isStreaming) return
    const userMsg = { role: 'user', content: text }
    const history = [...messages.filter((m) => !m.streaming), userMsg]
    setMessages(history)
    setInput('')
    sendToWillow(history.map(({ role, content }) => ({ role, content })))
  }

  function handleSend() { sendMessage(input.trim()) }

  function toggleVoiceMode() {
    if (voiceMode) {
      stopListening()
      setVoiceMode(false)
    } else {
      setVoiceMode(true)
      startListening()
    }
  }

  async function handleFinish() {
    let activeId = recipientId || recipient?.id
    let dataToSave = { ...extractedData }

    const userMessages = messages.filter((m) => m.role === 'user')
    if (!dataToSave.recipient_name && userMessages.length > 0) {
      try {
        const { data: extractRes } = await api.post('/ai/extract', {
          messages: messages
            .filter((m) => !m.streaming)
            .map(({ role, content }) => ({ role, content })),
        })
        if (extractRes?.extracted) {
          dataToSave = mergeExtracted(dataToSave, extractRes.extracted)
          setExtractedData(dataToSave)
        }
      } catch { /* proceed with whatever we have */ }
    }

    if (!activeId && dataToSave.recipient_name) {
      try {
        const { data: res } = await api.post('/circle/create', {
          full_name: dataToSave.recipient_name,
          city: dataToSave.city || null,
          state: dataToSave.state || null,
          conditions: dataToSave.conditions,
          allergies: dataToSave.allergies,
        })
        activeId = res.recipient.id
        setRecipientId(activeId)
        recipientIdRef.current = activeId
        for (const med of dataToSave.medications) {
          await api.post('/medications', { recipient_id: activeId, name: med }).catch(() => {})
        }
      } catch { /* give up on creation, still navigate home */ }
    }

    if (activeId) {
      await selectRecipient(activeId)
    } else {
      await refresh()
    }
    navigate('/home')
  }

  const userHasSentMessage = messages.some((m) => m.role === 'user')
  const showFinish = userHasSentMessage && !isStreaming

  return (
    <div className="min-h-screen bg-dawn">
      {/* Header — forest gradient, sticky */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-forest shadow-twilight">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center text-white font-display text-base shrink-0">
            🌿
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Willow</p>
            <p className="text-xs text-sage-pale mt-0.5">Your CareCircle guide</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/home')}
          className="text-sm text-sage-pale hover:text-white transition-colors"
        >
          Set up later
        </button>
      </div>

      {/* Messages — pt-16 offsets the sticky ~60px header */}
      <div className="px-4 pt-16 pb-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-gradient-forest rounded-full flex items-center justify-center text-sm shrink-0 mt-1">
                🌿
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-sage text-white rounded-br-sm shadow-sage'
                  : 'bg-white text-night border border-border rounded-bl-sm shadow-card'
              }`}
            >
              {msg.content || (
                <span className="flex gap-1 items-center h-5">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-sage-light rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Finish Setup */}
      {showFinish && (
        <div className="px-4 pb-2">
          <button
            onClick={handleFinish}
            className="w-full bg-gradient-sage text-white py-3.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity shadow-sage"
          >
            Finish Setup →
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-border px-3 py-3 space-y-2">

        {/* Voice mode status banner */}
        {voiceMode && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            isListening
              ? 'bg-rose/10 border border-rose/20'
              : isStreaming
              ? 'bg-sage/10 border border-sage/20'
              : 'bg-dawn border border-border'
          }`}>
            {isListening ? (
              <>
                <span className="flex gap-0.5 items-end h-4">
                  <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                  <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                  <span className="w-1 bg-rose rounded-full animate-bounce" style={{ height: '60%', animationDelay: '300ms' }} />
                </span>
                <span className="text-xs font-medium text-rose">Listening… speak your answer</span>
              </>
            ) : isStreaming ? (
              <>
                <span className="flex gap-1 items-center">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-sage rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-xs font-medium text-sage">Willow is responding…</span>
              </>
            ) : (
              <>
                <Mic size={13} className="text-mist" />
                <span className="text-xs text-mist">Voice mode on — mic restarts after each response</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={voiceMode ? 'Speaking hands-free — or type here…' : 'Type your message…'}
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-border px-3 py-2.5 text-sm text-night outline-none focus:ring-2 focus:ring-sage max-h-28"
          />

          {/* Single-tap mic (non-voice-mode only) */}
          {isSupported && !voiceMode && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isStreaming}
              aria-label="Voice input"
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                isListening ? 'bg-rose text-white' : 'bg-dawn hover:bg-cloud text-mist'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}

          {/* Voice mode toggle */}
          {isSupported && (
            <button
              onClick={toggleVoiceMode}
              title={voiceMode ? 'Stop voice mode' : 'Enable hands-free voice mode'}
              className={`h-10 px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
                voiceMode
                  ? 'bg-rose text-white hover:bg-rose/80'
                  : 'bg-sage/10 text-sage hover:bg-sage/20 border border-sage/30'
              }`}
            >
              {voiceMode ? <MicOff size={15} /> : <Mic size={15} />}
              {voiceMode ? 'Stop' : 'Hands-free'}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            aria-label="Send"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-sage text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
