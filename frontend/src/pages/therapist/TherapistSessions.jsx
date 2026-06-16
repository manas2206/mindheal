import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Video, MessageSquare, Phone, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function TherapistSessions() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')

  useEffect(() => { fetchAppointments() }, [])

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (id) => {
    try {
      await api.put(`/appointments/${id}/confirm`)
      toast.success('Session confirmed!')
      fetchAppointments()
    } catch (error) { toast.error(error.message) }
  }

  const handleCancel = async (id) => {
    try {
      await api.put(`/appointments/${id}/cancel`)
      toast.success('Session cancelled')
      fetchAppointments()
    } catch (error) { toast.error(error.message) }
  }

  const handleComplete = async (id) => {
    try {
      await api.put(`/appointments/${id}/complete`)
      toast.success('Session completed!')
      fetchAppointments()
    } catch (error) { toast.error(error.message) }
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

  const getSessionIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'chat': return <MessageSquare className="w-4 h-4" />
      case 'audio': return <Phone className="w-4 h-4" />
      default: return <Video className="w-4 h-4" />
    }
  }

  const filtered = appointments.filter(a => {
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
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-gray-500 text-sm">Manage all your therapy sessions</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: appointments.length, color: 'text-blue-600' },
              { label: 'Upcoming', value: appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length, color: 'text-green-600' },
              { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: 'text-purple-600' },
              { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: 'text-red-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
              { key: 'all', label: 'All' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions found</h3>
              <p className="text-gray-500">No {activeTab} sessions at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((appt) => (
                <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold">P{appt.user_id}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Patient #{appt.user_id}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-gray-500 text-sm">
                            <Clock className="w-3 h-3" />
                            {new Date(appt.scheduled_at).toLocaleDateString('en-IN', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500 text-sm">
                            {new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1 capitalize">
                          {getSessionIcon(appt.session_type)}
                          {appt.session_type} • {appt.duration_mins} mins
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                      <div className="flex gap-2">
                        {appt.status === 'pending' && (
                          <>
                            <button onClick={() => handleConfirm(appt.id)}
                              className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700">
                              <CheckCircle className="w-3 h-3" />Confirm
                            </button>
                            <button onClick={() => handleCancel(appt.id)}
                              className="flex items-center gap-1 bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100">
                              <XCircle className="w-3 h-3" />Cancel
                            </button>
                          </>
                        )}
                        {appt.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => {
                                if (appt.session_type === 'chat') navigate(`/chat/${appt.user_id}`)
                                else navigate(`/session/${appt.id}`)
                              }}
                              className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700"
                            >
                              {appt.session_type === 'chat' ? 'Chat' : 'Join'}
                            </button>
                            <button onClick={() => handleComplete(appt.id)}
                              className="bg-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-200">
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}