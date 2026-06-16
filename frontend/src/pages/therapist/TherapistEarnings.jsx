import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Calendar, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function TherapistEarnings() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  const completedSessions = appointments.filter(a => a.status === 'completed')
  const SESSION_FEE = 1500

  const totalEarnings = completedSessions.length * SESSION_FEE
  const thisMonth = completedSessions.filter(a => {
    const d = new Date(a.scheduled_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthEarnings = thisMonth.length * SESSION_FEE

  const getMonthlyData = () => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString('en-IN', { month: 'short' })
      const count = completedSessions.filter(a => {
        const d = new Date(a.scheduled_at)
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
      }).length
      months.push({ month: monthName, earnings: count * SESSION_FEE, sessions: count })
    }
    return months
  }

  const chartData = getMonthlyData()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="therapist" />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-500 text-sm">Track your income and session history</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, emoji: '💰', color: 'text-green-600' },
              { label: 'This Month', value: `₹${thisMonthEarnings.toLocaleString()}`, emoji: '📅', color: 'text-blue-600' },
              { label: 'Total Sessions', value: completedSessions.length, emoji: '✅', color: 'text-purple-600' },
              { label: 'This Month', value: thisMonth.length, emoji: '🗓️', color: 'text-primary-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="text-2xl mb-2">{stat.emoji}</div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm mb-6">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Monthly Earnings — Last 6 Months
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(value, name) => [`₹${value}`, 'Earnings']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="earnings" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Session History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Completed Sessions</h3>
              <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                {completedSessions.length} total
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : completedSessions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No completed sessions yet</p>
                <p className="text-gray-400 text-sm mt-1">Complete sessions to start earning</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {completedSessions.map((appt) => (
                  <div key={appt.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                        {appt.patient_picture ? (
                          <img src={`http://localhost:8000${appt.patient_picture}`}
                            alt={appt.patient_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-primary-700 font-semibold text-sm">
                            {appt.patient_name?.charAt(0) || 'P'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Session with {appt.patient_name || `Patient #${appt.user_id}`}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(appt.scheduled_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })} • {appt.session_type} • {appt.duration_mins} mins
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+₹{SESSION_FEE}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Completed</p>
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