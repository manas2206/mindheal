import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function PaymentHistory() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, successful: 0, refunded: 0 })

  useEffect(() => { fetchPayments() }, [])

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments/history')
      const data = Array.isArray(res.data) ? res.data : res.data?.payments || []
      setPayments(data)
      setStats({
        total: data.reduce((sum, p) => p.status === 'success' ? sum + parseFloat(p.amount) : sum, 0),
        successful: data.filter(p => p.status === 'success').length,
        refunded: data.filter(p => p.status === 'refunded').length,
      })
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />
      case 'refunded': return <RefreshCw className="w-5 h-5 text-blue-500" />
      default: return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'refunded': return 'bg-blue-100 text-blue-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4 pl-12 lg:pl-0">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
              <p className="text-gray-500 text-sm">All your transactions</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Spent', value: `₹${stats.total.toFixed(0)}`, color: 'text-primary-600', bg: 'bg-primary-50' },
              { label: 'Successful', value: stats.successful, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Refunded', value: stats.refunded, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-2xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Payments List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">All Transactions</h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payment history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getStatusIcon(payment.status)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Session with Therapist #{payment.appointment_id || 'N/A'}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {new Date(payment.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {payment.razorpay_payment_id && (
                          <p className="text-gray-300 text-xs mt-0.5">
                            ID: {payment.razorpay_payment_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{parseFloat(payment.amount).toFixed(0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}