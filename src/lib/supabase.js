import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Shared sessions are optional — if the keys aren't configured the app still
// works in local (single-device) mode. Pages check `isSupabaseConfigured`
// before using shared features.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

function shortId() {
  // Readable-ish, collision-unlikely id for the share URL.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Host creates a shared session from a restaurant (menu is snapshotted).
export async function createSharedSession({ restaurantName, menu, serviceChargeEnabled = false, gstEnabled = false }) {
  const id = shortId()
  const { error } = await supabase.from('sessions').insert({
    id,
    restaurant_name: restaurantName,
    menu,
    users: [],
    service_charge_enabled: serviceChargeEnabled,
    gst_enabled: gstEnabled,
    excluded_users: [],
    paid_by: null,
  })
  if (error) throw error
  return id
}

// Toggle whether a diner is being treated (excused from paying).
export async function toggleExcludedUser(sessionId, name) {
  const session = await fetchSession(sessionId)
  const current = session.excluded_users || []
  const next = current.includes(name) ? current.filter(u => u !== name) : [...current, name]
  const { error } = await supabase.from('sessions').update({ excluded_users: next }).eq('id', sessionId)
  if (error) throw error
  return next
}

export async function fetchSession(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return data
}

export async function fetchOrders(sessionId) {
  const { data, error } = await supabase
    .from('session_orders')
    .select('*')
    .eq('session_id', sessionId)
  if (error) throw error
  return data || []
}

// Add a user to the session if not already present (read-modify-write).
export async function addUserToSession(sessionId, name) {
  const session = await fetchSession(sessionId)
  const users = session.users || []
  if (users.includes(name)) return users
  const next = [...users, name]
  const { error } = await supabase.from('sessions').update({ users: next }).eq('id', sessionId)
  if (error) throw error
  return next
}

// Write the full order map for a single user (only ever your own user).
export async function upsertUserOrders(sessionId, userName, orders) {
  const { error } = await supabase
    .from('session_orders')
    .upsert(
      { session_id: sessionId, user_name: userName, orders, updated_at: new Date().toISOString() },
      { onConflict: 'session_id,user_name' }
    )
  if (error) throw error
}

export async function updateSessionMeta(sessionId, fields) {
  const { error } = await supabase.from('sessions').update(fields).eq('id', sessionId)
  if (error) throw error
}
