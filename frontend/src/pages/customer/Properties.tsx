import { useState, useEffect } from 'react'
import api from '../../services/api'
import { 
  Building2, Plus, Pencil, Trash2, Loader2, Home as HomeIcon, 
  X, MapPin, AlertCircle, Check, Search
} from 'lucide-react'

interface Property {
  _id: string
  name: string
  address: string
  apartmentNumber?: string
  postalCode: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
  hasActiveBookings?: boolean
}

interface PropertyForm {
  name: string
  address: string
  apartmentNumber: string
  postalCode: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
}

const initialForm: PropertyForm = {
  name: '',
  address: '',
  apartmentNumber: '',
  postalCode: '',
  propertyType: 'residential',
  bedrooms: 2,
  bathrooms: 1,
  squareFeet: 1000
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PropertyForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validatingAddress, setValidatingAddress] = useState(false)
  const [addressValid, setAddressValid] = useState<boolean | null>(null)
  const [geocodeInfo, setGeocodeInfo] = useState<{ geocoded: boolean; formattedAddress?: string; hasCoverage?: boolean } | null>(null)
  
  useEffect(() => {
    loadProperties()
  }, [])
  
  const loadProperties = async () => {
    try {
      const response = await api.get('/properties')
      setProperties(response.data)
    } catch (error) {
      console.error('Failed to load properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateAddress = async () => {
    if (!form.address || !form.postalCode) {
      setError('Please enter address and postal code')
      return false
    }

    setValidatingAddress(true)
    setError(null)
    setGeocodeInfo(null)
    
    try {
      // Validate postal code format (Canadian)
      const postalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
      if (!postalRegex.test(form.postalCode)) {
        setError('Please enter a valid Canadian postal code (e.g., M5V 3A8)')
        setAddressValid(false)
        return false
      }

      // Call backend for geocoding validation
      const response = await api.post('/properties/validate-address', {
        address: form.address,
        postalCode: form.postalCode
      })
      
      if (response.data.valid) {
        setAddressValid(true)
        setGeocodeInfo({
          geocoded: response.data.geocoded,
          formattedAddress: response.data.formattedAddress,
          hasCoverage: response.data.hasCoverage
        })
        return true
      } else {
        setError(response.data.message || 'Address could not be verified')
        setAddressValid(false)
        return false
      }
    } catch (err: any) {
      // If validation endpoint doesn't exist, just validate format
      const postalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/
      if (postalRegex.test(form.postalCode)) {
        setAddressValid(true)
        return true
      }
      setError('Could not validate address. Please verify manually.')
      setAddressValid(null)
      return true // Allow to proceed anyway
    } finally {
      setValidatingAddress(false)
    }
  }
  
  const handleOpenAdd = () => {
    setForm(initialForm)
    setEditingId(null)
    setError(null)
    setAddressValid(null)
    setShowModal(true)
  }

  const handleOpenEdit = (property: Property) => {
    setForm({
      name: property.name,
      address: property.address,
      apartmentNumber: property.apartmentNumber || '',
      postalCode: property.postalCode || '',
      propertyType: property.propertyType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.squareFeet
    })
    setEditingId(property._id)
    setError(null)
    setAddressValid(true) // Assume existing addresses are valid
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.address || !form.postalCode) {
      setError('Please fill in all required fields')
      return
    }

    // Validate address before saving
    const isValid = await validateAddress()
    if (!isValid && addressValid === false) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        // Update existing
        await api.patch(`/properties/${editingId}`, form)
        setProperties(properties.map(p => 
          p._id === editingId ? { ...p, ...form } : p
        ))
      } else {
        // Create new
        const response = await api.post('/properties', form)
        setProperties([...properties, response.data])
      }
      setShowModal(false)
      setForm(initialForm)
      setEditingId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save property')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async (property: Property) => {
    // Check for active bookings
    if (property.hasActiveBookings) {
      alert(`Cannot delete "${property.name}" - there are active bookings for this property. Please cancel the bookings first.`)
      return
    }

    if (!confirm(`Delete "${property.name}"? This cannot be undone.`)) return
    
    setDeleting(property._id)
    try {
      await api.delete(`/properties/${property._id}`)
      setProperties(properties.filter(p => p._id !== property._id))
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete property'
      if (message.includes('booking') || message.includes('active')) {
        alert(`Cannot delete "${property.name}" - there are active bookings for this property.`)
      } else {
        alert(message)
      }
    } finally {
      setDeleting(null)
    }
  }

  const Modal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-secondary-900">
            {editingId ? 'Edit Property' : 'Add Property'}
          </h3>
          <button 
            onClick={() => setShowModal(false)} 
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Home, Office, Cottage"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
            <div className="relative">
              <input
                type="text"
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value })
                  setAddressValid(null)
                }}
                placeholder="123 Main Street, City"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent pr-10 ${
                  addressValid === true ? 'border-green-300 bg-green-50' :
                  addressValid === false ? 'border-red-300 bg-red-50' :
                  'border-gray-200'
                }`}
              />
              {addressValid === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
              {addressValid === false && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Apt #</label>
              <input
                type="text"
                value={form.apartmentNumber}
                onChange={(e) => setForm({ ...form, apartmentNumber: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => {
                  setForm({ ...form, postalCode: e.target.value.toUpperCase() })
                  setAddressValid(null)
                }}
                placeholder="M5V 3A8"
                maxLength={7}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={validateAddress}
            disabled={validatingAddress || !form.address || !form.postalCode}
            className="w-full py-2 border border-primary text-primary rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {validatingAddress ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            Verify Address
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <div className="grid grid-cols-2 gap-3">
              {['residential', 'commercial'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, propertyType: type })}
                  className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 capitalize transition-colors ${
                    form.propertyType === type
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {type === 'commercial' ? <Building2 className="w-4 h-4" /> : <HomeIcon className="w-4 h-4" />}
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
              <input
                type="number"
                value={form.squareFeet}
                onChange={(e) => setForm({ ...form, squareFeet: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
              <input
                type="number"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
              <input
                type="number"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.address || !form.postalCode}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? 'Update' : 'Add Property'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="px-5 py-6 safe-top pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">My Properties</h1>
        <button 
          onClick={handleOpenAdd}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Properties Yet</h3>
          <p className="text-gray-400 mb-6">Add your first property to get started</p>
          <button 
            onClick={handleOpenAdd}
            className="bg-primary text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            Add Property
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <div
              key={property._id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  property.propertyType === 'commercial' ? 'bg-blue-50' : 'bg-primary-50'
                }`}>
                  {property.propertyType === 'commercial' ? (
                    <Building2 className="w-6 h-6 text-blue-600" />
                  ) : (
                    <HomeIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-secondary-900">{property.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{property.address}</p>
                  {property.apartmentNumber && (
                    <p className="text-xs text-gray-400">Unit {property.apartmentNumber}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{property.bedrooms} bed</span>
                    <span>{property.bathrooms} bath</span>
                    <span>{property.squareFeet} sq ft</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => handleOpenEdit(property)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(property)}
                  disabled={deleting === property._id || property.hasActiveBookings}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    property.hasActiveBookings 
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                      : 'text-red-500 bg-red-50 hover:bg-red-100'
                  }`}
                  title={property.hasActiveBookings ? 'Cannot delete - has active bookings' : 'Delete property'}
                >
                  {deleting === property._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
                {property.hasActiveBookings && (
                  <span className="text-xs text-amber-600 ml-auto">Has active bookings</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <Modal />}
    </div>
  )
}
