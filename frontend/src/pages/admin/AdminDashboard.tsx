import { useState, useEffect } from 'react'
import { Users, Building2, Briefcase, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

interface DashboardStats {
  total_franchisees: number
  pending_applications: number
  active_franchisees: number
  total_jobs_today: number
  total_revenue_today: number
  alerts: Array<{
    type: string
    message: string
  }>
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // For now, use mock data since admin stats endpoint may not exist
      setStats({
        total_franchisees: 12,
        pending_applications: 3,
        active_franchisees: 9,
        total_jobs_today: 47,
        total_revenue_today: 8450.00,
        alerts: [
          { type: 'warning', message: '2 franchisees have expiring insurance' },
          { type: 'info', message: '3 new applications awaiting review' }
        ]
      })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome, {user?.name}</p>
      </div>

      {/* Alerts */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((alert, i) => (
            <div key={i} className={`p-3 rounded-lg flex items-start gap-3 ${
              alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              alert.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                alert.type === 'warning' ? 'text-yellow-600' :
                alert.type === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`} />
              <p className={`text-sm ${
                alert.type === 'warning' ? 'text-yellow-800' :
                alert.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">Total Franchisees</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{stats?.total_franchisees || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Pending Apps</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats?.pending_applications || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Briefcase className="w-4 h-4" />
            <span className="text-sm">Jobs Today</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{stats?.total_jobs_today || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Revenue Today</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${stats?.total_revenue_today?.toFixed(0) || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-secondary-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = '/admin/applications'}
            className="p-4 bg-primary-50 text-primary rounded-xl text-center font-medium hover:bg-primary-100 transition-colors"
          >
            Review Applications
          </button>
          <button
            onClick={() => window.location.href = '/admin/territories'}
            className="p-4 bg-gray-100 text-secondary-900 rounded-xl text-center font-medium hover:bg-gray-200 transition-colors"
          >
            Manage Territories
          </button>
          <button
            onClick={() => window.location.href = '/admin/franchisees'}
            className="p-4 bg-gray-100 text-secondary-900 rounded-xl text-center font-medium hover:bg-gray-200 transition-colors"
          >
            View Franchisees
          </button>
          <button
            onClick={() => window.location.href = '/admin/reports'}
            className="p-4 bg-gray-100 text-secondary-900 rounded-xl text-center font-medium hover:bg-gray-200 transition-colors"
          >
            Generate Reports
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">API Services</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Operational</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Payment Processing</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Operational</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">HR Bank Integration</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Placeholder</span>
          </div>
        </div>
      </div>
    </div>
  )
}
