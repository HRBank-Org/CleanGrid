import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { X, Save, Users, MapPin, TrendingUp } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Import FSA data by province
import ONTARIO_FSAS from '../data/fsaOntario'
import BC_FSAS from '../data/fsaBC'
import QUEBEC_FSAS from '../data/fsaQuebec'
import ALBERTA_FSAS from '../data/fsaAlberta'

// Province centers and zoom levels
const PROVINCE_CONFIG: Record<string, { center: [number, number]; zoom: number; name: string }> = {
  ON: { center: [43.7, -79.4], zoom: 7, name: 'Ontario' },
  BC: { center: [49.2, -123.1], zoom: 6, name: 'British Columbia' },
  QC: { center: [45.5, -73.6], zoom: 7, name: 'Quebec' },
  AB: { center: [53.5, -114.0], zoom: 6, name: 'Alberta' },
}

// Sample franchisee assignments (in production, this would come from the backend)
const SAMPLE_ASSIGNMENTS: Record<string, { 
  franchiseeId: string
  franchiseeName: string
  status: 'protected' | 'probation' | 'overflow'
  kpiScore: number 
}> = {
  // Ontario
  'M5V': { franchiseeId: '1', franchiseeName: 'Clean Stars Toronto', status: 'protected', kpiScore: 95 },
  'M5W': { franchiseeId: '1', franchiseeName: 'Clean Stars Toronto', status: 'protected', kpiScore: 95 },
  'M5G': { franchiseeId: '2', franchiseeName: 'Downtown Cleaners', status: 'probation', kpiScore: 72 },
  'L5B': { franchiseeId: '3', franchiseeName: 'Peel Pro Clean', status: 'protected', kpiScore: 88 },
  'K1A': { franchiseeId: '4', franchiseeName: 'Capital Cleaners', status: 'protected', kpiScore: 91 },
  'N2L': { franchiseeId: '5', franchiseeName: 'KW Cleaning Co', status: 'overflow', kpiScore: 85 },
  // BC
  'V6B': { franchiseeId: '6', franchiseeName: 'West Coast Cleaners', status: 'protected', kpiScore: 92 },
  'V6E': { franchiseeId: '6', franchiseeName: 'West Coast Cleaners', status: 'probation', kpiScore: 78 },
  'V8W': { franchiseeId: '7', franchiseeName: 'Island Clean', status: 'protected', kpiScore: 89 },
  // Quebec
  'H3A': { franchiseeId: '8', franchiseeName: 'Montreal Pro Nettoyage', status: 'protected', kpiScore: 94 },
  'H3B': { franchiseeId: '8', franchiseeName: 'Montreal Pro Nettoyage', status: 'protected', kpiScore: 94 },
  'G1R': { franchiseeId: '9', franchiseeName: 'Québec Propre', status: 'protected', kpiScore: 87 },
  // Alberta
  'T2P': { franchiseeId: '10', franchiseeName: 'Calgary Clean Team', status: 'protected', kpiScore: 90 },
  'T2G': { franchiseeId: '10', franchiseeName: 'Calgary Clean Team', status: 'probation', kpiScore: 75 },
  'T5J': { franchiseeId: '11', franchiseeName: 'Edmonton Shine', status: 'protected', kpiScore: 93 },
  'T6E': { franchiseeId: '12', franchiseeName: 'South Edmonton Clean', status: 'overflow', kpiScore: 82 },
}

// Sample franchisees list
const FRANCHISEES = [
  { id: '1', name: 'Clean Stars Toronto' },
  { id: '2', name: 'Downtown Cleaners' },
  { id: '3', name: 'Peel Pro Clean' },
  { id: '4', name: 'Capital Cleaners' },
  { id: '5', name: 'KW Cleaning Co' },
  { id: '6', name: 'West Coast Cleaners' },
  { id: '7', name: 'Island Clean' },
  { id: '8', name: 'Montreal Pro Nettoyage' },
  { id: '9', name: 'Québec Propre' },
  { id: '10', name: 'Calgary Clean Team' },
  { id: '11', name: 'Edmonton Shine' },
  { id: '12', name: 'South Edmonton Clean' },
]

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  protected: '#22c55e',   // green
  probation: '#eab308',   // yellow
  overflow: '#f97316',    // orange
  unassigned: '#9ca3af',  // gray
  inactive: '#ef4444',    // red
}

const STATUS_LABELS: Record<string, string> = {
  protected: 'Protected',
  probation: 'Probation',
  overflow: 'Overflow',
  unassigned: 'Unassigned',
  inactive: 'Inactive',
}

interface FSAData {
  fsa: string
  city: string
  lat: number
  lng: number
  province: string
  status: 'protected' | 'probation' | 'overflow' | 'unassigned' | 'inactive'
  franchiseeId?: string
  franchiseeName?: string
  kpiScore?: number
}

// Component to handle map view changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

interface TerritoryMapProps {
  onSelectFSA?: (fsa: string) => void
}

export default function TerritoryMap({ onSelectFSA }: TerritoryMapProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('ON')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedFSA, setSelectedFSA] = useState<FSAData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    franchiseeId: '',
    status: 'unassigned' as string,
  })

  // Get FSAs for selected province with assignments
  const provinceFSAs = useMemo(() => {
    let baseFSAs: Array<{ fsa: string; city: string; lat: number; lng: number }> = []
    
    switch (selectedProvince) {
      case 'ON': baseFSAs = ONTARIO_FSAS; break
      case 'BC': baseFSAs = BC_FSAS; break
      case 'QC': baseFSAs = QUEBEC_FSAS; break
      case 'AB': baseFSAs = ALBERTA_FSAS; break
    }

    return baseFSAs.map(fsa => {
      const assignment = SAMPLE_ASSIGNMENTS[fsa.fsa]
      return {
        ...fsa,
        province: selectedProvince,
        status: assignment?.status || 'unassigned',
        franchiseeId: assignment?.franchiseeId,
        franchiseeName: assignment?.franchiseeName,
        kpiScore: assignment?.kpiScore,
      } as FSAData
    })
  }, [selectedProvince])

  // Filter FSAs by status
  const filteredFSAs = useMemo(() => {
    if (!statusFilter) return provinceFSAs
    return provinceFSAs.filter(fsa => fsa.status === statusFilter)
  }, [provinceFSAs, statusFilter])

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: provinceFSAs.length,
      protected: provinceFSAs.filter(f => f.status === 'protected').length,
      probation: provinceFSAs.filter(f => f.status === 'probation').length,
      overflow: provinceFSAs.filter(f => f.status === 'overflow').length,
      unassigned: provinceFSAs.filter(f => f.status === 'unassigned').length,
      inactive: provinceFSAs.filter(f => f.status === 'inactive').length,
    }
  }, [provinceFSAs])

  const config = PROVINCE_CONFIG[selectedProvince]

  const handleFSAClick = (fsa: FSAData) => {
    setSelectedFSA(fsa)
    setEditData({
      franchiseeId: fsa.franchiseeId || '',
      status: fsa.status,
    })
    setEditMode(false)
    onSelectFSA?.(fsa.fsa)
  }

  const handleSave = () => {
    // In production, this would call the API
    console.log('Saving FSA:', selectedFSA?.fsa, editData)
    alert(`FSA ${selectedFSA?.fsa} updated!\n\nFranchisee: ${FRANCHISEES.find(f => f.id === editData.franchiseeId)?.name || 'Unassigned'}\nStatus: ${editData.status}`)
    setSelectedFSA(null)
    setEditMode(false)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Province Selector */}
        <select
          value={selectedProvince}
          onChange={(e) => {
            setSelectedProvince(e.target.value)
            setSelectedFSA(null)
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white"
        >
          {Object.entries(PROVINCE_CONFIG).map(([code, { name }]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium whitespace-nowrap">
          <span className="text-gray-600">Total:</span>
          <span className="font-bold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>{stats.protected}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 rounded-full text-xs font-medium text-yellow-700 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span>{stats.probation}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-full text-xs font-medium text-orange-700 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>{stats.overflow}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span>{stats.unassigned}</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-80 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <MapContainer
          center={config.center}
          zoom={config.zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <ChangeView center={config.center} zoom={config.zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredFSAs.map((fsa) => (
            <CircleMarker
              key={fsa.fsa}
              center={[fsa.lat, fsa.lng]}
              radius={8}
              fillColor={STATUS_COLORS[fsa.status]}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
              eventHandlers={{
                click: () => handleFSAClick(fsa)
              }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <div className="font-bold text-lg text-primary">{fsa.fsa}</div>
                  <div className="text-gray-600">{fsa.city}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[fsa.status] }}
                    ></span>
                    <span className="font-medium">{STATUS_LABELS[fsa.status]}</span>
                  </div>
                  {fsa.franchiseeName && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-500">Franchisee</div>
                      <div className="font-medium">{fsa.franchiseeName}</div>
                      {fsa.kpiScore && (
                        <div className="text-sm text-gray-500">KPI: <span className="font-bold text-primary">{fsa.kpiScore}</span></div>
                      )}
                    </div>
                  )}
                  <button 
                    className="mt-2 w-full py-1 bg-primary text-white text-sm rounded font-medium"
                    onClick={() => handleFSAClick(fsa)}
                  >
                    Edit
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            ></span>
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* FSA Detail/Edit Modal */}
      {selectedFSA && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[1000]" onClick={() => setSelectedFSA(null)}>
          <div 
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedFSA.fsa}</h2>
                  <p className="text-gray-500">{selectedFSA.city}, {selectedFSA.province}</p>
                </div>
                <button onClick={() => setSelectedFSA(null)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[selectedFSA.status] }}
                ></span>
                <span className="font-semibold">{STATUS_LABELS[selectedFSA.status]}</span>
              </div>

              {/* Current Assignment */}
              {selectedFSA.franchiseeName && !editMode && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Assigned Franchisee</span>
                  </div>
                  <p className="font-semibold text-secondary-900">{selectedFSA.franchiseeName}</p>
                  {selectedFSA.kpiScore && (
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-600">KPI Score: <span className="font-bold text-primary">{selectedFSA.kpiScore}</span></span>
                    </div>
                  )}
                </div>
              )}

              {!selectedFSA.franchiseeName && !editMode && (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>This FSA is not assigned to any franchisee</p>
                </div>
              )}

              {/* Edit Form */}
              {editMode && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Franchisee
                    </label>
                    <select
                      value={editData.franchiseeId}
                      onChange={(e) => setEditData({ ...editData, franchiseeId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    >
                      <option value="">-- Unassigned --</option>
                      {FRANCHISEES.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protection Status
                    </label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                      disabled={!editData.franchiseeId}
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="protected">Protected</option>
                      <option value="probation">Probation</option>
                      <option value="overflow">Overflow</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-medium"
                  >
                    Edit Assignment
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
