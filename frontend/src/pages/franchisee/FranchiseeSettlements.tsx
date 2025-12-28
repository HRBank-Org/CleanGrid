import { useState, useEffect } from 'react'
import { DollarSign, Calendar, FileText, ChevronRight, TrendingUp } from 'lucide-react'
import api from '../../services/api'

interface Settlement {
  id: string
  period_start: string
  period_end: string
  job_count: number
  gross_revenue: number
  platform_fees: number
  adjustments_total: number
  net_payout: number
  payout_status: string
  paid_at: string | null
}

export default function FranchiseeSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettlements()
  }, [])

  const fetchSettlements = async () => {
    try {
      const response = await api.get('/franchisee/settlements')
      setSettlements(response.data.data.settlements || [])
    } catch (err) {
      console.error('Failed to fetch settlements:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  // Calculate totals
  const totals = settlements.reduce((acc, s) => ({
    gross: acc.gross + s.gross_revenue,
    net: acc.net + s.net_payout,
    jobs: acc.jobs + s.job_count
  }), { gross: 0, net: 0, jobs: 0 })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settlements</h1>
        <p className="text-gray-500">Your payout history</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <span className="font-medium">All Time Earnings</span>
        </div>
        <p className="text-4xl font-bold mb-4">${totals.net.toFixed(2)}</p>
        <div className="flex justify-between text-sm opacity-80">
          <span>{totals.jobs} jobs completed</span>
          <span>${totals.gross.toFixed(2)} gross</span>
        </div>
      </div>

      {/* Settlements List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">No settlements yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete jobs to receive payouts</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold text-secondary-900">Recent Statements</h3>
          {settlements.map((settlement) => (
            <div key={settlement.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {/* Period Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-secondary-900">
                    {formatDate(settlement.period_start)} - {formatDate(settlement.period_end)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(settlement.payout_status)}`}>
                  {settlement.payout_status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Jobs Completed</span>
                  <span className="font-medium">{settlement.job_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gross Revenue</span>
                  <span className="font-medium">${settlement.gross_revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Fees</span>
                  <span className="text-red-600">-${settlement.platform_fees.toFixed(2)}</span>
                </div>
                {settlement.adjustments_total !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adjustments</span>
                    <span className={settlement.adjustments_total >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {settlement.adjustments_total >= 0 ? '+' : ''}${settlement.adjustments_total.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-secondary-900">Net Payout</span>
                  <span className="font-bold text-green-600">${settlement.net_payout.toFixed(2)}</span>
                </div>
              </div>

              {settlement.paid_at && (
                <p className="text-xs text-gray-400 mt-3">
                  Paid on {new Date(settlement.paid_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
