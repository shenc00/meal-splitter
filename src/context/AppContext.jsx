import { createContext, useContext, useReducer, useEffect } from 'react'

const AppContext = createContext(null)

const initialState = {
  restaurants: [],
  session: null,
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload }

    case 'ADD_RESTAURANT':
      return { ...state, restaurants: [...state.restaurants, action.payload] }

    case 'UPDATE_RESTAURANT':
      return {
        ...state,
        restaurants: state.restaurants.map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        ),
      }

    case 'DELETE_RESTAURANT':
      return {
        ...state,
        restaurants: state.restaurants.filter(r => r.id !== action.payload),
      }

    case 'ADD_MENU_ITEMS': {
      const newItems = action.payload.items.map(item => ({
        id: generateId(),
        name: item.name,
        price: parseFloat(item.price) || 0,
        category: item.category || 'Other',
      }))
      return {
        ...state,
        restaurants: state.restaurants.map(r =>
          r.id === action.payload.restaurantId
            ? { ...r, menu: [...(r.menu || []), ...newItems] }
            : r
        ),
      }
    }

    case 'UPDATE_MENU_ITEM':
      return {
        ...state,
        restaurants: state.restaurants.map(r =>
          r.id === action.payload.restaurantId
            ? {
                ...r,
                menu: r.menu.map(item =>
                  item.id === action.payload.itemId
                    ? { ...item, ...action.payload.updates }
                    : item
                ),
              }
            : r
        ),
      }

    case 'DELETE_MENU_ITEM':
      return {
        ...state,
        restaurants: state.restaurants.map(r =>
          r.id === action.payload.restaurantId
            ? { ...r, menu: r.menu.filter(item => item.id !== action.payload.itemId) }
            : r
        ),
      }

    case 'START_SESSION': {
      const orders = {}
      action.payload.users.forEach(user => {
        orders[user] = {}
      })
      return {
        ...state,
        restaurants: state.restaurants.map(r =>
          r.id === action.payload.restaurantId
            ? { ...r, visitCount: (r.visitCount || 0) + 1, lastVisit: new Date().toISOString() }
            : r
        ),
        session: {
          id: generateId(),
          restaurantId: action.payload.restaurantId,
          users: action.payload.users,
          orders,
          // Receipts can pre-enable these when a service charge / GST line is detected.
          serviceChargeEnabled: action.payload.serviceChargeEnabled || false,
          gstEnabled: action.payload.gstEnabled || false,
          excludedUsers: [],
          paidBy: null,
          createdAt: new Date().toISOString(),
        },
      }
    }

    case 'SET_ORDER_ITEM': {
      const { user, menuItemId, quantity } = action.payload
      const userOrders = { ...state.session.orders[user] }
      if (quantity <= 0) {
        delete userOrders[menuItemId]
      } else {
        userOrders[menuItemId] = quantity
      }
      return {
        ...state,
        session: {
          ...state.session,
          orders: { ...state.session.orders, [user]: userOrders },
        },
      }
    }

    case 'TOGGLE_SERVICE_CHARGE':
      return {
        ...state,
        session: { ...state.session, serviceChargeEnabled: !state.session.serviceChargeEnabled },
      }

    case 'TOGGLE_GST':
      return {
        ...state,
        session: { ...state.session, gstEnabled: !state.session.gstEnabled },
      }

    case 'SET_PAID_BY':
      return {
        ...state,
        session: { ...state.session, paidBy: action.payload },
      }

    case 'TOGGLE_EXCLUDED_USER': {
      const current = state.session.excludedUsers || []
      const user = action.payload
      const excludedUsers = current.includes(user)
        ? current.filter(u => u !== user)
        : [...current, user]
      return { ...state, session: { ...state.session, excludedUsers } }
    }

    case 'END_SESSION': {
      // One-off receipt "restaurants" are throwaway — drop them when the session ends.
      const endedRestaurantId = state.session?.restaurantId
      return {
        ...state,
        restaurants: state.restaurants.filter(
          r => !(r.isReceipt && r.id === endedRestaurantId)
        ),
        session: null,
      }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('meal-splitter-data')
      if (saved) {
        const parsed = JSON.parse(saved)
        dispatch({ type: 'LOAD_STATE', payload: parsed })
      }
    } catch {
      // ignore corrupt data
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('meal-splitter-data', JSON.stringify(state))
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export { generateId }
