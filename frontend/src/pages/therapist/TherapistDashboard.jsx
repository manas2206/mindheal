import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, CheckCircle, XCircle, Users,
  DollarSign, Activity, BarChart2, Clock,
  Bell, Video, MessageSquare, Lock, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

export default function TherapistDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [now, setNow] = useState(new Date())
  const [stats, setStats] = useState({
    total: 0, pending: 0, confirmed: 0, completed: 0, earnings: 0
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/appointments')
      const appts = Array.isArray(res.data) ? res.data : []
      setAppointments(appts)
      setStats({
        total: appts.length,
        pending: appts.filter(a => a.status === 'pending').length,
        confirmed: appts.filter(a => a.status === 'confirmed').length,
        completed: appts.filter(a => a.status === 'completed').length,
        earnings: appts.filter(a => a.status === 'completed').length * 1500,
      })
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (id) => {
    try {
      await api.put(`/appointments/${id}/confirm`)
      toast.success('Appointment confirmed!')
      fetchData()
    } catch (error) { toast.error(error.message) }
  }

  const handleCancel = async (id) => {
    try {
      await api.put(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      fetchData()
    } catch (error) { toast.error(error.message) }
  }

  const handleComplete = async (id) => {
    try {
      await api.put(`/appointments/${id}/complete`)
      toast.success('Session marked as completed!')
      fetchData()
    } catch (error) { toast.error(error.message) }
  }

  // ── Session time check ────────────────────────────────────────────────────
  const getSessionStatus = (appt) => {
    const scheduledAt = new Date(appt.scheduled_at)
    const sessionEnd = new Date(scheduledAt.getTime() + appt.duration_mins * 60 * 1000)
    const fiveMinBefore = new Date(scheduledAt.getTime() - 5 * 60 * 1000)

    if (now < fiveMinBefore) {
      const diffMs = fiveMinBefore - now
      const diffMins = Math.ceil(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const remainMins = diffMins % 60
      if (diffHours > 0) {
        return { canJoin: false, reason: `Opens in ${diffHours}h ${remainMins}m` }
      }
      return { canJoin: false, reason: `Opens in ${diffMins} min` }
    }

    if (now > sessionEnd) {
      return { canJoin: false, reason: 'Session expired', expired: true }
    }

    return { canJoin: true }
  }

  const handleJoinSession = (appt) => {
    const status = getSessionStatus(appt)
    if (!status.canJoin) {
      toast.error(status.expired ? 'Session time has passed' : `${status.reason}`)
      return
    }

    sessionStorage.setItem(`session_${appt.user_id}`, 'true')
    sessionStorage.setItem(`appt_${appt.user_id}`, appt.id)

    if (appt.session_type === 'chat') {
      navigate(`/chat/${appt.user_id}`)
    } else {
      navigate(`/session/${appt.id}`)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'upcoming') return a.status === 'confirmed' || a.status === 'pending'
    if (activeTab === 'completed') return a.status === 'completed'
    if (activeTab === 'cancelled') return a.status === 'cancelled'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="therapist" />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-500 text-sm hidden sm:block">
                Manage your appointments and clients
              </p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              {stats.pending > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
            {[
              { label: "Confirmed", value: stats.confirmed, icon: <Calendar className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Sessions', value: stats.total, icon: <Activity className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
              { label: 'Total Patients', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
              { label: 'Pending', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-600' },
              { label: 'Earnings', value: `₹${stats.earnings}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-primary-50 text-primary-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}>
                  {stat.icon}
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Appointments
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'all', label: 'All' },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'upcoming' && stats.pending > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">
                      {stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appt) => {
                  const sessionStatus = appt.status === 'confirmed' ? getSessionStatus(appt) : null

                  return (
                    <div key={appt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {appt.patient_picture ? (
                            <img src={getImageUrl(appt.patient_picture)}
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
                            {appt.patient_name || `Patient #${appt.user_id}`}
                          </p>
                          <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(appt.scheduled_at).toLocaleDateString('en-IN', {
                              weekday: 'short', day: 'numeric', month: 'short'
                            })} at {new Date(appt.scheduled_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5 capitalize">
                            {appt.session_type} • {appt.duration_mins} mins
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>

                        {/* Pending — confirm/cancel */}
                        {appt.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleConfirm(appt.id)}
                              className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                              title="Confirm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleCancel(appt.id)}
                              className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Confirmed — join session */}
                        {appt.status === 'confirmed' && sessionStatus && (
                          <>
                            {sessionStatus.canJoin ? (
                              <button onClick={() => handleJoinSession(appt)}
                                className="flex items-center gap-1 bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700 font-medium"
                              >
                                {appt.session_type === 'chat'
                                  ? <MessageSquare className="w-3.5 h-3.5" />
                                  : <Video className="w-3.5 h-3.5" />
                                }
                                Join
                              </button>
                            ) : sessionStatus.expired ? (
                              <div className="flex items-center gap-1 bg-gray-50 text-gray-400 text-xs px-3 py-1.5 rounded-lg border border-gray-200">
                                <Lock className="w-3 h-3" />
                                Expired
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-3 py-1.5 rounded-lg border border-yellow-200">
                                <Clock className="w-3 h-3" />
                                {sessionStatus.reason}
                              </div>
                            )}
                            <button onClick={() => handleComplete(appt.id)}
                              className="bg-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-200"
                            >
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}