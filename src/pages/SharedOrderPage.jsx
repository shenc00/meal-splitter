import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Receipt, Plus, Minus, Loader2, Share2, Users } from 'lucide-react'
import { fmt } from '../utils/calculations.js'
import { useSharedSession } from '../hooks/useSharedSession.js'
import { getSharedUser } from '../lib/sharedIdentity.js'
import ShareModal from '../components/ShareModal.jsx'

const COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500']
const LIGHT_COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']

export default function SharedOrderPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { session, loading, error, actions } = useSharedSession(sessionId)
  const [showShare, setShowShare] = useState(false)

  const me = getSharedUser(sessionId)

  // No identity on this device → go pick a name first.
  useEffect(() => {
    if (!me) navigate(`/join/${sessionId}`, { replace: true })
  }, [me, sessionId, navigate])

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading session…
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <p className="text-gray-700 font-medium mb-2">Couldn't load the session</p>
        <p className="text-sm text-gray-400 mb-6">{error || 'It may have ended.'}</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-medium text-sm">Go home</button>
      </div>
    )
  }

  const myIndex = Math.max(0, session.users.indexOf(me))
  const getQty = (itemId) => session.orders[me]?.[itemId] || 0
  const setQty = (itemId, qty) => actions.setOrderItem(me, itemId, qty)

  const mySubtotal = Object.entries(session.orders[me] || {}).reduce((sum, [itemId, qty]) => {
    const item = session.menu.find(m => m.id === itemId)
    return sum + (item ? item.price * qty : 0)
  }, 0)

  const getUserCount = (user) => Object.values(session.orders[user] || {}).reduce((a, b) => a + b, 0)
  const categories = [...new Set(session.menu.map(i => i.category))].sort()

  return (
    <div className="max-w-md mx-auto pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{session.restaurantName}</p>
            <p className="text-xs text-gray-400">You're ordering as <span className="font-semibold text-gray-600">{me}</span></p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1 text-gray-500 font-medium text-sm px-2 py-1.5 rounded-lg hover:bg-gray-100">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => navigate(`/shared/${sessionId}/bill`)} className="flex items-center gap-1.5 text-orange-500 font-medium text-sm">
              <Receipt className="w-4 h-4" /> Bill
            </button>
          </div>
        </div>

        {/* Who's here (read-only presence) */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <Users className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          {session.users.map((user, i) => {
            const count = getUserCount(user)
            const isMe = user === me
            return (
              <span
                key={user}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isMe ? `${COLORS[i % COLORS.length]} text-white` : 'bg-gray-100 text-gray-500'
                }`}
              >
                {user}{isMe ? ' (you)' : ''}
                {count > 0 && (
                  <span className={`rounded-full px-1 min-w-[16px] text-center ${isMe ? 'bg-white/30' : 'bg-gray-200'}`}>{count}</span>
                )}
              </span>
            )
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        {mySubtotal > 0 && (
          <div className={`${LIGHT_COLORS[myIndex % LIGHT_COLORS.length]} rounded-xl px-4 py-2.5 mb-4 text-sm font-medium`}>
            Your subtotal: {fmt(mySubtotal)}
          </div>
        )}

        {session.menu.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="font-medium">No menu items</p>
          </div>
        ) : (
          categories.map(category => {
            const items = session.menu.filter(i => i.category === category)
            return (
              <div key={category} className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{category}</p>
                <div className="space-y-2">
                  {items.map(item => {
                    const qty = getQty(item.id)
                    return (
                      <div key={item.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm font-semibold text-orange-500 mt-0.5">{fmt(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {qty > 0 && (
                            <>
                              <button onClick={() => setQty(item.id, qty - 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90 transition-all">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-gray-900 text-sm">{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-all ${
                              qty > 0 ? `${COLORS[myIndex % COLORS.length]} text-white` : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 px-4 max-w-md mx-auto">
        <button
          onClick={() => navigate(`/shared/${sessionId}/bill`)}
          className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Receipt className="w-5 h-5" /> View Bill
        </button>
      </div>

      {showShare && <ShareModal sessionId={sessionId} onClose={() => setShowShare(false)} />}
    </div>
  )
}
