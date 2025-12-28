import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Province centers and zoom levels
const PROVINCE_CONFIG: Record<string, { center: [number, number]; zoom: number; name: string }> = {
  ALL: { center: [56.1304, -106.3468], zoom: 4, name: 'All Canada' },
  ON: { center: [44.0, -79.5], zoom: 6, name: 'Ontario' },
  BC: { center: [53.7, -125.0], zoom: 5, name: 'British Columbia' },
  QC: { center: [46.8, -71.2], zoom: 6, name: 'Quebec' },
  AB: { center: [53.5, -114.0], zoom: 6, name: 'Alberta' },
}

// Sample FSA data with coordinates (real implementation would fetch from backend)
const FSA_DATA: Array<{
  fsa: string
  province: string
  city: string
  lat: number
  lng: number
  status: 'protected' | 'probation' | 'overflow' | 'unassigned' | 'inactive'
  franchisee?: string
  kpiScore?: number
}> = [
  // Ontario
  { fsa: 'M5V', province: 'ON', city: 'Toronto', lat: 43.6426, lng: -79.3871, status: 'protected', franchisee: 'Clean Stars Toronto', kpiScore: 95 },
  { fsa: 'M5W', province: 'ON', city: 'Toronto', lat: 43.6450, lng: -79.3800, status: 'protected', franchisee: 'Clean Stars Toronto', kpiScore: 95 },
  { fsa: 'M4Y', province: 'ON', city: 'Toronto', lat: 43.6680, lng: -79.3832, status: 'unassigned' },
  { fsa: 'M5G', province: 'ON', city: 'Toronto', lat: 43.6570, lng: -79.3840, status: 'probation', franchisee: 'Downtown Cleaners', kpiScore: 72 },
  { fsa: 'M5H', province: 'ON', city: 'Toronto', lat: 43.6510, lng: -79.3790, status: 'unassigned' },
  { fsa: 'L5B', province: 'ON', city: 'Mississauga', lat: 43.5890, lng: -79.6441, status: 'protected', franchisee: 'Peel Pro Clean', kpiScore: 88 },
  { fsa: 'L5M', province: 'ON', city: 'Mississauga', lat: 43.5650, lng: -79.7200, status: 'unassigned' },
  { fsa: 'K1A', province: 'ON', city: 'Ottawa', lat: 45.4215, lng: -75.6972, status: 'protected', franchisee: 'Capital Cleaners', kpiScore: 91 },
  { fsa: 'K2P', province: 'ON', city: 'Ottawa', lat: 45.4100, lng: -75.6900, status: 'unassigned' },
  { fsa: 'N2L', province: 'ON', city: 'Waterloo', lat: 43.4643, lng: -80.5204, status: 'overflow', franchisee: 'KW Cleaning Co', kpiScore: 85 },
  // British Columbia
  { fsa: 'V6B', province: 'BC', city: 'Vancouver', lat: 49.2827, lng: -123.1207, status: 'protected', franchisee: 'West Coast Cleaners', kpiScore: 92 },
  { fsa: 'V6E', province: 'BC', city: 'Vancouver', lat: 49.2850, lng: -123.1300, status: 'probation', franchisee: 'West Coast Cleaners', kpiScore: 78 },
  { fsa: 'V6G', province: 'BC', city: 'Vancouver', lat: 49.2900, lng: -123.1350, status: 'unassigned' },
  { fsa: 'V5K', province: 'BC', city: 'Vancouver', lat: 49.2800, lng: -123.0400, status: 'unassigned' },
  { fsa: 'V8W', province: 'BC', city: 'Victoria', lat: 48.4284, lng: -123.3656, status: 'protected', franchisee: 'Island Clean', kpiScore: 89 },
  { fsa: 'V8V', province: 'BC', city: 'Victoria', lat: 48.4200, lng: -123.3700, status: 'unassigned' },
  // Quebec
  { fsa: 'H3A', province: 'QC', city: 'Montreal', lat: 45.5017, lng: -73.5673, status: 'protected', franchisee: 'Montreal Pro Nettoyage', kpiScore: 94 },
  { fsa: 'H3B', province: 'QC', city: 'Montreal', lat: 45.5050, lng: -73.5700, status: 'protected', franchisee: 'Montreal Pro Nettoyage', kpiScore: 94 },
  { fsa: 'H2Y', province: 'QC', city: 'Montreal', lat: 45.5088, lng: -73.5540, status: 'unassigned' },
  { fsa: 'H4A', province: 'QC', city: 'Montreal', lat: 45.4700, lng: -73.6100, status: 'inactive' },
  { fsa: 'G1R', province: 'QC', city: 'Quebec City', lat: 46.8139, lng: -71.2080, status: 'protected', franchisee: 'Quebec Propre', kpiScore: 87 },
  { fsa: 'G1K', province: 'QC', city: 'Quebec City', lat: 46.8200, lng: -71.2200, status: 'unassigned' },
  // Alberta
  { fsa: 'T2P', province: 'AB', city: 'Calgary', lat: 51.0447, lng: -114.0719, status: 'protected', franchisee: 'Calgary Clean Team', kpiScore: 90 },
  { fsa: 'T2G', province: 'AB', city: 'Calgary', lat: 51.0400, lng: -114.0500, status: 'probation', franchisee: 'Calgary Clean Team', kpiScore: 75 },
  { fsa: 'T2R', province: 'AB', city: 'Calgary', lat: 51.0350, lng: -114.0800, status: 'unassigned' },
  { fsa: 'T5J', province: 'AB', city: 'Edmonton', lat: 53.5461, lng: -113.4938, status: 'protected', franchisee: 'Edmonton Shine', kpiScore: 93 },
  { fsa: 'T5K', province: 'AB', city: 'Edmonton', lat: 53.5500, lng: -113.5100, status: 'unassigned' },
  { fsa: 'T6E', province: 'AB', city: 'Edmonton', lat: 53.5200, lng: -113.4800, status: 'overflow', franchisee: 'South Edmonton Clean', kpiScore: 82 },
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
  const [selectedProvince, setSelectedProvince] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filteredFSAs = useMemo(() => {
    return FSA_DATA.filter(fsa => {
      if (selectedProvince !== 'ALL' && fsa.province !== selectedProvince) return false
      if (statusFilter && fsa.status !== statusFilter) return false
      return true
    })
  }, [selectedProvince, statusFilter])

  const stats = useMemo(() => {
    const data = selectedProvince === 'ALL' ? FSA_DATA : FSA_DATA.filter(f => f.province === selectedProvince)
    return {
      total: data.length,
      protected: data.filter(f => f.status === 'protected').length,
      probation: data.filter(f => f.status === 'probation').length,
      overflow: data.filter(f => f.status === 'overflow').length,
      unassigned: data.filter(f => f.status === 'unassigned').length,
      inactive: data.filter(f => f.status === 'inactive').length,
    }
  }, [selectedProvince])

  const config = PROVINCE_CONFIG[selectedProvince]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Province Selector */}
        <select
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
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
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
          <span className="text-gray-600">Total:</span>
          <span className="font-bold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full text-xs font-medium text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span>{stats.protected}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 rounded-full text-xs font-medium text-yellow-700">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span>{stats.probation}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-full text-xs font-medium text-orange-700">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>{stats.overflow}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
          <span>{stats.unassigned}</span>
        </div>
        {stats.inactive > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full text-xs font-medium text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{stats.inactive}</span>
          </div>
        )}
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
              radius={selectedProvince === 'ALL' ? 6 : 10}
              fillColor={STATUS_COLORS[fsa.status]}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
              eventHandlers={{
                click: () => onSelectFSA?.(fsa.fsa)
              }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <div className="font-bold text-lg text-primary">{fsa.fsa}</div>
                  <div className="text-gray-600">{fsa.city}, {fsa.province}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[fsa.status] }}
                    ></span>
                    <span className="font-medium">{STATUS_LABELS[fsa.status]}</span>
                  </div>
                  {fsa.franchisee && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-500">Franchisee</div>
                      <div className="font-medium">{fsa.franchisee}</div>
                      {fsa.kpiScore && (
                        <div className="text-sm text-gray-500">KPI: <span className="font-bold text-primary">{fsa.kpiScore}</span></div>
                      )}
                    </div>
                  )}
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
    </div>
  )
}
