import { useEffect, useRef, useState, useCallback } from 'react'
import {
  supabase,
  fetchSession,
  fetchOrders,
  upsertUserOrders,
  updateSessionMeta,
} from '../lib/supabase.js'

// Loads a shared session + everyone's orders, keeps them live via Supabase
// realtime, and exposes write actions. Returns a `session` shaped to match
// what calculations.js / the UI expect: { users, orders, serviceChargeEnabled,
// gstEnabled, paidBy, restaurantName, menu }.
export function useSharedSession(sessionId) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Keep the latest orders in a ref so optimistic writes can read current state
  // without re-creating callbacks.
  const ordersRef = useRef({})

  const buildSession = useCallback((row, orderRows) => {
    const orders = {}
    for (const r of orderRows) orders[r.user_name] = r.orders || {}
    ordersRef.current = orders
    return {
      id: row.id,
      restaurantName: row.restaurant_name,
      menu: row.menu || [],
      users: row.users || [],
      orders,
      serviceChargeEnabled: row.service_charge_enabled,
      gstEnabled: row.gst_enabled,
      paidBy: row.paid_by,
    }
  }, [])

  const reload = useCallback(async () => {
    const [row, orderRows] = await Promise.all([
      fetchSession(sessionId),
      fetchOrders(sessionId),
    ])
    setSession(buildSession(row, orderRows))
  }, [sessionId, buildSession])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    reload()
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load session')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // On any change to this session (meta or orders), refetch. Simple and
    // correct for a handful of diners; avoids fiddly per-payload merging.
    const channel = supabase
      .channel(`shared-session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, () => reload().catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_orders', filter: `session_id=eq.${sessionId}` }, () => reload().catch(() => {}))
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [sessionId, reload])

  const setOrderItem = useCallback(async (user, menuItemId, quantity) => {
    const current = { ...(ordersRef.current[user] || {}) }
    if (quantity <= 0) delete current[menuItemId]
    else current[menuItemId] = quantity

    // Optimistic local update for instant feedback.
    ordersRef.current = { ...ordersRef.current, [user]: current }
    setSession(prev => (prev ? { ...prev, orders: ordersRef.current } : prev))

    try {
      await upsertUserOrders(sessionId, user, current)
    } catch (err) {
      setError(err.message || 'Could not save your order')
      reload().catch(() => {}) // resync to truth on failure
    }
  }, [sessionId, reload])

  const setMeta = useCallback(async (fields) => {
    setSession(prev => (prev ? { ...prev, ...localizeMeta(fields) } : prev))
    try {
      await updateSessionMeta(sessionId, fields)
    } catch (err) {
      setError(err.message || 'Could not update session')
      reload().catch(() => {})
    }
  }, [sessionId, reload])

  return {
    session,
    loading,
    error,
    actions: {
      setOrderItem,
      toggleServiceCharge: () => setMeta({ service_charge_enabled: !session?.serviceChargeEnabled }),
      toggleGst: () => setMeta({ gst_enabled: !session?.gstEnabled }),
      setPaidBy: (user) => setMeta({ paid_by: user }),
    },
  }
}

// Map DB column names to the in-memory session field names for optimistic updates.
function localizeMeta(fields) {
  const out = {}
  if ('service_charge_enabled' in fields) out.serviceChargeEnabled = fields.service_charge_enabled
  if ('gst_enabled' in fields) out.gstEnabled = fields.gst_enabled
  if ('paid_by' in fields) out.paidBy = fields.paid_by
  return out
}
