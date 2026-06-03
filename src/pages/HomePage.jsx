import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { UtensilsCrossed, Clock, ChevronRight, ReceiptText, BookOpen, ArrowRight } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase.js'

export default function HomePage() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  // One-off receipt scans are kept out of the saved restaurants list.
  const restaurants = state.restaurants.filter(r => !r.isReceipt)

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase()
    if (code) navigate(`/join/${code}`)
  }

  const sorted = [...restaurants].sort((a, b) => {
    if (!a.lastVisit && !b.lastVisit) return 0
    if (!a.lastVisit) return 1
    if (!b.lastVisit) return -1
    return new Date(b.lastVisit) - new Date(a.lastVisit)
  })

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <UtensilsCrossed className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Meal Splitter</h1>
        <p className="text-gray-400 text-sm mt-1">Split bills easily with friends</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/restaurant/new')}
          className="flex flex-col items-center justify-center gap-2 bg-orange-500 text-white rounded-2xl p-5 font-semibold text-sm shadow-md shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
        >
          <BookOpen className="w-6 h-6" />
          Restaurant Menu
        </button>
        <button
          onClick={() => navigate('/receipt/new')}
          className="flex flex-col items-center justify-center gap-2 bg-white text-orange-600 border-2 border-orange-300 rounded-2xl p-5 font-semibold text-sm hover:bg-orange-50 active:scale-95 transition-all"
        >
          <ReceiptText className="w-6 h-6" />
          Scan Receipt
        </button>
      </div>

      {/* Join a shared session by code */}
      {isSupabaseConfigured && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Joining a group? Enter their code</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. K7P2QX"
              maxLength={8}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base font-bold tracking-[0.2em] uppercase focus:outline-none focus:border-orange-400 transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="px-4 flex items-center justify-center bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5" />
            Recent Restaurants
          </div>
          <div className="space-y-2">
            {sorted.map(r => (
              <button
                key={r.id}
                onClick={() => navigate('/session/setup', { state: { restaurantId: r.id } })}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md active:scale-98 transition-all flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{r.menu.length} item{r.menu.length !== 1 ? 's' : ''}</span>
                    {r.visitCount > 0 && (
                      <span className="text-xs text-orange-400">
                        {r.visitCount} visit{r.visitCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {r.lastVisit && (
                      <span className="text-xs text-gray-300">
                        {new Date(r.lastVisit).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No restaurants yet</p>
          <p className="text-sm mt-1">Add your first restaurant to get started</p>
        </div>
      )}
    </div>
  )
}
