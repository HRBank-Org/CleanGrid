import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle, Clock, Star, MapPin, AlertTriangle, FileCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

interface DashboardData {
  franchisee: {
    id: string
    operating_name: string
    status: string
  }
  kpis: {
    score: number
    acceptance_rate: number
    completion_rate: number
    avg_rating: number
  }
  territories: Array<{
    fsa_code: string
    city: string
    protection_status: string
  }>
  stats: {
    jobs_this_week: number
    pending_jobs: number
    completed_jobs: number
  }
  compliance: {
    cgl_insurance: string
    auto_insurance: string
    wsib: string
  }
  hrbank_configured: boolean
}

export default function FranchiseeDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/franchisee/dashboard')
      setData(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Welcome to CleanGrid</h1>
          <p className="text-gray-500">Franchisee Portal</p>
        </div>

        {/* Onboarding Card */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Complete Your Setup</h2>
          <p className="opacity-90 text-sm">Your franchisee profile is being configured. Here's what's next:</p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900">Application Submitted</h3>
                <p className="text-sm text-gray-500">Your application has been received</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900">Under Review</h3>
                <p className="text-sm text-gray-500">Admin team is reviewing your application</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 opacity-50">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900">Profile Activation</h3>
                <p className="text-sm text-gray-500">Complete compliance docs & start accepting jobs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-primary-50 rounded-xl p-4 text-center">
          <p className="text-sm text-primary">Questions? Contact <span className="font-semibold">support@cleangrid.com</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">
          {data?.franchisee.operating_name || 'Dashboard'}
        </h1>
        <p className="text-gray-500">Welcome back, {user?.name}</p>
      </div>

      {/* Status Banner */}
      {data?.franchisee.status !== 'activated' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Account Pending Activation</p>
            <p className="text-sm text-yellow-600">Complete compliance requirements to start accepting jobs.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">KPI Score</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{data?.kpis.score || 100}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Acceptance</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{data?.kpis.acceptance_rate || 100}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Completion</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{data?.kpis.completion_rate || 100}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Star className="w-4 h-4" />
            <span className="text-sm">Rating</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{data?.kpis.avg_rating || 5.0}</p>
        </div>
      </div>

      {/* Job Stats */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-secondary-900 mb-4">This Week</h3>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-3xl font-bold text-primary">{data?.stats.pending_jobs || 0}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-bold text-secondary-900">{data?.stats.jobs_this_week || 0}</p>
            <p className="text-sm text-gray-500">Total Jobs</p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-bold text-green-600">{data?.stats.completed_jobs || 0}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Territories */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          My Territories
        </h3>
        {data?.territories && data.territories.length > 0 ? (
          <div className="space-y-2">
            {data.territories.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-mono font-semibold text-primary">{t.fsa_code}</span>
                  <span className="text-gray-500 ml-2">{t.city}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  t.protection_status === 'protected' ? 'bg-green-100 text-green-700' :
                  t.protection_status === 'probation' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {t.protection_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No territories assigned yet</p>
        )}
      </div>

      {/* Compliance */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          Compliance Status
        </h3>
        <div className="space-y-3">
          {[
            { key: 'cgl_insurance', label: 'CGL Insurance' },
            { key: 'auto_insurance', label: 'Auto Insurance' },
            { key: 'wsib', label: 'WSIB Coverage' }
          ].map(({ key, label }) => {
            const status = data?.compliance[key as keyof typeof data.compliance] || 'missing'
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-700">{label}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  status === 'verified' ? 'bg-green-100 text-green-700' :
                  status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  status === 'expired' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
