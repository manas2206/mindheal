import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart, Calendar, Bell, Search,
  TrendingUp, Clock, ChevronRight,
  Star, Wind, Moon, Activity
} from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function UserDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [moodLogs, setMoodLogs] = useState([])
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [apptRes, moodRes, therapistRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/mood/history?limit=5'),
        api.get('/therapists/'),
      ])
      setAppointments(apptRes.data)
      setMoodLogs(moodRes.data)
      setTherapists(therapistRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getMoodEmoji = (score) => {
    if (score >= 9) return '😄'
    if (score >= 7) return '😊'
    if (score >= 5) return '😐'
    if (score >= 3) return '😔'
    return '😢'
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

  // Key function — stores session + appointment ID for timer and review
  const handleJoinSession = (appt) => {
    sessionStorage.setItem(`session_${appt.therapist_id}`, 'true')
    sessionStorage.setItem(`appt_${appt.therapist_id}`, appt.id)
    if (appt.session_type === 'chat') {
      navigate(`/chat/${appt.therapist_id}`)
    } else {
      navigate(`/session/${appt.id}`)
    }
  }

  const upcomingAppointment = appointments.find(
    a => a.status === 'confirmed' || a.status === 'pending'
  )
  const latestMood = moodLogs[0]

  const selfCareTips = [
    { icon: <Wind className="w-5 h-5" />, tip: 'Take a 5-minute walk in nature to reset your mood.' },
    { icon: <Moon className="w-5 h-5" />, tip: 'Practice deep breathing before bed for better sleep.' },
    { icon: <Activity className="w-5 h-5" />, tip: 'Stay hydrated — drink 8 glasses of water today.' },
  ]
  const randomTip = selfCareTips[new Date().getHours() % selfCareTips.length]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="user" />

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">
              Good Morning, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-xs lg:text-sm hidden sm:block">
              Take a deep breath and start your healing journey.
            </p>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg hidden sm:block">
              <Search className="w-5 h-5" />
            </button>
            <Link to="/notifications" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>
            <Link to="/profile">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-sm">{user?.full_name?.charAt(0)}</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">

          {/* Top 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            {/* Upcoming Session */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 mb-4">Upcoming Session</h3>
              {upcomingAppointment ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Therapist #{upcomingAppointment.therapist_id}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(upcomingAppointment.scheduled_at).toLocaleDateString('en-IN', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}, {new Date(upcomingAppointment.scheduled_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      <p className="text-gray-400 text-xs capitalize mt-0.5">
                        {upcomingAppointment.session_type} • {upcomingAppointment.duration_mins} mins
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleJoinSession(upcomingAppointment)}
                      className="flex-1 bg-primary-600 text-white text-xs py-2 rounded-lg font-medium hover:bg-primary-700"
                    >
                      {upcomingAppointment.session_type === 'chat' ? '💬 Chat Now' : '📹 Join Now'}
                    </button>
                    <button className="flex-1 border border-gray-200 text-gray-600 text-xs py-2 rounded-lg font-medium hover:bg-gray-50">
                      Reschedule
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No upcoming sessions</p>
                  <Link to="/therapists" className="text-primary-600 text-xs font-medium hover:underline mt-1 block">
                    Book a session →
                  </Link>
                </div>
              )}
            </div>

            {/* Mood Overview */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 mb-4">Mood Overview</h3>
              {latestMood ? (
                <div className="text-center">
                  <div className="text-5xl mb-2">{getMoodEmoji(latestMood.mood_score)}</div>
                  <p className="font-semibold text-gray-900 capitalize">{latestMood.mood_label || 'Good'}</p>
                  <p className="text-gray-500 text-xs mt-1">Score: {latestMood.mood_score}/10</p>
                  <p className="text-primary-600 text-xs mt-1">Keep going! 💚</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-4xl mb-2">😊</p>
                  <p className="text-gray-500 text-sm">Log your mood today</p>
                  <Link to="/mood-tracker" className="text-primary-600 text-xs font-medium hover:underline mt-1 block">
                    Track mood →
                  </Link>
                </div>
              )}
            </div>

            {/* Self Care Tip */}
            <div className="bg-primary-600 rounded-2xl p-5 text-white">
              <h3 className="text-sm font-semibold text-primary-200 mb-4">Self Care Tip</h3>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {randomTip.icon}
                </div>
                <p className="text-sm text-primary-100 leading-relaxed">{randomTip.tip}</p>
              </div>
            </div>
          </div>

          {/* Recommended Therapists */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Recommended For You</h3>
              <Link to="/therapists" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {therapists.slice(0, 3).map((therapist, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-bold">T{therapist.id}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Therapist #{therapist.id}</p>
                        <p className="text-gray-500 text-xs">{therapist.specializations?.[0]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{therapist.rating}</span>
                      <span className="text-gray-400 text-xs">({therapist.total_reviews})</span>
                      <span className="text-gray-300 text-xs mx-1">•</span>
                      <span className="text-xs text-gray-500">{therapist.experience_years} yrs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">
                        ₹{therapist.session_fee}
                        <span className="text-gray-400 font-normal text-xs"> / session</span>
                      </p>
                      <Link to={`/book/${therapist.id}`}
                        className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                      >Book</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Recent Appointments</h3>
              <Link to="/appointments" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments yet</p>
                <Link to="/therapists" className="btn-primary mt-4 inline-block text-sm">Find a Therapist</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 4).map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Therapist #{appt.therapist_id}</p>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(appt.scheduled_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })} • {appt.session_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                      {appt.status === 'confirmed' && (
                        <button
                          onClick={() => handleJoinSession(appt)}
                          className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700"
                        >
                          {appt.session_type === 'chat' ? 'Chat' : 'Join'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}