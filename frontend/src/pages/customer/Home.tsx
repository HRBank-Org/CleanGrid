import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import { Sparkles, ChevronRight, Loader2, Home as HomeIcon, Building2 } from 'lucide-react'

interface Service {
  _id: string
  name: string
  category: string
  serviceType: string
  description: string
  basePriceResidential: number
  basePriceCommercial: number
  pricePerSqFt: number
  estimatedDuration: number
}

export default function Home() {
  const { user } = useAuthStore()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadServices()
  }, [])
  
  const loadServices = async () => {
    try {
      const response = await api.get('/services')
      setServices(response.data)
    } catch (error) {
      console.error('Failed to load services:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="px-5 py-6 safe-top">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Hello,</p>
        <h1 className="text-2xl font-bold text-secondary-900">
          {user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-lg mb-1">Book a Cleaning</h2>
            <p className="text-white/80 text-sm">Professional cleaning for your space</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <button className="mt-4 bg-white text-primary font-semibold px-5 py-2.5 rounded-xl text-sm active:scale-[0.98] transition-transform">
          Get Quote
        </button>
      </div>
      
      {/* Services */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Our Services</h2>
          <button className="text-primary text-sm font-medium">View all</button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No services available
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-secondary-900">{service.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary rounded-full capitalize">
                        {service.serviceType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{service.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-primary font-bold">${service.basePrice}</span>
                      <span className="text-xs text-gray-400">{service.durationMinutes} min</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
