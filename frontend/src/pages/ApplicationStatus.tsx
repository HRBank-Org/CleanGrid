import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Search, FileText, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import api from '../services/api'

const statusConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  submitted: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Submitted' },
  under_review: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Under Review' },
  approved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Approved' },
  activated: { icon: CheckCircle, color: 'text-primary', bgColor: 'bg-primary-50', label: 'Activated' },
  rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Not Approved' },
}

export default function ApplicationStatus() {
  const location = useLocation()
  const [applicationId, setApplicationId] = useState(location.state?.id || '')
  const [loading, setLoading] = useState(false)
  const [application, setApplication] = useState<any>(null)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (location.state?.id) {
      fetchStatus(location.state.id)
    }
  }, [location.state?.id])
  
  const fetchStatus = async (id: string) => {
    if (!id.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await api.get(`/franchisee/application/${id}`)
      setApplication(response.data.data)
    } catch (err: any) {
      setError('Application not found')
      setApplication(null)
    } finally {
      setLoading(false)
    }
  }
  
  const status = application ? statusConfig[application.status] || statusConfig.submitted : null
  
  return (
    <div className="min-h-screen flex flex-col safe-top">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-semibold text-secondary-900">Application Status</h1>
        </div>
      </div>
      
      <div className="flex-1 px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-secondary-900 mb-2">Check Application Status</h2>
          <p className="text-gray-500 text-sm">Enter your application ID below</p>
        </div>
        
        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            placeholder="Application ID"
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={() => fetchStatus(applicationId)}
            disabled={loading}
            className="px-5 bg-primary text-white rounded-xl disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
            {error}
          </div>
        )}
        
        {application && status && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-14 h-14 ${status.bgColor} rounded-full flex items-center justify-center mb-3`}>
                <status.icon className={`w-7 h-7 ${status.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900">{application.operating_name}</h3>
              <span className={`mt-2 px-3 py-1 ${status.bgColor} ${status.color} rounded-full text-sm font-medium`}>
                {status.label}
              </span>
            </div>
            
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Submitted</span>
                <span className="text-secondary-900">
                  {new Date(application.submitted_at).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              
              {application.assigned_fsas?.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Assigned Areas</span>
                  <div className="flex gap-1">
                    {application.assigned_fsas.map((fsa: string) => (
                      <span key={fsa} className="px-2 py-0.5 bg-primary-50 text-primary rounded text-xs font-medium">
                        {fsa}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {application.status === 'approved' && (
              <button className="w-full mt-6 py-3 bg-primary text-white font-semibold rounded-xl">
                Continue Onboarding
              </button>
            )}
          </div>
        )}
        
        <div className="mt-8 text-center">
          <Link to="/apply" className="text-primary font-medium">
            Don't have an application? Apply now
          </Link>
        </div>
      </div>
    </div>
  )
}
