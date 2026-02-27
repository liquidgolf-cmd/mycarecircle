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
  const [recipientId, setRecipientId] = useState(null)
  const [extractedData, setExtractedData] = useState({
    recipient_name: null, age: null, city: null, state: null,
    medications: [], conditions: [], allergies: [], family_members: [],
  })
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recipientIdRef = useRef(null)
  const willowStarted = useRef(false)
  // StrictMode guard: prevents the double-invoked state-updater from firing
  // two concurrent POST /circle/create requests before the first resolves.
  const syncInProgressRef = useRef(false)

  useEffect(() => { recipientIdRef.current = recipientId }, [recipientId])

  // Already onboarded → go home, but ONLY if:
  //   (a) the chat hasn't started yet (messages still empty), AND
  //   (b) the user didn't arrive via "Add another person" (?new=true).
  // Once refresh() fires mid-conversation `recipient` becomes truthy, but we
  // should NOT redirect then either — the user needs to hit "Finish Setup →".
  useEffect(() => {
    if (recipient && messages.length === 0 && !isNew) navigate('/home', { replace: true })
  }, [recipient, messages.length, isNew, navigate])

  // Willow's opening message.
  //
  // React 18 StrictMode double-invokes effects in development: it mounts,
  // runs effects, then unmounts (running cleanups), then remounts and runs
  // effects again.  The cleanup's AbortController.abort() fires synchronously
  // — before any async fetch response can arrive — so the first (stale)
  // sendToWillow call exits silently.  The second invoke gets a fresh
  // controller and proceeds normally.
  //
  // Gating on `user` (not `[]`) ensures cc_access_token is guaranteed to be
  // in localStorage (it's set before dispatch(SET_SESSION) in AuthContext).
  useEffect(() => {
    if (!user) return
    if (willowStarted.current) return
    willowStarted.current = true

    const controller = new AbortController()
    sendToWillow([], controller.signal)

    return () => {
      controller.abort()
      willowStarted.current = false  // reset so the second StrictMode mount can fire
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { isListening, isSupported, startListening } = useVoiceInput((transcript) => {
    setInput((prev) => prev + (prev ? ' ' : '') + transcript)
  })

  // signal is optional — only passed by the Willow init effect so StrictMode
  // can cancel the stale first-mount request before it shows an error toast.
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
      // AbortError = stale StrictMode first-mount invocation — exit silently.
      if (err.name !== 'AbortError' && !signal?.aborted) {
        toast.error('Willow is unavailable. Please try again.')
      }
    } finally {
      // Only clean up shared UI state if this invocation was NOT aborted.
      // For the aborted (stale StrictMode first-mount) case, the second
      // invocation's setMessages call at its start already removes any
      // dangling streaming bubble, and it manages isStreaming itself.
      // Skipping here prevents the aborted finally from clobbering the
      // second invocation's isStreaming=true while it's still streaming.
      if (!signal?.aborted) {
        setMessages((prev) => prev.filter((m) => !m.streaming))
        setIsStreaming(false)
        setTimeout(() => inputRef.current?.focus(), 100)
        // Sync CircleContext so showFinish can use `recipient` as a fallback
        // even if syncToDatabase silently failed or the <extract> block was
        // missing — any circle that was created will now be reflected.
        refresh()
      }
    }
  }

  async function syncToDatabase(data, currentRecipientId) {
    if (!data.recipient_name) return
    try {
      if (!currentRecipientId) {
        // Guard against StrictMode double-invoking the state updater that calls
        // this function. Both invocations run synchronously before any await,
        // so setting the flag here prevents the second from firing a duplicate
        // POST /circle/create.
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
      }
    } catch { /* silent */ }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    const userMsg = { role: 'user', content: text }
    const history = [...messages.filter((m) => !m.streaming), userMsg]
    setMessages(history)
    setInput('')
    sendToWillow(history.map(({ role, content }) => ({ role, content })))
  }

  async function handleFinish() {
    let activeId = recipientId || recipient?.id

    // Build the best data we have so far from the in-memory extracted state.
    let dataToSave = { ...extractedData }

    // --- Server-side extraction fallback ---
    // If the mid-stream <extract> blocks never populated a recipient_name
    // (e.g. the model skipped the block, or the user had an older session),
    // ask the server to read the full conversation and extract data fresh.
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
          // Update React state so the app reflects the recovered data.
          setExtractedData(dataToSave)
        }
      } catch { /* extraction failed — proceed with whatever we have */ }
    }

    // --- Create circle if it doesn't exist yet ---
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

        // Save medications that were collected during the conversation.
        for (const med of dataToSave.medications) {
          await api.post('/medications', { recipient_id: activeId, name: med }).catch(() => {})
        }
      } catch { /* give up on creation, still navigate home */ }
    }

    if (activeId) {
      // selectRecipient persists the new ID, reloads circle data, and refreshes
      // the recipients list so the switcher immediately shows the new person.
      await selectRecipient(activeId)
    } else {
      await refresh()
    }
    navigate('/home')
  }

  // Show "Finish Setup →" as soon as the user has sent at least one message
  // and nothing is streaming.  We intentionally do NOT require a confirmed
  // DB write here — if syncToDatabase silently failed the user would otherwise
  // be stranded on this screen with no escape route.
  const userHasSentMessage = messages.some((m) => m.role === 'user')
  const showFinish = userHasSentMessage && !isStreaming

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-sage rounded-full flex items-center justify-center text-white">🌿</div>
          <div>
            <p className="text-sm font-semibold text-charcoal leading-none">Willow</p>
            <p className="text-xs text-mid mt-0.5">Your My Care Circle guide</p>
          </div>
        </div>
        <button onClick={() => navigate('/home')} className="text-sm text-mid hover:text-charcoal underline">
          Set up later
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-sage rounded-full flex items-center justify-center text-sm shrink-0 mt-1">🌿</div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sage text-white rounded-br-sm'
                  : 'bg-white text-charcoal border border-border rounded-bl-sm shadow-sm'
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
        <div className="px-4 pb-2 shrink-0">
          <button
            onClick={handleFinish}
            className="w-full bg-sage text-white py-3 rounded-xl font-medium text-sm hover:bg-sage-light transition-colors"
          >
            Finish Setup →
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-border px-3 py-3 shrink-0 safe-area-bottom">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type your message…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-border px-3 py-2.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-sage max-h-28"
          />
          {isSupported && (
            <button
              onClick={startListening}
              disabled={isStreaming}
              aria-label="Voice input"
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                isListening ? 'bg-rose text-white' : 'bg-cream hover:bg-cream-dark text-mid'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            aria-label="Send"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage text-white disabled:opacity-40 hover:bg-sage-light transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
