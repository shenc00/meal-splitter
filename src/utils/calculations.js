export function calculateUserBreakdown(userOrders, menu, serviceChargeEnabled, gstEnabled) {
  const subtotal = Object.entries(userOrders).reduce((sum, [itemId, qty]) => {
    const item = menu.find(m => m.id === itemId)
    return sum + (item ? item.price * qty : 0)
  }, 0)

  const serviceCharge = serviceChargeEnabled ? subtotal * 0.1 : 0
  const gst = gstEnabled ? (subtotal + serviceCharge) * 0.09 : 0
  const total = subtotal + serviceCharge + gst

  return { subtotal, serviceCharge, gst, total }
}

export function calculateBill(session, menu) {
  const { users, orders, serviceChargeEnabled, gstEnabled } = session
  const userTotals = {}
  let grandSubtotal = 0

  users.forEach(user => {
    const breakdown = calculateUserBreakdown(
      orders[user] || {},
      menu,
      serviceChargeEnabled,
      gstEnabled
    )
    userTotals[user] = breakdown
    grandSubtotal += breakdown.subtotal
  })

  const grandServiceCharge = serviceChargeEnabled ? grandSubtotal * 0.1 : 0
  const grandGst = gstEnabled ? (grandSubtotal + grandServiceCharge) * 0.09 : 0
  const grandTotal = grandSubtotal + grandServiceCharge + grandGst

  return { grandSubtotal, grandServiceCharge, grandGst, grandTotal, userTotals }
}

export function calculateSettlement(users, userTotals, paidBy) {
  if (!paidBy) return []
  return users
    .filter(user => user !== paidBy && (userTotals[user]?.total || 0) > 0)
    .map(user => ({
      from: user,
      to: paidBy,
      amount: userTotals[user].total,
    }))
}

export function fmt(amount) {
  return `$${amount.toFixed(2)}`
}
