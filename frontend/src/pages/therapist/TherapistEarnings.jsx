import { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, Calendar,
  Users, Clock, Award
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

export default function TherapistEarnings() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [therapistProfile, setTherapistProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChart, setActiveChart] = useState('earnings')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [apptRes, profileRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/therapists/profile/me'),
      ])
      setAppointments(Array.isArray(apptRes.data) ? apptRes.data : [])
      setTherapistProfile(profileRes.data)
    } catch (error) {
      toast.error('Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  const SESSION_FEE = therapistProfile?.session_fee
    ? parseFloat(therapistProfile.session_fee)
    : 1500

  const completedSessions = appointments.filter(a => a.status === 'completed')
  const confirmedSessions = appointments.filter(a => a.status === 'confirmed')
  const pendingSessions = appointments.filter(a => a.status === 'pending')

  const totalEarnings = completedSessions.length * SESSION_FEE

  const now = new Date()
  const thisMonth = completedSessions.filter(a => {
    const d = new Date(a.scheduled_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthEarnings = thisMonth.length * SESSION_FEE

  const lastMonth = completedSessions.filter(a => {
    const d = new Date(a.scheduled_at)
    const last = new Date(now.getFullYear(), now.getMonth() - 1)
    return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear()
  })
  const lastMonthEarnings = lastMonth.length * SESSION_FEE

  const growthPercent = lastMonthEarnings > 0
    ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
    : thisMonthEarnings > 0 ? 100 : 0

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
      months.push({
        month: monthName,
        earnings: count * SESSION_FEE,
        sessions: count
      })
    }
    return months
  }

  const chartData = getMonthlyData()

  // Group by patient
  const patientMap = {}
  completedSessions.forEach(a => {
    const name = a.patient_name || `Patient #${a.user_id}`
    if (!patientMap[name]) patientMap[name] = { name, sessions: 0, earnings: 0, picture: a.patient_picture }
    patientMap[name].sessions++
    patientMap[name].earnings += SESSION_FEE
  })
  const topPatients = Object.values(patientMap).sort((a, b) => b.sessions - a.sessions).slice(0, 5)

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
              {
                label: 'Total Earnings',
                value: `₹${totalEarnings.toLocaleString()}`,
                icon: <DollarSign className="w-5 h-5" />,
                color: 'bg-green-50 text-green-600',
                sub: `${completedSessions.length} sessions`
              },
              {
                label: 'This Month',
                value: `₹${thisMonthEarnings.toLocaleString()}`,
                icon: <Calendar className="w-5 h-5" />,
                color: 'bg-blue-50 text-blue-600',
                sub: growthPercent >= 0 ? `↑ ${growthPercent}% vs last month` : `↓ ${Math.abs(growthPercent)}% vs last month`
              },
              {
                label: 'Upcoming Sessions',
                value: confirmedSessions.length,
                icon: <Clock className="w-5 h-5" />,
                color: 'bg-purple-50 text-purple-600',
                sub: `${pendingSessions.length} pending`
              },
              {
                label: 'Total Patients',
                value: Object.keys(patientMap).length,
                icon: <Users className="w-5 h-5" />,
                color: 'bg-primary-50 text-primary-600',
                sub: `₹${SESSION_FEE}/session`
              },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Last 6 Months
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setActiveChart('earnings')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeChart === 'earnings' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >Earnings</button>
                <button onClick={() => setActiveChart('sessions')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeChart === 'sessions' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >Sessions</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }}
                  tickFormatter={(v) => activeChart === 'earnings' ? `₹${v}` : v}
                />
                <Tooltip
                  formatter={(value) => [
                    activeChart === 'earnings' ? `₹${value}` : `${value} sessions`,
                    activeChart === 'earnings' ? 'Earnings' : 'Sessions'
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey={activeChart} fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Top Patients */}
            {topPatients.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />
                  Top Patients
                </h3>
                <div className="space-y-3">
                  {topPatients.map((patient, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {patient.picture ? (
                            <img src={getImageUrl(patient.picture)} alt={patient.name}
                              className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary-700 text-xs font-bold">{patient.name?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{patient.name}</p>
                          <p className="text-gray-400 text-xs">{patient.sessions} sessions</p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-600 text-sm">₹{patient.earnings.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                Session Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Completed', value: completedSessions.length, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Confirmed (Upcoming)', value: confirmedSessions.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Pending Confirmation', value: pendingSessions.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <span className="text-gray-600 text-sm">{item.label}</span>
                    <span className={`font-bold text-sm px-3 py-1 rounded-full ${item.bg} ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
                  <div key={appt.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {appt.patient_picture ? (
                          <img src={getImageUrl(appt.patient_picture)} alt={appt.patient_name}
                            className="w-full h-full object-cover" />
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
                      <p className="font-bold text-green-600 text-lg">+₹{SESSION_FEE}</p>
                      <p className="text-xs text-gray-400 mt-0.5 bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        Completed ✅
                      </p>
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