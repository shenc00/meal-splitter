import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, generateId } from '../context/AppContext.jsx'
import { extractItems } from '../lib/extractItems.js'
import { Camera, Upload, Plus, Trash2, ChevronLeft, Loader2, ArrowRight, ReceiptText } from 'lucide-react'
import { fmt } from '../utils/calculations.js'

export default function ScanReceiptPage() {
  const { dispatch } = useApp()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)
  const [tax, setTax] = useState({ serviceCharge: false, gst: false })
  const [newItem, setNewItem] = useState({ name: '', price: '' })

  const handleScan = async (file) => {
    if (!file) return
    setIsExtracting(true)
    setError('')
    try {
      const { items: extracted, serviceChargeDetected, gstDetected } = await extractItems(file, 'receipt')
      const mapped = extracted.map(it => ({
        id: generateId(),
        name: it.name || '',
        price: parseFloat(it.price) || 0,
        category: it.category || 'Other',
      }))
      setItems(prev => [...prev, ...mapped])
      setTax({ serviceCharge: serviceChargeDetected, gst: gstDetected })
      setScanned(true)
      if (mapped.length === 0) {
        setError('No line items found. Try a clearer photo, or add items manually below.')
      }
    } catch (err) {
      setError(`Could not read the receipt: ${err.message}. You can still add items manually below.`)
      setScanned(true)
    } finally {
      setIsExtracting(false)
    }
  }

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, [field]: field === 'price' ? parseFloat(value) || 0 : value } : i
    ))
  }
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const addManual = () => {
    const name = newItem.name.trim()
    if (!name) return
    setItems(prev => [...prev, { id: generateId(), name, price: parseFloat(newItem.price) || 0, category: 'Other' }])
    setNewItem({ name: '', price: '' })
    setScanned(true)
  }

  const handleContinue = () => {
    if (items.length === 0) return
    const restaurant = {
      id: generateId(),
      name: `Receipt · ${new Date().toLocaleDateString()}`,
      menu: items,
      isReceipt: true,
      defaultServiceChargeEnabled: tax.serviceCharge,
      defaultGstEnabled: tax.gst,
      visitCount: 0,
      lastVisit: null,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_RESTAURANT', payload: restaurant })
    navigate('/session/setup', { state: { restaurantId: restaurant.id } })
  }

  const total = items.reduce((s, i) => s + i.price, 0)

  return (
    <div className="max-w-md mx-auto p-4 pb-28">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-400 mb-6 hover:text-gray-600">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Scan Receipt</h1>
      <p className="text-gray-400 text-sm mb-6">Snap the bill — then everyone picks what they had.</p>

      {/* Scan / upload */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-amber-800 mb-1">Read receipt with AI</p>
        <p className="text-xs text-amber-600 mb-3">Itemized lines are extracted automatically.</p>
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 rounded-xl py-3 cursor-pointer hover:bg-amber-50 transition-colors text-sm font-medium">
            <Camera className="w-4 h-4" /> Camera
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handleScan(e.target.files[0])} />
          </label>
          <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 rounded-xl py-3 cursor-pointer hover:bg-amber-50 transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => e.target.files?.[0] && handleScan(e.target.files[0])} />
          </label>
        </div>
        {isExtracting && (
          <div className="flex items-center gap-2 mt-3 text-amber-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Reading receipt…</span>
          </div>
        )}
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Detected tax */}
      {scanned && (tax.serviceCharge || tax.gst) && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-700">
          <ReceiptText className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Detected{tax.serviceCharge ? ' service charge' : ''}{tax.serviceCharge && tax.gst ? ' and' : ''}{tax.gst ? ' GST' : ''} — these are pre-applied on the bill (10% service, 9% GST). You can toggle them off there.
          </span>
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Items ({items.length})</p>
            <p className="text-xs text-gray-400">Sum {fmt(total)}</p>
          </div>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl px-3 py-2.5 shadow-sm flex items-center gap-2">
                <input
                  value={item.name}
                  onChange={e => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 min-w-0 text-sm font-medium text-gray-900 border-none focus:outline-none focus:ring-0 bg-transparent"
                />
                <div className="flex items-center text-sm text-orange-500 font-semibold">
                  $
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={e => updateItem(item.id, 'price', e.target.value)}
                    className="w-16 text-right border-none focus:outline-none focus:ring-0 bg-transparent"
                  />
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add manual line */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-5 flex items-center gap-2">
        <input
          placeholder="Add an item"
          value={newItem.name}
          onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addManual()}
          className="flex-1 min-w-0 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        />
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={newItem.price}
          onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addManual()}
          className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        />
        <button onClick={addManual} disabled={!newItem.name.trim()}
          className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-xl disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all flex-shrink-0">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="fixed bottom-4 left-0 right-0 px-4 max-w-md mx-auto">
        <button
          onClick={handleContinue}
          disabled={items.length === 0}
          className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold shadow-xl shadow-orange-200 disabled:opacity-40 disabled:shadow-none hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Continue to Split
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
