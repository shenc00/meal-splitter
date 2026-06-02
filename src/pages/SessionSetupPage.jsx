import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Plus, X, ChevronLeft, Users, ArrowRight } from 'lucide-react'

export default function SessionSetupPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const restaurantId = location.state?.restaurantId

  const restaurant = state.restaurants.find(r => r.id === restaurantId)
  const [users, setUsers] = useState([])
  const [input, setInput] = useState('')

  if (!restaurant) {
    navigate('/')
    return null
  }

  const addUser = () => {
    const trimmed = input.trim()
    if (!trimmed || users.includes(trimmed)) return
    setUsers(prev => [...prev, trimmed])
    setInput('')
  }

  const removeUser = (name) => setUsers(prev => prev.filter(u => u !== name))

  const handleStart = () => {
    if (users.length === 0) return
    dispatch({ type: 'START_SESSION', payload: { restaurantId, users } })
    navigate('/session/order')
  }

  const COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']

  return (
    <div className="max-w-md mx-auto p-4">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-400 mb-6 hover:text-gray-600">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{restaurant.menu.length} items on menu</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          <Users className="w-3.5 h-3.5" />
          Who's at the table?
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter name (e.g. Alice)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUser()}
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-orange-400 transition-colors"
            autoFocus
          />
          <button
            onClick={addUser}
            disabled={!input.trim() || users.includes(input.trim())}
            className="w-12 h-12 flex items-center justify-center bg-orange-500 text-white rounded-2xl disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {users.length > 0 ? (
          <div className="space-y-2">
            {users.map((user, i) => (
              <div key={user} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${COLORS[i % COLORS.length]}`}>
                    {user[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800">{user}</span>
                </div>
                <button onClick={() => removeUser(user)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Add at least one person to continue</p>
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={users.length === 0}
        className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        Start Ordering
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )
}
