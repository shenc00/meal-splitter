import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, generateId } from '../context/AppContext.jsx'
import { Camera, Upload, Plus, Trash2, ChevronLeft, Loader2, Check, Pencil } from 'lucide-react'

const CATEGORIES = ['Appetizers', 'Main Course', 'Sides', 'Desserts', 'Drinks', 'Other']

function ManualItemForm({ onAdd }) {
  const [item, setItem] = useState({ name: '', price: '', category: 'Main Course' })

  const handleAdd = () => {
    if (!item.name.trim() || !item.price) return
    onAdd({ name: item.name.trim(), price: parseFloat(item.price), category: item.category })
    setItem({ name: '', price: '', category: 'Main Course' })
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Item name (e.g. Chicken Rice)"
        value={item.name}
        onChange={e => setItem(p => ({ ...p, name: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            placeholder="0.00"
            value={item.price}
            onChange={e => setItem(p => ({ ...p, price: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            step="0.01"
            min="0"
          />
        </div>
        <select
          value={item.category}
          onChange={e => setItem(p => ({ ...p, category: e.target.value }))}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <button
        onClick={handleAdd}
        disabled={!item.name.trim() || !item.price}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>
    </div>
  )
}

export default function NewRestaurantPage() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState('name')
  const [name, setName] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [editingId, setEditingId] = useState(null)

  const handlePhotoCapture = async (file) => {
    if (!file) return
    setIsExtracting(true)
    setExtractError('')

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      const mediaType = file.type

      try {
        const res = await fetch('/.netlify/functions/extract-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64, mediaType }),
        })

        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        const extracted = (data.items || []).map(item => ({
          id: generateId(),
          name: item.name || '',
          price: parseFloat(item.price) || 0,
          category: item.category || 'Other',
        }))
        setMenuItems(prev => [...prev, ...extracted])
        if (extracted.length === 0) {
          setExtractError('No items found in the image. Try a clearer photo or add items manually.')
        }
      } catch {
        setExtractError('Could not extract menu automatically. Please add items manually below.')
      } finally {
        setIsExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const addManualItem = ({ name: n, price, category }) => {
    setMenuItems(prev => [...prev, { id: generateId(), name: n, price, category }])
  }

  const removeItem = (id) => setMenuItems(prev => prev.filter(i => i.id !== id))

  const updateItem = (id, field, value) => {
    setMenuItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, [field]: field === 'price' ? parseFloat(value) || 0 : value }
        : i
    ))
  }

  const handleSave = () => {
    if (!name.trim()) return
    const restaurant = {
      id: generateId(),
      name: name.trim(),
      menu: menuItems,
      visitCount: 0,
      lastVisit: null,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_RESTAURANT', payload: restaurant })
    navigate('/session/setup', { state: { restaurantId: restaurant.id } })
  }

  if (step === 'name') {
    return (
      <div className="max-w-md mx-auto p-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-400 mb-6 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Restaurant</h1>
        <p className="text-gray-400 text-sm mb-6">Enter the restaurant name to get started</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('menu')}
          placeholder="e.g. Sakura Japanese Kitchen"
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-orange-400 transition-colors mb-4"
          autoFocus
        />
        <button
          onClick={() => setStep('menu')}
          disabled={!name.trim()}
          className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all"
        >
          Next: Add Menu Items →
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-28">
      <button onClick={() => setStep('name')} className="flex items-center gap-1 text-gray-400 mb-4 hover:text-gray-600">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
      <p className="text-sm text-gray-400 mb-6">Scan menu or add items manually</p>

      {/* Photo capture */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-amber-800 mb-1">Scan Menu with AI</p>
        <p className="text-xs text-amber-600 mb-3">Take a photo of the menu and items will be extracted automatically</p>
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 rounded-xl py-3 cursor-pointer hover:bg-amber-50 transition-colors text-sm font-medium">
            <Camera className="w-4 h-4" />
            Camera
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoCapture(e.target.files[0])} />
          </label>
          <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-amber-300 text-amber-700 rounded-xl py-3 cursor-pointer hover:bg-amber-50 transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" />
            Upload
            <input type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoCapture(e.target.files[0])} />
          </label>
        </div>
        {isExtracting && (
          <div className="flex items-center gap-2 mt-3 text-amber-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Extracting menu items with AI...</span>
          </div>
        )}
        {extractError && (
          <p className="text-red-500 text-xs mt-2">{extractError}</p>
        )}
      </div>

      {/* Manual entry */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Add Item Manually</p>
        <ManualItemForm onAdd={addManualItem} />
      </div>

      {/* Items list */}
      {menuItems.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Menu Items ({menuItems.length})
          </p>
          <div className="space-y-2">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => updateItem(item.id, 'price', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        step="0.01"
                        min="0"
                      />
                      <select
                        value={item.category}
                        onChange={e => updateItem(item.id, 'category', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                      >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <button onClick={() => setEditingId(null)} className="text-xs text-orange-500 font-medium">Done</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-orange-500">${item.price.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">{item.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingId(item.id)} className="text-gray-300 hover:text-gray-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="fixed bottom-4 left-0 right-0 px-4 max-w-md mx-auto">
        <button
          onClick={handleSave}
          className="w-full bg-orange-500 text-white rounded-2xl p-4 font-semibold shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          {menuItems.length > 0
            ? `Save Restaurant & Start Session (${menuItems.length} items)`
            : 'Save Restaurant & Start Session'}
        </button>
      </div>
    </div>
  )
}
