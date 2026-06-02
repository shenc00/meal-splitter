import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Plus, UtensilsCrossed, Clock, ChevronRight } from 'lucide-react'

export default function HomePage() {
  const { state } = useApp()
  const navigate = useNavigate()
  const { restaurants } = state

  const sorted = [...restaurants].sort((a, b) => {
    if (!a.lastVisit && !b.lastVisit) return 0
    if (!a.lastVisit) return 1
    if (!b.lastVisit) return -1
    return new Date(b.lastVisit) - new Date(a.lastVisit)
  })

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <UtensilsCrossed className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Meal Splitter</h1>
        <p className="text-gray-400 text-sm mt-1">Split bills easily with friends</p>
      </div>

      <button
        onClick={() => navigate('/restaurant/new')}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-2xl p-4 mb-8 font-semibold text-base shadow-md shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
        Add New Restaurant
      </button>

      {sorted.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5" />
            Recent Restaurants
          </div>
          <div className="space-y-2">
            {sorted.map(r => (
              <button
                key={r.id}
                onClick={() => navigate('/session/setup', { state: { restaurantId: r.id } })}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md active:scale-98 transition-all flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{r.menu.length} item{r.menu.length !== 1 ? 's' : ''}</span>
                    {r.visitCount > 0 && (
                      <span className="text-xs text-orange-400">
                        {r.visitCount} visit{r.visitCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {r.lastVisit && (
                      <span className="text-xs text-gray-300">
                        {new Date(r.lastVisit).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No restaurants yet</p>
          <p className="text-sm mt-1">Add your first restaurant to get started</p>
        </div>
      )}
    </div>
  )
}
