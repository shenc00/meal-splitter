import { createClient } from '@supabase/supabase-js'

// Trim to tolerate accidental whitespace/newlines, and strip stray surrounding
// quotes (a common mistake when pasting values into a hosting dashboard).
const clean = (v) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v)

const url = clean(import.meta.env.VITE_SUPABASE_URL)
const anonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

// Shared sessions are optional — if the keys aren't configured the app still
// works in local (single-device) mode. Pages check `isSupabaseConfigured`
// before using shared features.
//
// IMPORTANT: this module is imported transitively by App.jsx, so a throw here
// would blank the whole app. We create the client defensively and fall back to
// "sharing unavailable" rather than crashing if the URL/key is malformed.
let client = null
if (url && anonKey) {
  try {
    client = createClient(url, anonKey)
  } catch (err) {
    console.error('Supabase client could not be created — shared sessions disabled.', err)
  }
}

export const supabase = client
export const isSupabaseConfigured = Boolean(client)

function shortId() {
  // Short, human-typable code used both as the session id and the join code.
  // Alphabet excludes easily-confused characters (0/O, 1/I/L).
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const len = 6
  let out = ''
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(len)
    crypto.getRandomValues(buf)
    for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length]
  } else {
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
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
