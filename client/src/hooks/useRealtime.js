import { useEffect, useRef } from 'react'
import supabase from '../services/supabase'

/**
 * Subscribes to Supabase Realtime for a care circle.
 * Per spec §7: INSERT on log_entries + all changes on daily_status.
 *
 * @param {string|null} recipientId
 * @param {function} onNewEntry   - called with the new log_entry payload
 * @param {function} onStatusChange - called with the daily_status payload
 */
export function useRealtime({ recipientId, onNewEntry, onStatusChange }) {
  const channelRef = useRef(null)

  useEffect(() => {
    if (!recipientId) return

    const channel = supabase
      .channel(`circle-${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'log_entries',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => onNewEntry?.(payload.new)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_status',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => onStatusChange?.(payload.new)
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Silent reconnect indicator — spec §7
          console.warn('Realtime channel error, will retry automatically')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [recipientId]) // eslint-disable-line react-hooks/exhaustive-deps
}
