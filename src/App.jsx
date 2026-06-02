import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import HomePage from './pages/HomePage.jsx'
import NewRestaurantPage from './pages/NewRestaurantPage.jsx'
import SessionSetupPage from './pages/SessionSetupPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import BillPage from './pages/BillPage.jsx'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/restaurant/new" element={<NewRestaurantPage />} />
            <Route path="/session/setup" element={<SessionSetupPage />} />
            <Route path="/session/order" element={<OrderPage />} />
            <Route path="/session/bill" element={<BillPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
