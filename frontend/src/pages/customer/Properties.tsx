import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Building2, Plus, Pencil, Trash2, Loader2, Home as HomeIcon } from 'lucide-react'

interface Property {
  _id: string
  name: string
  address: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
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
  
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    
    setDeleting(id)
    try {
      await api.delete(`/properties/${id}`)
      setProperties(properties.filter(p => p._id !== id))
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete property')
    } finally {
      setDeleting(null)
    }
  }
  
  return (
    <div className="px-5 py-6 safe-top">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">My Properties</h1>
        <button className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
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
          <button className="bg-primary text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform">
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
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HomeIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-secondary-900">{property.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{property.address}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{property.bedrooms} bed</span>
                    <span>{property.bathrooms} bath</span>
                    <span>{property.squareFeet} sq ft</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary bg-primary-50 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(property._id, property.name)}
                  disabled={deleting === property._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 bg-red-50 rounded-lg disabled:opacity-50"
                >
                  {deleting === property._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
