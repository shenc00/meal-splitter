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
  const { users, orders, serviceChargeEnabled, gstEnabled, excludedUsers = [] } = session
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

  // Group treat: excused users pay nothing; their consumption is spread evenly
  // across the remaining payers. If *everyone* is excused there's no one to
  // absorb the cost, so we ignore the exclusions (treat it as nobody excused).
  const payers = users.filter(u => !excludedUsers.includes(u))
  const treatActive = payers.length > 0 && payers.length < users.length
  const treatPool = treatActive
    ? users.filter(u => excludedUsers.includes(u)).reduce((s, u) => s + userTotals[u].total, 0)
    : 0
  const treatPerPayer = treatActive ? treatPool / payers.length : 0

  users.forEach(user => {
    const excluded = treatActive && excludedUsers.includes(user)
    const consumption = userTotals[user].total
    userTotals[user].consumption = consumption
    userTotals[user].excluded = excluded
    userTotals[user].treatShare = excluded ? 0 : treatPerPayer
    userTotals[user].payable = excluded ? 0 : consumption + treatPerPayer
  })

  return {
    grandSubtotal,
    grandServiceCharge,
    grandGst,
    grandTotal,
    userTotals,
    treatActive,
    treatPerPayer,
  }
}

export function calculateSettlement(users, userTotals, paidBy) {
  if (!paidBy) return []
  return users
    .filter(user => user !== paidBy && (userTotals[user]?.payable ?? userTotals[user]?.total ?? 0) > 0)
    .map(user => ({
      from: user,
      to: paidBy,
      amount: userTotals[user].payable ?? userTotals[user].total,
    }))
}

export function fmt(amount) {
  return `$${amount.toFixed(2)}`
}
