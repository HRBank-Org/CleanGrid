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
  Minus,
  Refrigerator,
  Microwave,
  Wind,
  Shirt,
  Bed,
  Bath,
  DoorOpen,
  UtensilsCrossed
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

interface QuoteDetails {
  bedrooms: number
  bathrooms: number
  kitchens: number
  livingRooms: number
  addons: string[]
}

interface QuoteResponse {
  basePrice: number
  roomsPrice: number
  sqftPrice: number
  addonPrices: { name: string; price: number }[]
  subtotal: number
  recurringDiscount: number
  promoDiscount: number
  taxAmount: number
  totalPrice: number
  estimatedDuration: number
}

interface ConflictInfo {
  hasConflict: boolean
  conflictingBooking?: {
    date: string
    time: string
    service: string
  }
}

type BookingStep = 'property' | 'service' | 'details' | 'schedule' | 'payment' | 'confirm'

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

// Add-on options with prices and icons
const ADDON_OPTIONS = [
  { id: 'fridge', name: 'Inside Fridge', price: 35, icon: Refrigerator, duration: 20 },
  { id: 'oven', name: 'Inside Oven', price: 40, icon: Microwave, duration: 25 },
  { id: 'windows', name: 'Interior Windows', price: 45, icon: Wind, duration: 30 },
  { id: 'laundry', name: 'Laundry (Wash & Fold)', price: 30, icon: Shirt, duration: 45 },
  { id: 'cabinets', name: 'Inside Cabinets', price: 50, icon: DoorOpen, duration: 30 },
  { id: 'dishes', name: 'Dishes', price: 15, icon: UtensilsCrossed, duration: 15 },
]

// Room pricing
const ROOM_PRICES = {
  bedroom: 25,
  bathroom: 35,
  kitchen: 40,
  livingRoom: 30
}

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
  
  // Quote details (rooms & add-ons)
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
    bedrooms: 2,
    bathrooms: 1,
    kitchens: 1,
    livingRooms: 1,
    addons: []
  })
  
  // Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [calculatingQuote, setCalculatingQuote] = useState(false)
  
  // Payment
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  
  // Conflict detection
  const [checkingConflict, setCheckingConflict] = useState(false)
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)

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
    // Update quote details when property is selected
    if (selectedProperty) {
      setQuoteDetails(prev => ({
        ...prev,
        bedrooms: selectedProperty.bedrooms || 2,
        bathrooms: selectedProperty.bathrooms || 1
      }))
    }
  }, [selectedProperty])

  useEffect(() => {
    // Calculate quote when service, property, and details are set
    if (selectedProperty && selectedService) {
      calculateQuote()
    }
  }, [selectedProperty, selectedService, quoteDetails, recurring])

  useEffect(() => {
    // Check for conflicts when date/time changes
    if (selectedDate && selectedTime && selectedProperty) {
      checkBookingConflict()
    }
  }, [selectedDate, selectedTime, selectedProperty, recurring])

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
        bedrooms: quoteDetails.bedrooms,
        bathrooms: quoteDetails.bathrooms,
        kitchens: quoteDetails.kitchens,
        living_rooms: quoteDetails.livingRooms,
        frequency: recurring || 'one_time',
        addons: quoteDetails.addons
      })
      setQuote(response.data)
    } catch (err) {
      // Fallback to local calculation
      const basePrice = selectedService.serviceType === 'commercial' 
        ? selectedService.basePriceCommercial 
        : selectedService.basePriceResidential
      
      // Calculate room prices
      const roomsPrice = 
        (quoteDetails.bedrooms * ROOM_PRICES.bedroom) +
        (quoteDetails.bathrooms * ROOM_PRICES.bathroom) +
        (quoteDetails.kitchens * ROOM_PRICES.kitchen) +
        (quoteDetails.livingRooms * ROOM_PRICES.livingRoom)
      
      // Calculate add-on prices
      const addonPrices = quoteDetails.addons.map(addonId => {
        const addon = ADDON_OPTIONS.find(a => a.id === addonId)
        return { name: addon?.name || addonId, price: addon?.price || 0 }
      })
      const addonsTotal = addonPrices.reduce((sum, a) => sum + a.price, 0)
      
      // Subtotal
      const subtotal = basePrice + roomsPrice + addonsTotal
      
      // Discount
      const discountPercent = RECURRING_OPTIONS.find(r => r.value === recurring)?.discount || 0
      const recurringDiscount = subtotal * (discountPercent / 100)
      
      // Tax (13% HST)
      const taxAmount = (subtotal - recurringDiscount) * 0.13
      
      // Duration
      const baseDuration = selectedService.estimatedDuration
      const addonDuration = quoteDetails.addons.reduce((sum, addonId) => {
        const addon = ADDON_OPTIONS.find(a => a.id === addonId)
        return sum + (addon?.duration || 0)
      }, 0)
      
      setQuote({
        basePrice,
        roomsPrice,
        sqftPrice: 0,
        addonPrices,
        subtotal,
        recurringDiscount,
        promoDiscount: 0,
        taxAmount,
        totalPrice: subtotal - recurringDiscount + taxAmount,
        estimatedDuration: baseDuration + addonDuration
      })
    } finally {
      setCalculatingQuote(false)
    }
  }

  const checkBookingConflict = async () => {
    if (!selectedDate || !selectedTime || !selectedProperty) return
    
    setCheckingConflict(true)
    try {
      const response = await api.post('/bookings/check-conflict', {
        propertyId: selectedProperty._id,
        scheduledDate: `${selectedDate}T${selectedTime}:00`,
        recurring: recurring || null
      })
      setConflictInfo(response.data)
    } catch (err) {
      // If endpoint doesn't exist, check locally
      try {
        const bookingsRes = await api.get('/bookings')
        const existingBookings = bookingsRes.data
        
        const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
        const conflict = existingBookings.find((booking: any) => {
          if (booking.status === 'cancelled') return false
          const bookingDate = new Date(booking.scheduledDate)
          // Check if same day and overlapping time (within 3 hours)
          const timeDiff = Math.abs(selectedDateTime.getTime() - bookingDate.getTime())
          return timeDiff < 3 * 60 * 60 * 1000 // 3 hours
        })
        
        setConflictInfo({
          hasConflict: !!conflict,
          conflictingBooking: conflict ? {
            date: new Date(conflict.scheduledDate).toLocaleDateString(),
            time: new Date(conflict.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            service: conflict.serviceName || 'Cleaning'
          } : undefined
        })
      } catch {
        setConflictInfo({ hasConflict: false })
      }
    } finally {
      setCheckingConflict(false)
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
    if (!selectedProperty || !selectedService || !selectedDate || !selectedTime || !quote || !paymentIntentId) {
      setError('Please complete all steps including payment')
      return
    }

    if (conflictInfo?.hasConflict) {
      setError('Please select a different date/time - there is a scheduling conflict')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const bookingData = {
        serviceId: selectedService._id,
        serviceName: selectedService.name,
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
        notes: notes,
        paymentIntentId: paymentIntentId,
        paymentStatus: 'authorized',
        // Enhanced quote details
        quoteDetails: {
          bedrooms: quoteDetails.bedrooms,
          bathrooms: quoteDetails.bathrooms,
          kitchens: quoteDetails.kitchens,
          livingRooms: quoteDetails.livingRooms,
          addons: quoteDetails.addons
        }
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

  const toggleAddon = (addonId: string) => {
    setQuoteDetails(prev => ({
      ...prev,
      addons: prev.addons.includes(addonId)
        ? prev.addons.filter(id => id !== addonId)
        : [...prev.addons, addonId]
    }))
  }

  const updateRoomCount = (room: keyof QuoteDetails, delta: number) => {
    if (room === 'addons') return
    setQuoteDetails(prev => ({
      ...prev,
      [room]: Math.max(0, (prev[room] as number) + delta)
    }))
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

  const STEPS = ['property', 'service', 'details', 'schedule', 'payment', 'confirm']

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
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
            <div className={`w-4 h-0.5 ${
              STEPS.indexOf(step) > i 
                ? 'bg-primary' 
                : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const goBack = () => {
    const currentIndex = STEPS.indexOf(step)
    if (currentIndex === 0) {
      navigate(-1)
    } else {
      setStep(STEPS[currentIndex - 1] as BookingStep)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button 
            onClick={goBack}
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
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          <span>{property.bedrooms} bed</span>
                          <span>{property.bathrooms} bath</span>
                          <span>{property.squareFeet} sq ft</span>
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
                
                <input
                  type="text"
                  placeholder="Property Name (e.g., Home, Office)"
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />

                <input
                  type="text"
                  placeholder="Street Address"
                  value={newProperty.address}
                  onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Unit/Apt #"
                    value={newProperty.apartmentNumber}
                    onChange={(e) => setNewProperty({ ...newProperty, apartmentNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={newProperty.postalCode}
                    onChange={(e) => setNewProperty({ ...newProperty, postalCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewProperty(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600"
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

            {selectedProperty && (
              <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary-900">{selectedProperty.name}</p>
                  <p className="text-xs text-gray-500">{selectedProperty.address}</p>
                </div>
                <button onClick={() => setStep('property')} className="text-primary text-sm font-medium">
                  Change
                </button>
              </div>
            )}

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
                      setStep('details')
                    }}
                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                      selectedService?._id === service._id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
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
                ))}
            </div>
          </div>
        )}

        {/* Step 3: Customize Quote (Rooms & Add-ons) */}
        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Customize Your Clean</h2>
              <p className="text-gray-500 text-sm">Tell us about your space for an accurate quote</p>
            </div>

            {/* Rooms */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-secondary-900 mb-4">Rooms</h3>
              
              <div className="space-y-4">
                {/* Bedrooms */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bed className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-secondary-900">Bedrooms</p>
                      <p className="text-xs text-gray-400">+${ROOM_PRICES.bedroom} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateRoomCount('bedrooms', -1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quoteDetails.bedrooms}</span>
                    <button
                      onClick={() => updateRoomCount('bedrooms', 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bath className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-secondary-900">Bathrooms</p>
                      <p className="text-xs text-gray-400">+${ROOM_PRICES.bathroom} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateRoomCount('bathrooms', -1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quoteDetails.bathrooms}</span>
                    <button
                      onClick={() => updateRoomCount('bathrooms', 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Kitchens */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-secondary-900">Kitchens</p>
                      <p className="text-xs text-gray-400">+${ROOM_PRICES.kitchen} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateRoomCount('kitchens', -1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quoteDetails.kitchens}</span>
                    <button
                      onClick={() => updateRoomCount('kitchens', 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Living Rooms */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-secondary-900">Living Rooms</p>
                      <p className="text-xs text-gray-400">+${ROOM_PRICES.livingRoom} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateRoomCount('livingRooms', -1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quoteDetails.livingRooms}</span>
                    <button
                      onClick={() => updateRoomCount('livingRooms', 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-semibold text-secondary-900 mb-4">Add-on Services</h3>
              <div className="grid grid-cols-2 gap-3">
                {ADDON_OPTIONS.map((addon) => {
                  const isSelected = quoteDetails.addons.includes(addon.id)
                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <addon.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                        {isSelected && <Check className="w-3 h-3 text-primary ml-auto" />}
                      </div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-secondary-900'}`}>
                        {addon.name}
                      </p>
                      <p className="text-xs text-gray-500">+${addon.price}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Frequency */}
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

            {/* Live Quote Preview */}
            {quote && (
              <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/80 text-sm">Estimated Total</p>
                    <p className="text-2xl font-bold">${quote.totalPrice.toFixed(2)} CAD</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm">Duration</p>
                    <p className="font-semibold">~{formatDuration(quote.estimatedDuration)}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('schedule')}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold"
            >
              Continue to Schedule
            </button>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 'schedule' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Pick Date & Time</h2>
              <p className="text-gray-500 text-sm">When should we come?</p>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
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

            {/* Conflict Warning */}
            {checkingConflict && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Checking availability...</span>
              </div>
            )}

            {conflictInfo?.hasConflict && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Scheduling Conflict</p>
                    <p className="text-sm text-red-700 mt-1">
                      You already have a booking on {conflictInfo.conflictingBooking?.date} at{' '}
                      {conflictInfo.conflictingBooking?.time}. Please select a different time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Access codes, pet info, focus areas..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
              />
            </div>

            <button
              onClick={() => setStep('payment')}
              disabled={!selectedDate || !selectedTime || conflictInfo?.hasConflict}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Payment</h2>
              <p className="text-gray-500 text-sm">Secure payment - charged after completion</p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
              <h3 className="font-semibold text-secondary-900 mb-3">Order Summary</h3>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base ({selectedService?.name})</span>
                <span className="font-medium">${quote?.basePrice.toFixed(2)}</span>
              </div>
              
              {quote && quote.roomsPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Rooms ({quoteDetails.bedrooms}BR + {quoteDetails.bathrooms}BA + {quoteDetails.kitchens}K + {quoteDetails.livingRooms}LR)
                  </span>
                  <span className="font-medium">${quote.roomsPrice.toFixed(2)}</span>
                </div>
              )}
              
              {quote?.addonPrices.map((addon, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{addon.name}</span>
                  <span className="font-medium">${addon.price.toFixed(2)}</span>
                </div>
              ))}
              
              {quote && quote.recurringDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{RECURRING_OPTIONS.find(r => r.value === recurring)?.label} discount</span>
                  <span>-${quote.recurringDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (HST 13%)</span>
                <span className="font-medium">${quote?.taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                <span>Total</span>
                <span className="text-primary text-lg">${quote?.totalPrice.toFixed(2)} CAD</span>
              </div>
            </div>

            {/* Payment Form */}
            {quote && user && (
              <StripePayment
                amount={quote.totalPrice}
                bookingId={bookingId || `temp_${Date.now()}`}
                serviceName={selectedService?.name || 'Cleaning Service'}
                customerEmail={user.email}
                onSuccess={(intentId) => {
                  setPaymentIntentId(intentId)
                  setStep('confirm')
                }}
                onError={(err) => setError(err)}
              />
            )}

            <p className="text-xs text-center text-gray-400">
              Your card will be authorized but not charged until your cleaning is completed.
            </p>
          </div>
        )}

        {/* Step 6: Confirm */}
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
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-semibold text-secondary-900">{selectedService?.name}</p>
                    <p className="text-sm text-gray-600">
                      {quoteDetails.bedrooms}BR, {quoteDetails.bathrooms}BA, {quoteDetails.kitchens}K
                      {quoteDetails.addons.length > 0 && ` + ${quoteDetails.addons.length} add-ons`}
                    </p>
                    {recurring && (
                      <p className="text-sm text-green-600 font-medium">
                        {RECURRING_OPTIONS.find(r => r.value === recurring)?.label}
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

              {/* Price */}
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary text-lg">${quote?.totalPrice.toFixed(2)} CAD</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Duration: ~{formatDuration(quote?.estimatedDuration || 0)}
                </p>
              </div>
            </div>

            {/* Payment Authorized */}
            <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">Payment Authorized</p>
                <p className="text-sm text-green-700">
                  Your payment of ${quote?.totalPrice.toFixed(2)} has been authorized. 
                  You'll only be charged after your cleaning is complete.
                </p>
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
                <>Confirm Booking • ${quote?.totalPrice.toFixed(2)}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
