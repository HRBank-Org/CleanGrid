import { useState, useEffect } from 'react'
import { User, MapPin, Calendar, ChevronRight, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import api from '../../services/api'

interface Application {
  id: string
  operating_name: string
  legal_name: string
  legal_type?: string
  contact_name: string
  email: string
  phone: string
  city: string
  province: string
  preferred_fsas: string[]
  vehicle_access: boolean
  status: string
  submitted_at: string
}

export default function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('submitted')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [filter])

  const fetchApplications = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/admin/applications?status=${filter}`)
      setApplications(response.data.data.applications || [])
    } catch (err: any) {
      console.error('Failed to fetch applications:', err)
      setError(err.response?.data?.detail || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    setError(null)
    try {
      await api.patch(`/admin/applications/${id}/approve`, {})
      alert('Application approved successfully!')
      fetchApplications()
      setSelectedApp(null)
    } catch (err: any) {
      console.error('Failed to approve:', err)
      setError(err.response?.data?.detail || 'Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason:')
    if (!reason) return
    
    setActionLoading(true)
    setError(null)
    try {
      await api.patch(`/admin/applications/${id}/reject`, { reason })
      alert('Application rejected')
      fetchApplications()
      setSelectedApp(null)
    } catch (err: any) {
      console.error('Failed to reject:', err)
      setError(err.response?.data?.detail || 'Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-700'
      case 'under_review': return 'bg-blue-100 text-blue-700'
      case 'approved': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Applications</h1>
        <p className="text-gray-500">Review franchisee applications</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
        {['submitted', 'under_review', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No applications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-secondary-900">{app.operatingName}</h3>
                  <p className="text-sm text-gray-500">{app.contactName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                  {app.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{app.city}, {app.province}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Applied {new Date(app.applicationSubmittedAt).toLocaleDateString()}</span>
                </div>
                {app.preferredFSAs && app.preferredFSAs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {app.preferredFSAs.slice(0, 5).map((fsa) => (
                      <span key={fsa} className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded font-mono">
                        {fsa}
                      </span>
                    ))}
                    {app.preferredFSAs.length > 5 && (
                      <span className="text-xs text-gray-500">+{app.preferredFSAs.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {app.status === 'submitted' || app.status === 'under_review' ? (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    Review
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedApp(app)}
                  className="w-full py-2 text-primary font-medium flex items-center justify-center gap-1 hover:underline"
                >
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setSelectedApp(null)}>
          <div 
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary-900">Application Review</h2>
                <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Operating Name</label>
                  <p className="font-semibold">{selectedApp.operatingName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Legal Name</label>
                  <p>{selectedApp.legalName} ({selectedApp.legalType})</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Contact</label>
                  <p>{selectedApp.contactName}</p>
                  <p className="text-sm text-gray-600">{selectedApp.email}</p>
                  <p className="text-sm text-gray-600">{selectedApp.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Location</label>
                  <p>{selectedApp.city}, {selectedApp.province}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Preferred FSAs</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedApp.preferredFSAs?.map((fsa) => (
                      <span key={fsa} className="text-xs bg-primary-50 text-primary px-2 py-1 rounded font-mono">
                        {fsa}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {(selectedApp.status === 'submitted' || selectedApp.status === 'under_review') && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReject(selectedApp._id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-4 border border-red-300 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApp._id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
