import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import api from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)

    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="p-4">
          <button 
            onClick={() => navigate('/login')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Check Your Email</h1>
            <p className="text-gray-500 mb-8">
              We've sent a password reset link to<br />
              <span className="font-medium text-secondary-900">{email}</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
              className="text-primary font-medium"
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-500">Enter your email and we'll send you a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-primary font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
