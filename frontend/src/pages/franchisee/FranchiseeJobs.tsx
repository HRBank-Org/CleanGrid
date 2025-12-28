import { useState, useEffect } from 'react'
import { MapPin, Clock, DollarSign, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api'

interface Job {
  id: string
  booking_id: string
  customer_name: string
  service_name: string
  address: string
  fsa_code: string
  scheduled_date: string
  time_window: string
  status: string
  gross_amount: number
  net_to_franchisee: number
}

export default function FranchiseeJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [filter])

  const fetchJobs = async () => {
    try {
      const params = filter !== 'all' ? `?status_filter=${filter}` : ''
      const response = await api.get(`/franchisee/jobs${params}`)
      setJobs(response.data.data.jobs || [])
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (jobId: string) => {
    setActionLoading(jobId)
    try {
      await api.post(`/franchisee/jobs/${jobId}/accept`)
      fetchJobs()
    } catch (err) {
      console.error('Failed to accept job:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (jobId: string) => {
    setActionLoading(jobId)
    try {
      await api.post(`/franchisee/jobs/${jobId}/decline`)
      fetchJobs()
    } catch (err) {
      console.error('Failed to decline job:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': return 'bg-blue-100 text-blue-700'
      case 'in_progress': return 'bg-purple-100 text-purple-700'
      case 'completed': case 'qa_approved': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Jobs</h1>
        <p className="text-gray-500">Manage your cleaning jobs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
        {['all', 'assigned', 'accepted', 'in_progress', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Jobs' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {/* Job Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-secondary-900">{job.service_name}</h3>
                  <p className="text-sm text-gray-500">{job.customer_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {/* Job Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{job.address}</span>
                  <span className="font-mono text-primary">({job.fsa_code})</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(job.scheduled_date).toLocaleDateString()} • {job.time_window}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold text-green-600">${job.net_to_franchisee?.toFixed(2) || '0.00'}</span>
                  <span className="text-gray-400">(of ${job.gross_amount?.toFixed(2) || '0.00'})</span>
                </div>
              </div>

              {/* Actions for assigned jobs */}
              {job.status === 'assigned' && (
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleDecline(job.id)}
                    disabled={actionLoading === job.id}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(job.id)}
                    disabled={actionLoading === job.id}
                    className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary-dark disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                </div>
              )}

              {/* View Details for other statuses */}
              {job.status !== 'assigned' && (
                <button className="w-full py-2 text-primary font-medium flex items-center justify-center gap-1 hover:underline">
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
