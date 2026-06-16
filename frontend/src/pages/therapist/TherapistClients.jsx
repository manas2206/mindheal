import { useEffect, useState } from 'react'
import { MessageCircle, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function TherapistClients() {
  const { user } = useAuthStore()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  // Get unique clients
  const uniqueClients = appointments.reduce((acc, appt) => {
    if (!acc.find(a => a.user_id === appt.user_id)) {
      acc.push({
        user_id: appt.user_id,
        sessions: appointments.filter(a => a.user_id === appt.user_id).length,
        lastSession: appointments.filter(a => a.user_id === appt.user_id).sort((a, b) =>
          new Date(b.scheduled_at) - new Date(a.scheduled_at))[0]?.scheduled_at,
        status: appt.status,
      })
    }
    return acc
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="therapist" />
      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Clients</h1>
            <p className="text-gray-500 text-sm">All patients you have worked with</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Clients', value: uniqueClients.length, color: 'text-primary-600' },
              { label: 'Active', value: uniqueClients.filter(c => c.status === 'confirmed').length, color: 'text-green-600' },
              { label: 'Total Sessions', value: appointments.length, color: 'text-blue-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : uniqueClients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <p className="text-4xl mb-4">👥</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-500">Your clients will appear here after sessions are booked</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueClients.map((client, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-bold text-xl">P{client.user_id}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Patient #{client.user_id}</h3>
                      <p className="text-gray-500 text-sm">{client.sessions} session{client.sessions !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      Last: {client.lastSession ? new Date(client.lastSession).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : 'N/A'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/chat/${client.user_id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary-50 text-primary-600 text-sm py-2 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Link>
                    <Link to="/therapist/sessions"
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      <Calendar className="w-4 h-4" />
                      Sessions
                    </Link>
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