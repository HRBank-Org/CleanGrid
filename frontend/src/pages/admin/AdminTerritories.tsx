import { useState } from 'react'
import { MapPin, List, Map } from 'lucide-react'
import TerritoryMap from '../../components/TerritoryMap'

// Sample territory data for list view
const TERRITORIES = [
  { _id: '1', fsaCode: 'M5V', city: 'Toronto', province: 'ON', franchiseeName: 'Clean Stars Toronto', protectionStatus: 'protected', isActive: true },
  { _id: '2', fsaCode: 'M5W', city: 'Toronto', province: 'ON', franchiseeName: 'Clean Stars Toronto', protectionStatus: 'protected', isActive: true },
  { _id: '3', fsaCode: 'M4Y', city: 'Toronto', province: 'ON', franchiseeName: null, protectionStatus: 'unassigned', isActive: true },
  { _id: '4', fsaCode: 'M5G', city: 'Toronto', province: 'ON', franchiseeName: 'Downtown Cleaners', protectionStatus: 'probation', isActive: true },
  { _id: '5', fsaCode: 'V6B', city: 'Vancouver', province: 'BC', franchiseeName: 'West Coast Cleaners', protectionStatus: 'protected', isActive: true },
  { _id: '6', fsaCode: 'V6E', city: 'Vancouver', province: 'BC', franchiseeName: 'West Coast Cleaners', protectionStatus: 'probation', isActive: true },
  { _id: '7', fsaCode: 'H3A', city: 'Montreal', province: 'QC', franchiseeName: 'Montreal Pro Nettoyage', protectionStatus: 'protected', isActive: true },
  { _id: '8', fsaCode: 'T2P', city: 'Calgary', province: 'AB', franchiseeName: 'Calgary Clean Team', protectionStatus: 'protected', isActive: true },
  { _id: '9', fsaCode: 'T5J', city: 'Edmonton', province: 'AB', franchiseeName: 'Edmonton Shine', protectionStatus: 'protected', isActive: true },
  { _id: '10', fsaCode: 'H4A', city: 'Montreal', province: 'QC', franchiseeName: null, protectionStatus: 'inactive', isActive: false },
]

export default function AdminTerritories() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedFSA, setSelectedFSA] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'protected': return 'bg-green-100 text-green-700'
      case 'probation': return 'bg-yellow-100 text-yellow-700'
      case 'overflow': return 'bg-orange-100 text-orange-700'
      case 'inactive': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Stats
  const stats = {
    total: TERRITORIES.length,
    assigned: TERRITORIES.filter(t => t.franchiseeName).length,
    unassigned: TERRITORIES.filter(t => !t.franchiseeName).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Territories</h1>
          <p className="text-gray-500">Manage FSA assignments</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
            }`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-secondary-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total FSAs</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.assigned}</p>
          <p className="text-xs text-gray-500">Assigned</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.unassigned}</p>
          <p className="text-xs text-gray-500">Available</p>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <TerritoryMap onSelectFSA={setSelectedFSA} />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {TERRITORIES.map((territory) => (
            <div 
              key={territory._id} 
              className={`bg-white rounded-xl p-4 shadow-sm border transition-colors ${
                selectedFSA === territory.fsaCode ? 'border-primary' : 'border-gray-100'
              }`}
              onClick={() => setSelectedFSA(territory.fsaCode)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <span className="font-mono font-bold text-primary">{territory.fsaCode}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900">{territory.city}, {territory.province}</p>
                    {territory.franchiseeName ? (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
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

      {/* Selected FSA Details */}
      {selectedFSA && (
        <div className="bg-primary-50 rounded-xl p-4 border border-primary/20">
          <p className="text-sm text-primary font-medium">Selected: <span className="font-bold">{selectedFSA}</span></p>
          <p className="text-xs text-gray-600 mt-1">Click on the map or list to view FSA details</p>
        </div>
      )}
    </div>
  )
}
