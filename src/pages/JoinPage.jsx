import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Users, ArrowRight } from 'lucide-react'
import { isSupabaseConfigured, fetchSession, addUserToSession } from '../lib/supabase.js'
import { getSharedUser, setSharedUser } from '../lib/sharedIdentity.js'

const COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']

export default function JoinPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Sharing is not configured for this app.')
      setLoading(false)
      return
    }
    // If this device already joined, skip straight to ordering.
    const existing = getSharedUser(sessionId)
    if (existing) {
      navigate(`/shared/${sessionId}/order`, { replace: true })
      return
    }
    fetchSession(sessionId)
      .then(setSession)
      .catch(() => setError('This session could not be found. The link may be wrong or the session ended.'))
      .finally(() => setLoading(false))
  }, [sessionId, navigate])

  const join = async (chosen) => {
    const finalName = (chosen ?? name).trim()
    if (!finalName) return
    setJoining(true)
    setError('')
    try {
      await addUserToSession(sessionId, finalName)
      setSharedUser(sessionId, finalName)
      navigate(`/shared/${sessionId}/order`, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not join the session')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading session…
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <p className="text-gray-700 font-medium mb-2">Can't join this session</p>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-medium text-sm">Go home</button>
      </div>
    )
  }

  const existingUsers = session?.users || []

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 mt-4">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">Joining</p>
        <h1 className="text-2xl font-bold text-gray-900">{session.restaurant_name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{(session.menu || []).length} items on menu</p>
      </div>

      {existingUsers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" /> Already here — tap if that's you
          </div>
          <div className="flex flex-wrap gap-2">
            {existingUsers.map((u, i) => (
              <button
                key={u}
                disabled={joining}
                onClick={() => join(u)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-all ${COLORS[i % COLORS.length]}`}
              >
                <span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">{u[0].toUpperCase()}</span>
                {u}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Or enter your name</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && join()}
          className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-orange-400 transition-colors"
          autoFocus
        />
        <button
          onClick={() => join()}
          disabled={!name.trim() || joining}
          className="px-5 flex items-center justify-center bg-orange-500 text-white rounded-2xl font-semibold disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all"
        >
          {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
    </div>
  )
}
