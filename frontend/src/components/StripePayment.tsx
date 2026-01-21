import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import api from '../services/api'
import { Loader2, CreditCard, Lock, CheckCircle2 } from 'lucide-react'

// Load Stripe outside component to avoid recreating on each render
let stripePromise: Promise<any> | null = null

const getStripe = async () => {
  if (!stripePromise) {
    const { data } = await api.get('/payments/config')
    stripePromise = loadStripe(data.publishableKey)
  }
  return stripePromise
}

interface PaymentFormProps {
  amount: number
  bookingId: string
  serviceName: string
  customerEmail: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

function PaymentForm({ amount, bookingId, serviceName, customerEmail, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create payment intent on backend
      const { data } = await api.post('/payments/create-payment-intent', {
        amount: Math.round(amount * 100), // Convert to cents
        booking_id: bookingId,
        customer_email: customerEmail,
        customer_name: customerEmail.split('@')[0],
        service_name: serviceName,
      })

      // Confirm the payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              email: customerEmail,
            },
          },
        }
      )

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
        onError(stripeError.message || 'Payment failed')
      } else if (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id)
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Payment failed'
      setError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Card Details
        </label>
        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
          <CardElement
            onChange={(e) => setCardComplete(e.complete)}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#0A2342',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
                invalid: {
                  color: '#EF4444',
                  iconColor: '#EF4444',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        Your payment info is secure and encrypted
      </div>

      <button
        type="submit"
        disabled={!stripe || loading || !cardComplete}
        className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ${amount.toFixed(2)} CAD
          </>
        )}
      </button>
    </form>
  )
}

interface StripePaymentProps {
  amount: number
  bookingId: string
  serviceName: string
  customerEmail: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

export default function StripePayment(props: StripePaymentProps) {
  const [stripeReady, setStripeReady] = useState(false)
  const [stripeInstance, setStripeInstance] = useState<any>(null)

  useEffect(() => {
    getStripe().then((stripe) => {
      setStripeInstance(stripe)
      setStripeReady(true)
    })
  }, [])

  if (!stripeReady) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <Elements stripe={stripeInstance}>
      <PaymentForm {...props} />
    </Elements>
  )
}

// Success component to show after payment
export function PaymentSuccess() {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-secondary-900 mb-2">Payment Authorized!</h3>
      <p className="text-gray-500 text-sm">
        Your payment is being held securely. You'll only be charged once your cleaning is complete.
      </p>
    </div>
  )
}
