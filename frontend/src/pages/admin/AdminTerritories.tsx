import { useState, useEffect } from 'react'
import { MapPin, Users, Shield, AlertTriangle } from 'lucide-react'
import api from '../../services/api'

interface Territory {
  _id: string
  fsaCode: string
  city: string
  province: string
  currentFranchiseeId: string | null
  franchiseeName?: string
  protectionStatus: string
  isActive: boolean
}

export default function AdminTerritories() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTerritories()
  }, [])

  const fetchTerritories = async () => {
    try {
      // Mock data for now
      setTerritories([
        { _id: '1', fsaCode: 'M5V', city: 'Toronto', province: 'ON', currentFranchiseeId: '123', franchiseeName: 'Clean Stars Toronto', protectionStatus: 'protected', isActive: true },
        { _id: '2', fsaCode: 'M5W', city: 'Toronto', province: 'ON', currentFranchiseeId: '123', franchiseeName: 'Clean Stars Toronto', protectionStatus: 'protected', isActive: true },
        { _id: '3', fsaCode: 'M4Y', city: 'Toronto', province: 'ON', currentFranchiseeId: null, protectionStatus: 'unassigned', isActive: true },
        { _id: '4', fsaCode: 'V6B', city: 'Vancouver', province: 'BC', currentFranchiseeId: '456', franchiseeName: 'West Coast Cleaners', protectionStatus: 'probation', isActive: true },
        { _id: '5', fsaCode: 'H3A', city: 'Montreal', province: 'QC', currentFranchiseeId: null, protectionStatus: 'unassigned', isActive: true },
      ])
    } catch (err) {
      console.error('Failed to fetch territories:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTerritories = territories.filter(t => {
    if (filter === 'all') return true
    if (filter === 'assigned') return t.currentFranchiseeId !== null
    if (filter === 'unassigned') return t.currentFranchiseeId === null
    return t.protectionStatus === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'protected': return 'bg-green-100 text-green-700'
      case 'probation': return 'bg-yellow-100 text-yellow-700'
      case 'overflow': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Territories</h1>
        <p className="text-gray-500">Manage FSA assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-secondary-900">{territories.length}</p>
          <p className="text-xs text-gray-500">Total FSAs</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600">{territories.filter(t => t.currentFranchiseeId).length}</p>
          <p className="text-xs text-gray-500">Assigned</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-400">{territories.filter(t => !t.currentFranchiseeId).length}</p>
          <p className="text-xs text-gray-500">Available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
        {['all', 'assigned', 'unassigned', 'protected', 'probation'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Territories List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTerritories.map((territory) => (
            <div key={territory._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <span className="font-mono font-bold text-primary">{territory.fsaCode}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900">{territory.city}, {territory.province}</p>
                    {territory.franchiseeName ? (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {territory.franchiseeName}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Unassigned</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(territory.protectionStatus)}`}>
                  {territory.protectionStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
