import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp, ShoppingBag, ArrowRight, Loader2, Home } from 'lucide-react'
import { calculateBill, calculateSettlement, fmt } from '../utils/calculations.js'
import { useSharedSession } from '../hooks/useSharedSession.js'

const COLORS = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-yellow-100 text-yellow-600']
const PAID_COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500']

function Toggle({ checked, onChange }) {
  return (
    <button onClick={onChange} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-orange-500' : 'bg-gray-200'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function SharedBillPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { session, loading, error, actions } = useSharedSession(sessionId)
  const [expandedUser, setExpandedUser] = useState(null)

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading bill…
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <p className="text-gray-700 font-medium mb-2">Couldn't load the bill</p>
        <p className="text-sm text-gray-400 mb-6">{error || 'The session may have ended.'}</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-medium text-sm">Go home</button>
      </div>
    )
  }

  const { grandSubtotal, grandServiceCharge, grandGst, grandTotal, userTotals } = calculateBill(session, session.menu)
  const settlement = calculateSettlement(session.users, userTotals, session.paidBy)
  const hasAnyOrders = session.users.some(u => Object.keys(session.orders[u] || {}).length > 0)

  return (
    <div className="max-w-md mx-auto p-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/shared/${sessionId}/order`)} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bill Summary</h1>
          <p className="text-sm text-gray-400">{session.restaurantName} · live</p>
        </div>
      </div>

      {/* Per-user cards */}
      <div className="space-y-2 mb-5">
        {session.users.map((user, i) => {
          const { subtotal, serviceCharge, gst, total } = userTotals[user] || {}
          const userOrders = session.orders[user] || {}
          const hasOrders = Object.keys(userOrders).length > 0
          const isExpanded = expandedUser === user
          return (
            <div key={user} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <button onClick={() => hasOrders && setExpandedUser(isExpanded ? null : user)} className="w-full flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${COLORS[i % COLORS.length]}`}>{user[0].toUpperCase()}</div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{user}</p>
                    {!hasOrders && <p className="text-xs text-gray-400">No orders</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{fmt(total || 0)}</span>
                  {hasOrders && (isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="space-y-1.5 mb-3">
                    {Object.entries(userOrders).map(([itemId, qty]) => {
                      const item = session.menu.find(m => m.id === itemId)
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
                    <div className="flex justify-between text-xs text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                    {serviceCharge > 0 && <div className="flex justify-between text-xs text-gray-400"><span>Service Charge (10%)</span><span>{fmt(serviceCharge)}</span></div>}
                    {gst > 0 && <div className="flex justify-between text-xs text-gray-400"><span>GST (9%)</span><span>{fmt(gst)}</span></div>}
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{fmt(total)}</span></div>
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
            <Toggle checked={session.serviceChargeEnabled} onChange={actions.toggleServiceCharge} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">GST</p>
              <p className="text-xs text-gray-400">+9% on (subtotal + service charge)</p>
            </div>
            <Toggle checked={session.gstEnabled} onChange={actions.toggleGst} />
          </div>
        </div>
      </div>

      {/* Grand total */}
      <div className="bg-orange-500 rounded-2xl p-5 mb-5 text-white">
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm opacity-80"><span>Subtotal</span><span>{fmt(grandSubtotal)}</span></div>
          {grandServiceCharge > 0 && <div className="flex justify-between text-sm opacity-80"><span>Service Charge</span><span>{fmt(grandServiceCharge)}</span></div>}
          {grandGst > 0 && <div className="flex justify-between text-sm opacity-80"><span>GST</span><span>{fmt(grandGst)}</span></div>}
        </div>
        <div className="flex justify-between items-center border-t border-orange-400 pt-3">
          <span className="text-xl font-bold">Grand Total</span>
          <span className="text-2xl font-bold">{fmt(grandTotal)}</span>
        </div>
      </div>

      {/* All items ordered */}
      {hasAnyOrders && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4"><ShoppingBag className="w-4 h-4" /> All Orders</div>
          <div className="space-y-4">
            {session.users.map((user, i) => {
              const userOrders = session.orders[user] || {}
              if (Object.keys(userOrders).length === 0) return null
              return (
                <div key={user}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${COLORS[i % COLORS.length]}`}>{user}</div>
                  <div className="space-y-1 pl-1">
                    {Object.entries(userOrders).map(([itemId, qty]) => {
                      const item = session.menu.find(m => m.id === itemId)
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
              onClick={() => actions.setPaidBy(session.paidBy === user ? null : user)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                session.paidBy === user ? `${PAID_COLORS[i % PAID_COLORS.length]} text-white shadow-sm` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      <div className="flex gap-3">
        <button onClick={() => navigate(`/shared/${sessionId}/order`)} className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 rounded-2xl p-4 font-semibold hover:bg-gray-50 active:scale-95 transition-all">
          <ChevronLeft className="w-4 h-4" /> Edit Orders
        </button>
        <button onClick={() => navigate('/')} className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 rounded-2xl p-4 font-semibold hover:bg-gray-50 active:scale-95 transition-all">
          <Home className="w-4 h-4" /> Done
        </button>
      </div>
    </div>
  )
}
