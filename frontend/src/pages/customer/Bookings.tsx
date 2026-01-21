import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Calendar, MapPin, Clock, Loader2, AlertCircle, X, DollarSign, Info } from 'lucide-react'
import { format } from 'date-fns'

interface Booking {
  _id: string
  serviceName: string
  address: string
  scheduledDate: string
  status: string
  totalPrice: number
  escrowStatus?: string
}

interface CancellationPolicy {
  canCancel: boolean
  reason?: string
  hoursUntilAppointment?: number
  totalPrice?: number
  refundPercentage?: number
  refundAmount?: number
  cancellationFee?: number
  message?: string
  policy?: {
    fullRefund: string
    partialRefund: string
    noRefund: string
  }
}

interface CancellationResult {
  message: string
  cancellation: {
    refundPercentage: number
    refundAmount: number
    cancellationFee: number
    escrowStatus: string
  }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const escrowStatusLabels: Record<string, { label: string; color: string }> = {
  'held': { label: 'Payment Authorized', color: 'text-blue-600' },
  'released-to-franchisee': { label: 'Payment Released', color: 'text-green-600' },
  'refunded-to-customer': { label: 'Fully Refunded', color: 'text-green-600' },
  'partial-refund': { label: 'Partially Refunded', color: 'text-yellow-600' },
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null)
  const [loadingPolicy, setLoadingPolicy] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancellationResult, setCancellationResult] = useState<CancellationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
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
  
  const openCancelModal = async (booking: Booking) => {
    setSelectedBooking(booking)
    setShowCancelModal(true)
    setCancellationPolicy(null)
    setCancellationResult(null)
    setError(null)
    setLoadingPolicy(true)
    
    try {
      // Fetch cancellation policy for this booking
      const response = await api.get(`/bookings/${booking._id}/cancellation-policy`)
      setCancellationPolicy(response.data)
    } catch (err: any) {
      setError('Could not load cancellation policy')
      // Default policy if endpoint fails
      setCancellationPolicy({
        canCancel: true,
        refundPercentage: 0,
        message: 'Cancellation policy unavailable',
        totalPrice: booking.totalPrice
      })
    } finally {
      setLoadingPolicy(false)
    }
  }
  
  const handleCancel = async () => {
    if (!selectedBooking) return
    
    setCancelling(true)
    setError(null)
    
    try {
      const response = await api.delete(`/bookings/${selectedBooking._id}`)
      setCancellationResult(response.data)
      
      // Refresh bookings after successful cancellation
      await loadBookings()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }
  
  const closeModal = () => {
    setShowCancelModal(false)
    setSelectedBooking(null)
    setCancellationPolicy(null)
    setCancellationResult(null)
    setError(null)
  }
  
  const CancellationModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-secondary-900">
            {cancellationResult ? 'Booking Cancelled' : 'Cancel Booking'}
          </h3>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {loadingPolicy && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          
          {/* Show Cancellation Policy */}
          {cancellationPolicy && !cancellationResult && (
            <div className="space-y-4">
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-secondary-900">{selectedBooking?.serviceName}</p>
                <p className="text-sm text-gray-500">{selectedBooking?.address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedBooking && format(new Date(selectedBooking.scheduledDate), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
              
              {!cancellationPolicy.canCancel ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Cannot Cancel</p>
                      <p className="text-sm text-red-700 mt-1">{cancellationPolicy.reason}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Refund Preview */}
                  <div className={`rounded-xl p-4 border ${
                    cancellationPolicy.refundPercentage === 100 
                      ? 'bg-green-50 border-green-200' 
                      : cancellationPolicy.refundPercentage === 50 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <DollarSign className={`w-5 h-5 mt-0.5 ${
                        cancellationPolicy.refundPercentage === 100 
                          ? 'text-green-600' 
                          : cancellationPolicy.refundPercentage === 50 
                            ? 'text-yellow-600'
                            : 'text-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          cancellationPolicy.refundPercentage === 100 
                            ? 'text-green-900' 
                            : cancellationPolicy.refundPercentage === 50 
                              ? 'text-yellow-900'
                              : 'text-red-900'
                        }`}>
                          {cancellationPolicy.refundPercentage === 100 
                            ? 'Full Refund' 
                            : cancellationPolicy.refundPercentage === 50 
                              ? '50% Refund'
                              : 'No Refund'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          cancellationPolicy.refundPercentage === 100 
                            ? 'text-green-700' 
                            : cancellationPolicy.refundPercentage === 50 
                              ? 'text-yellow-700'
                              : 'text-red-700'
                        }`}>
                          {cancellationPolicy.message}
                        </p>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Booking Total</span>
                            <span className="font-medium">${cancellationPolicy.totalPrice?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Refund Amount</span>
                            <span className="font-medium text-green-600">${cancellationPolicy.refundAmount?.toFixed(2)}</span>
                          </div>
                          {cancellationPolicy.cancellationFee! > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Cancellation Fee</span>
                              <span className="font-medium text-red-600">${cancellationPolicy.cancellationFee?.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Policy Info */}
                  {cancellationPolicy.policy && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">Cancellation Policy</p>
                      </div>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• {cancellationPolicy.policy.fullRefund}</li>
                        <li>• {cancellationPolicy.policy.partialRefund}</li>
                        <li>• {cancellationPolicy.policy.noRefund}</li>
                      </ul>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeModal}
                      className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
                    >
                      Keep Booking
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Cancellation Success */}
          {cancellationResult && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-secondary-900">Booking Cancelled</h4>
                <p className="text-gray-500 mt-1">Your booking has been successfully cancelled.</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Refund Amount</span>
                  <span className="font-semibold text-green-600">
                    ${cancellationResult.cancellation.refundAmount.toFixed(2)}
                  </span>
                </div>
                {cancellationResult.cancellation.cancellationFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cancellation Fee</span>
                    <span className="font-semibold text-red-600">
                      ${cancellationResult.cancellation.cancellationFee.toFixed(2)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Refunds typically take 5-10 business days to process.
                </p>
              </div>
              
              <button
                onClick={closeModal}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="px-5 py-6 safe-top pb-24">
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
                  <h3 className="font-semibold text-secondary-900">{booking.serviceName || 'Cleaning Service'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                      {booking.status}
                    </span>
                    {booking.escrowStatus && escrowStatusLabels[booking.escrowStatus] && (
                      <span className={`text-xs ${escrowStatusLabels[booking.escrowStatus].color}`}>
                        • {escrowStatusLabels[booking.escrowStatus].label}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-primary">${booking.totalPrice?.toFixed(2)}</span>
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
              
              {(booking.status === 'pending' || booking.status === 'assigned' || booking.status === 'confirmed') && (
                <button
                  onClick={() => openCancelModal(booking)}
                  className="mt-3 text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showCancelModal && <CancellationModal />}
    </div>
  )
}
