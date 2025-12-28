import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Calendar, MapPin, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Booking {
  _id: string
  serviceName: string
  address: string
  scheduledDate: string
  status: string
  totalPrice: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadBookings()
  }, [])
  
  const loadBookings = async () => {
    try {
      const response = await api.get('/bookings')
      setBookings(response.data)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    
    try {
      await api.put(`/bookings/${bookingId}/status`, { status: 'cancelled' })
      loadBookings()
    } catch (error) {
      alert('Failed to cancel booking')
    }
  }
  
  return (
    <div className="px-5 py-6 safe-top">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">My Bookings</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Bookings Yet</h3>
          <p className="text-gray-400">Book your first cleaning service!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-secondary-900">{booking.serviceName}</h3>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                    {booking.status}
                  </span>
                </div>
                <span className="font-bold text-primary">${booking.totalPrice}</span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">{booking.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(booking.scheduledDate), 'MMM d, yyyy • h:mm a')}</span>
                </div>
              </div>
              
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <button
                  onClick={() => handleCancel(booking._id)}
                  className="mt-3 text-red-500 text-sm font-medium"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
