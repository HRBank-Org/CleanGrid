import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import StripePayment from '../../components/StripePayment'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Home, 
  Building2, 
  Plus,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  CreditCard
} from 'lucide-react'

interface Property {
  _id: string
  name: string
  address: string
  apartmentNumber?: string
  postalCode: string
  propertyType: string
  squareFeet: number
  bedrooms: number
  bathrooms: number
}

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

interface QuoteResponse {
  basePrice: number
  sqftPrice: number
  addonPrices: { name: string; price: number }[]
  subtotal: number
  recurringDiscount: number
  promoDiscount: number
  taxAmount: number
  totalPrice: number
  estimatedDuration: number
}

type BookingStep = 'property' | 'service' | 'schedule' | 'payment' | 'confirm'

const RECURRING_OPTIONS = [
  { value: '', label: 'One-time', discount: 0 },
  { value: 'weekly', label: 'Weekly', discount: 15 },
  { value: 'biweekly', label: 'Bi-weekly', discount: 10 },
  { value: 'monthly', label: 'Monthly', discount: 5 },
]

const TIME_SLOTS = [
  { value: '08:00', label: '8:00 AM - 10:00 AM' },
  { value: '10:00', label: '10:00 AM - 12:00 PM' },
  { value: '12:00', label: '12:00 PM - 2:00 PM' },
  { value: '14:00', label: '2:00 PM - 4:00 PM' },
  { value: '16:00', label: '4:00 PM - 6:00 PM' },
]

export default function Book() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  
  const [step, setStep] = useState<BookingStep>('property')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data
  const [properties, setProperties] = useState<Property[]>([])
  const [services, setServices] = useState<Service[]>([])
  
  // Selections
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [recurring, setRecurring] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  
  // Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [calculatingQuote, setCalculatingQuote] = useState(false)
  
  // Payment
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  // New property form
  const [showNewProperty, setShowNewProperty] = useState(false)
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    apartmentNumber: '',
    postalCode: '',
    propertyType: 'residential',
    squareFeet: 1000,
    bedrooms: 2,
    bathrooms: 1
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Pre-select service from URL param
    const serviceId = searchParams.get('service')
    if (serviceId && services.length > 0) {
      const service = services.find(s => s._id === serviceId)
      if (service) {
        setSelectedService(service)
      }
    }
  }, [searchParams, services])

  useEffect(() => {
    // Calculate quote when service and property are selected
    if (selectedProperty && selectedService) {
      calculateQuote()
    }
  }, [selectedProperty, selectedService, recurring])

  const loadData = async () => {
    try {
      const [propertiesRes, servicesRes] = await Promise.all([
        api.get('/properties'),
        api.get('/services')
      ])
      setProperties(propertiesRes.data)
      setServices(servicesRes.data)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateQuote = async () => {
    if (!selectedProperty || !selectedService) return
    
    setCalculatingQuote(true)
    try {
      const response = await api.post('/quotes/enhanced', {
        service_category: selectedService.category,
        property_type: selectedService.serviceType,
        square_feet: selectedProperty.squareFeet || 1000,
        bedrooms: selectedProperty.bedrooms || 2,
        bathrooms: selectedProperty.bathrooms || 1,
        frequency: recurring || 'one_time',
        addons: []
      })
      setQuote(response.data)
    } catch (err) {
      // Fallback to simple calculation
      const basePrice = selectedService.serviceType === 'commercial' 
        ? selectedService.basePriceCommercial 
        : selectedService.basePriceResidential
      const sqftPrice = selectedService.pricePerSqFt * (selectedProperty.squareFeet || 1000)
      const subtotal = basePrice + sqftPrice
      const discount = recurring ? subtotal * (RECURRING_OPTIONS.find(r => r.value === recurring)?.discount || 0) / 100 : 0
      const tax = (subtotal - discount) * 0.13
      
      setQuote({
        basePrice,
        sqftPrice,
        addonPrices: [],
        subtotal,
        recurringDiscount: discount,
        promoDiscount: 0,
        taxAmount: tax,
        totalPrice: subtotal - discount + tax,
        estimatedDuration: selectedService.estimatedDuration
      })
    } finally {
      setCalculatingQuote(false)
    }
  }

  const handleCreateProperty = async () => {
    if (!newProperty.name || !newProperty.address || !newProperty.postalCode) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await api.post('/properties', newProperty)
      setProperties([...properties, response.data])
      setSelectedProperty(response.data)
      setShowNewProperty(false)
      setNewProperty({
        name: '',
        address: '',
        apartmentNumber: '',
        postalCode: '',
        propertyType: 'residential',
        squareFeet: 1000,
        bedrooms: 2,
        bathrooms: 1
      })
      setStep('service')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create property')
    }
  }

  const handleSubmitBooking = async () => {
    if (!selectedProperty || !selectedService || !selectedDate || !selectedTime || !quote) {
      setError('Please complete all steps')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const bookingData = {
        serviceId: selectedService._id,
        serviceType: selectedService.serviceType,
        address: selectedProperty.apartmentNumber 
          ? `${selectedProperty.address}, Unit ${selectedProperty.apartmentNumber}`
          : selectedProperty.address,
        postalCode: selectedProperty.postalCode,
        squareFeet: selectedProperty.squareFeet || 1000,
        scheduledDate: `${selectedDate}T${selectedTime}:00`,
        isRecurring: !!recurring,
        recurringFrequency: recurring || null,
        totalPrice: quote.totalPrice,
        notes: notes
      }

      await api.post('/bookings', bookingData)
      
      // Success - navigate to bookings page
      navigate('/bookings', { state: { success: true } })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
    }
    return `${minutes} minutes`
  }

  const STEPS = ['property', 'service', 'schedule', 'payment', 'confirm']

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
            step === s 
              ? 'bg-primary text-white' 
              : STEPS.indexOf(step) > i
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-500'
          }`}>
            {STEPS.indexOf(step) > i ? (
              <Check className="w-3 h-3" />
            ) : (
              i + 1
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 ${
              STEPS.indexOf(step) > i 
                ? 'bg-primary' 
                : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => {
              if (step === 'property') {
                navigate(-1)
              } else if (step === 'service') {
                setStep('property')
              } else if (step === 'schedule') {
                setStep('service')
              } else if (step === 'payment') {
                setStep('schedule')
              } else {
                setStep('payment')
              }
            }}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-secondary-900">Book a Cleaning</h1>
        </div>
        {renderStepIndicator()}
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Select Property */}
        {step === 'property' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Select Location</h2>
              <p className="text-gray-500 text-sm">Where should we clean?</p>
            </div>

            {properties.length > 0 && !showNewProperty && (
              <div className="space-y-3">
                {properties.map((property) => (
                  <div
                    key={property._id}
                    onClick={() => {
                      setSelectedProperty(property)
                      setStep('service')
                    }}
                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                      selectedProperty?._id === property._id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        property.propertyType === 'commercial' ? 'bg-blue-100' : 'bg-primary-50'
                      }`}>
                        {property.propertyType === 'commercial' ? (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Home className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-secondary-900">{property.name}</h3>
                        <p className="text-sm text-gray-500">{property.address}</p>
                        {property.apartmentNumber && (
                          <p className="text-sm text-gray-400">Unit {property.apartmentNumber}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          <span>{property.squareFeet} sq ft</span>
                          {property.bedrooms > 0 && <span>{property.bedrooms} bed</span>}
                          {property.bathrooms > 0 && <span>{property.bathrooms} bath</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showNewProperty && (
              <button
                onClick={() => setShowNewProperty(true)}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add New Address
              </button>
            )}

            {showNewProperty && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-4">
                <h3 className="font-semibold text-secondary-900">New Property</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Home, Office"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    placeholder="123 Main Street"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Apt #</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={newProperty.apartmentNumber}
                      onChange={(e) => setNewProperty({ ...newProperty, apartmentNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      placeholder="M5V 3A8"
                      value={newProperty.postalCode}
                      onChange={(e) => setNewProperty({ ...newProperty, postalCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['residential', 'commercial'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewProperty({ ...newProperty, propertyType: type })}
                        className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 capitalize transition-colors ${
                          newProperty.propertyType === type
                            ? 'border-primary bg-primary-50 text-primary'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {type === 'commercial' ? <Building2 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
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
                      value={newProperty.squareFeet}
                      onChange={(e) => setNewProperty({ ...newProperty, squareFeet: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                    <input
                      type="number"
                      value={newProperty.bedrooms}
                      onChange={(e) => setNewProperty({ ...newProperty, bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
                    <input
                      type="number"
                      value={newProperty.bathrooms}
                      onChange={(e) => setNewProperty({ ...newProperty, bathrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewProperty(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProperty}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-medium"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 'service' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Choose Service</h2>
              <p className="text-gray-500 text-sm">What type of cleaning do you need?</p>
            </div>

            {/* Selected Property Summary */}
            {selectedProperty && (
              <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary-900">{selectedProperty.name}</p>
                  <p className="text-xs text-gray-500">{selectedProperty.address}</p>
                </div>
                <button 
                  onClick={() => setStep('property')}
                  className="text-primary text-sm font-medium"
                >
                  Change
                </button>
              </div>
            )}

            {/* Filter services by property type */}
            <div className="space-y-3">
              {services
                .filter(s => selectedProperty?.propertyType === 'commercial' 
                  ? s.serviceType === 'commercial' 
                  : s.serviceType === 'residential')
                .map((service) => (
                  <div
                    key={service._id}
                    onClick={() => {
                      setSelectedService(service)
                      setStep('schedule')
                    }}
                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                      selectedService?._id === service._id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-secondary-900">{service.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-primary font-bold">
                            From ${(selectedProperty?.propertyType === 'commercial' 
                              ? service.basePriceCommercial 
                              : service.basePriceResidential).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400">~{formatDuration(service.estimatedDuration)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                ))}
            </div>

            {/* Recurring Options */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-secondary-900 mb-3">Cleaning Frequency</h3>
              <div className="grid grid-cols-2 gap-2">
                {RECURRING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecurring(option.value)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm transition-colors ${
                      recurring === option.value
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    {option.discount > 0 && (
                      <span className="block text-xs text-green-600 mt-1">Save {option.discount}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 'schedule' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Pick Date & Time</h2>
              <p className="text-gray-500 text-sm">When should we come?</p>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-secondary-900">{selectedProperty?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium text-secondary-900">{selectedService?.name}</p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Select Date
              </label>
              <input
                type="date"
                min={getMinDate()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Time Selection */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preferred Time Window
              </label>
              <div className="space-y-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.value}
                    onClick={() => setSelectedTime(slot.value)}
                    className={`w-full py-3 px-4 rounded-xl border-2 text-left transition-colors ${
                      selectedTime === slot.value
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or access instructions?"
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={() => setStep('confirm')}
              disabled={!selectedDate || !selectedTime}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review Booking
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Confirm Booking</h2>
              <p className="text-gray-500 text-sm">Review your booking details</p>
            </div>

            {/* Booking Summary */}
            <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-secondary-900">{selectedProperty?.name}</p>
                    <p className="text-sm text-gray-600">{selectedProperty?.address}</p>
                    {selectedProperty?.apartmentNumber && (
                      <p className="text-sm text-gray-500">Unit {selectedProperty.apartmentNumber}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-semibold text-secondary-900">{selectedService?.name}</p>
                    {recurring && (
                      <p className="text-sm text-green-600 font-medium">
                        {RECURRING_OPTIONS.find(r => r.value === recurring)?.label} • Save {RECURRING_OPTIONS.find(r => r.value === recurring)?.discount}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold text-secondary-900">
                      {new Date(selectedDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {TIME_SLOTS.find(t => t.value === selectedTime)?.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <h3 className="font-semibold text-secondary-900 mb-3">Price Breakdown</h3>
                
                {calculatingQuote ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : quote ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base price</span>
                      <span className="text-secondary-900">${quote.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Square footage ({selectedProperty?.squareFeet} sq ft)</span>
                      <span className="text-secondary-900">${quote.sqftPrice.toFixed(2)}</span>
                    </div>
                    {quote.recurringDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Recurring discount</span>
                        <span>-${quote.recurringDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (HST 13%)</span>
                      <span className="text-secondary-900">${quote.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                      <span className="text-secondary-900">Total</span>
                      <span className="text-primary text-lg">${quote.totalPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Estimated duration: ~{formatDuration(quote.estimatedDuration)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Payment Notice */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Secure Payment</p>
                <p className="text-sm text-blue-700">Payment will be held securely until the job is completed to your satisfaction.</p>
              </div>
            </div>

            {notes && (
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Special Instructions</p>
                <p className="text-secondary-900">{notes}</p>
              </div>
            )}

            <button
              onClick={handleSubmitBooking}
              disabled={submitting}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Booking • ${quote?.totalPrice.toFixed(2)}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
