import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import LanguageToggle from '../../components/LanguageToggle'

export default function FranchiseeLogin() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useAuthStore()
  const { t } = useLanguageStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await login(email, password)
    if (success) {
      navigate('/franchisee/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <LanguageToggle />
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img src="/cleangrid-logo.png" alt="CleanGrid" className="h-24 mb-4" />
        <h1 className="text-2xl font-bold text-secondary-900">Franchisee Portal</h1>
        <p className="text-gray-500">Portail Franchisé</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('login.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            placeholder="franchisee@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('login.password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {isLoading ? t('common.loading') : t('login.signIn')}
        </button>
      </form>

      {/* Apply Link */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 mb-2">Not a franchisee yet?</p>
        <Link to="/apply" className="text-primary font-semibold">
          Apply to become a franchisee →
        </Link>
      </div>
    </div>
  )
}
