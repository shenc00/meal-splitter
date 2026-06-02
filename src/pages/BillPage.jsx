import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { ChevronLeft, ChevronDown, ChevronUp, ShoppingBag, ArrowRight, RotateCcw, Gift } from 'lucide-react'
import { calculateBill, calculateSettlement, fmt } from '../utils/calculations.js'

const COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']
const PAID_COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500']

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-orange-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function BillPage() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { session, restaurants } = state

  if (!session) { navigate('/'); return null }

  const restaurant = restaurants.find(r => r.id === session.restaurantId)
  if (!restaurant) { navigate('/'); return null }

  const [expandedUser, setExpandedUser] = useState(null)

  const { grandSubtotal, grandServiceCharge, grandGst, grandTotal, userTotals, treatActive, treatPerPayer } =
    calculateBill(session, restaurant.menu)
  const excludedUsers = session.excludedUsers || []

  const settlement = calculateSettlement(session.users, userTotals, session.paidBy)

  const handleEndSession = () => {
    dispatch({ type: 'END_SESSION' })
    navigate('/')
  }

  const hasAnyOrders = session.users.some(u =>
    Object.keys(session.orders[u] || {}).length > 0
  )

  return (
    <div className="max-w-md mx-auto p-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/session/order')} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bill Summary</h1>
          <p className="text-sm text-gray-400">{restaurant.name}</p>
        </div>
      </div>

      {/* Per-user cards */}
      <div className="space-y-2 mb-5">
        {session.users.map((user, i) => {
          const { subtotal, serviceCharge, gst, consumption, treatShare, payable, excluded } = userTotals[user] || {}
          const userOrders = session.orders[user] || {}
          const hasOrders = Object.keys(userOrders).length > 0
          const isExpanded = expandedUser === user

          return (
            <div key={user} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <button
                onClick={() => hasOrders && setExpandedUser(isExpanded ? null : user)}
                className="w-full flex items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${COLORS[i % COLORS.length]}`}>
                    {user[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{user}</p>
                      {excluded && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 rounded-full px-1.5 py-0.5">
                          <Gift className="w-2.5 h-2.5" /> Treated
                        </span>
                      )}
                    </div>
                    {!hasOrders && <p className="text-xs text-gray-400">No orders</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {excluded && consumption > 0 && (
                    <span className="text-xs text-gray-300 line-through">{fmt(consumption)}</span>
                  )}
                  <span className={`font-bold ${excluded ? 'text-green-600' : 'text-gray-900'}`}>{fmt(payable || 0)}</span>
                  {hasOrders && (
                    isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="space-y-1.5 mb-3">
                    {Object.entries(userOrders).map(([itemId, qty]) => {
                      const item = restaurant.menu.find(m => m.id === itemId)
                      if (!item) return null
                      return (
                        <div key={itemId} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name} × {qty}</span>
                          <span className="text-gray-900">{fmt(item.price * qty)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Service Charge (10%)</span>
                        <span>{fmt(serviceCharge)}</span>
                      </div>
                    )}
                    {gst > 0 && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>GST (9%)</span>
                        <span>{fmt(gst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Own consumption</span>
                      <span>{fmt(consumption)}</span>
                    </div>
                    {!excluded && treatShare > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>+ Share of treat</span>
                        <span>{fmt(treatShare)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
                      <span>{excluded ? 'Treated — pays' : 'Pays'}</span>
                      <span>{fmt(payable)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Charges toggles */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Additional Charges</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Service Charge</p>
              <p className="text-xs text-gray-400">+10% of subtotal per person</p>
            </div>
            <Toggle
              checked={session.serviceChargeEnabled}
              onChange={() => dispatch({ type: 'TOGGLE_SERVICE_CHARGE' })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">GST</p>
              <p className="text-xs text-gray-400">+9% on (subtotal + service charge)</p>
            </div>
            <Toggle
              checked={session.gstEnabled}
              onChange={() => dispatch({ type: 'TOGGLE_GST' })}
            />
          </div>
        </div>
      </div>

      {/* Group treat */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
          <Gift className="w-4 h-4 text-green-500" /> Group treat
        </div>
        <p className="text-xs text-gray-400 mb-3">Tap anyone being treated — their cost is split evenly among the rest.</p>
        <div className="flex flex-wrap gap-2">
          {session.users.map((user) => {
            const isExcluded = excludedUsers.includes(user)
            return (
              <button
                key={user}
                onClick={() => dispatch({ type: 'TOGGLE_EXCLUDED_USER', payload: user })}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  isExcluded ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isExcluded && <Gift className="w-3.5 h-3.5" />}
                {user}
              </button>
            )
          })}
        </div>
        {treatActive && (
          <p className="text-xs text-green-600 mt-3">
            Each paying person covers an extra {fmt(treatPerPayer)} of the treat.
          </p>
        )}
        {excludedUsers.length > 0 && !treatActive && (
          <p className="text-xs text-amber-500 mt-3">
            Everyone can't be treated — at least one person must pay. Exclusions ignored.
          </p>
        )}
      </div>

      {/* Grand total */}
      <div className="bg-orange-500 rounded-2xl p-5 mb-5 text-white">
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm opacity-80">
            <span>Subtotal</span>
            <span>{fmt(grandSubtotal)}</span>
          </div>
          {grandServiceCharge > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Service Charge</span>
              <span>{fmt(grandServiceCharge)}</span>
            </div>
          )}
          {grandGst > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>GST</span>
              <span>{fmt(grandGst)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center border-t border-orange-400 pt-3">
          <span className="text-xl font-bold">Grand Total</span>
          <span className="text-2xl font-bold">{fmt(grandTotal)}</span>
        </div>
      </div>

      {/* All items ordered */}
      {hasAnyOrders && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <ShoppingBag className="w-4 h-4" />
            All Orders
          </div>
          <div className="space-y-4">
            {session.users.map((user, i) => {
              const userOrders = session.orders[user] || {}
              if (Object.keys(userOrders).length === 0) return null
              return (
                <div key={user}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${COLORS[i % COLORS.length]}`}>
                    {user}
                  </div>
                  <div className="space-y-1 pl-1">
                    {Object.entries(userOrders).map(([itemId, qty]) => {
                      const item = restaurant.menu.find(m => m.id === itemId)
                      if (!item) return null
                      return (
                        <div key={itemId} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name} × {qty}</span>
                          <span className="text-gray-900 font-medium">{fmt(item.price * qty)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Who paid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Who paid?</p>
        <div className="flex flex-wrap gap-2">
          {session.users.map((user, i) => (
            <button
              key={user}
              onClick={() => dispatch({ type: 'SET_PAID_BY', payload: session.paidBy === user ? null : user })}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                session.paidBy === user
                  ? `${PAID_COLORS[i % PAID_COLORS.length]} text-white shadow-sm`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {user}
              {session.paidBy === user && <span className="text-xs opacity-80">{fmt(grandTotal)}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Settlement */}
      {settlement.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Settle Up</p>
          <div className="space-y-2">
            {settlement.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900">{s.from}</span>
                  <span className="text-gray-400 mx-1">pays</span>
                  <span className="font-semibold text-gray-900">{s.to}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-gray-400" />
                </div>
                <span className="font-bold text-green-600 text-base">{fmt(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to order / end session */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/session/order')}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 rounded-2xl p-4 font-semibold hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Edit Orders
        </button>
        <button
          onClick={handleEndSession}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 rounded-2xl p-4 font-semibold hover:bg-red-50 active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          End Session
        </button>
      </div>
    </div>
  )
}
