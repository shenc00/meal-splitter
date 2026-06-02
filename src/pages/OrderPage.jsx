import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { ChevronLeft, Receipt, Plus, Minus } from 'lucide-react'
import { fmt } from '../utils/calculations.js'

const COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500']
const LIGHT_COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']

export default function OrderPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { session, restaurants } = state

  if (!session) { navigate('/'); return null }

  const restaurant = restaurants.find(r => r.id === session.restaurantId)
  if (!restaurant) { navigate('/'); return null }

  const [selectedUser, setSelectedUser] = useState(session.users[0])

  const getQty = (itemId) => session.orders[selectedUser]?.[itemId] || 0

  const setQty = (itemId, qty) => {
    dispatch({ type: 'SET_ORDER_ITEM', payload: { user: selectedUser, menuItemId: itemId, quantity: qty } })
  }

  const getUserItemCount = (user) =>
    Object.values(session.orders[user] || {}).reduce((a, b) => a + b, 0)

  const getUserSubtotal = (user) =>
    Object.entries(session.orders[user] || {}).reduce((sum, [itemId, qty]) => {
      const item = restaurant.menu.find(m => m.id === itemId)
      return sum + (item ? item.price * qty : 0)
    }, 0)

  const categories = [...new Set(restaurant.menu.map(i => i.category))].sort()

  const userIndex = session.users.indexOf(selectedUser)

  return (
    <div className="max-w-md mx-auto pb-28">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 text-sm">{restaurant.name}</span>
          <button
            onClick={() => navigate('/session/bill')}
            className="flex items-center gap-1.5 text-orange-500 font-medium text-sm"
          >
            <Receipt className="w-4 h-4" />
            Bill
          </button>
        </div>

        {/* User tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {session.users.map((user, i) => {
            const count = getUserItemCount(user)
            const isActive = user === selectedUser
            return (
              <button
                key={user}
                onClick={() => setSelectedUser(user)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive ? `${COLORS[i % COLORS.length]} text-white shadow-sm` : 'bg-gray-100 text-gray-600'
                }`}
              >
                {user}
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1 min-w-[18px] text-center ${isActive ? 'bg-white/30' : 'bg-gray-200'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        {/* Selected user subtotal */}
        {getUserSubtotal(selectedUser) > 0 && (
          <div className={`${LIGHT_COLORS[userIndex % LIGHT_COLORS.length]} rounded-xl px-4 py-2.5 mb-4 text-sm font-medium`}>
            {selectedUser}'s subtotal: {fmt(getUserSubtotal(selectedUser))}
          </div>
        )}

        {restaurant.menu.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="font-medium">No menu items</p>
            <p className="text-sm mt-1">Go back and add items to the menu first</p>
          </div>
        ) : (
          categories.map(category => {
            const items = restaurant.menu.filter(i => i.category === category)
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
                              <button
                                onClick={() => setQty(item.id, qty - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90 transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-gray-900 text-sm">{qty}</span>
                            </>
                          )}
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-all ${
                              qty > 0
                                ? `${COLORS[userIndex % COLORS.length]} text-white`
                                : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
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
          onClick={() => navigate('/session/bill')}
          className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Receipt className="w-5 h-5" />
          View Bill
        </button>
      </div>
    </div>
  )
}
