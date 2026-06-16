import { useEffect, useState } from 'react'
import { CheckCircle, Clock, MessageCircle, AlertCircle, Info, DollarSign, Star } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'

export default function Notifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { generateNotifications() }, [])

  const generateNotifications = async () => {
    try {
      const notifs = []

      if (user?.role === 'user') {
        const [apptRes, moodRes] = await Promise.all([
          api.get('/appointments/'),
          api.get('/mood/history?limit=1'),
        ])

        const appts = Array.isArray(apptRes.data) ? apptRes.data : []

        // Appointment notifications
        appts.forEach((appt, i) => {
          if (appt.status === 'confirmed') {
            notifs.push({
              id: `appt_confirmed_${appt.id}`,
              title: 'Appointment Confirmed',
              message: `Your ${appt.session_type} session with Therapist #${appt.therapist_id} is confirmed for ${new Date(appt.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
              time: getTimeAgo(appt.updated_at || appt.scheduled_at),
              read: i > 1,
              type: 'appointment',
              icon: <CheckCircle className="w-5 h-5 text-green-500" />,
              color: 'bg-green-50',
            })
          }
          if (appt.status === 'pending') {
            notifs.push({
              id: `appt_pending_${appt.id}`,
              title: 'Appointment Pending',
              message: `Your booking with Therapist #${appt.therapist_id} is pending confirmation. Session: ${new Date(appt.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
              time: getTimeAgo(appt.scheduled_at),
              read: i > 0,
              type: 'appointment',
              icon: <Clock className="w-5 h-5 text-yellow-500" />,
              color: 'bg-yellow-50',
            })
          }
          if (appt.status === 'completed') {
            notifs.push({
              id: `appt_completed_${appt.id}`,
              title: 'Session Completed',
              message: `Your ${appt.session_type} session with Therapist #${appt.therapist_id} has been completed. Don't forget to leave a review!`,
              time: getTimeAgo(appt.scheduled_at),
              read: true,
              type: 'completed',
              icon: <Star className="w-5 h-5 text-purple-500" />,
              color: 'bg-purple-50',
            })
          }
          if (appt.status === 'cancelled') {
            notifs.push({
              id: `appt_cancelled_${appt.id}`,
              title: 'Session Cancelled',
              message: `Your session with Therapist #${appt.therapist_id} on ${new Date(appt.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} was cancelled.`,
              time: getTimeAgo(appt.scheduled_at),
              read: true,
              type: 'cancelled',
              icon: <AlertCircle className="w-5 h-5 text-red-500" />,
              color: 'bg-red-50',
            })
          }
        })

        // Mood reminder
        const lastMood = moodRes.data?.[0]
        const lastMoodDate = lastMood ? new Date(lastMood.logged_at) : null
        const today = new Date()
        if (!lastMoodDate || (today - lastMoodDate) > 86400000) {
          notifs.unshift({
            id: 'mood_reminder',
            title: 'Daily Mood Check-in',
            message: "You haven't logged your mood today. Track how you're feeling!",
            time: 'Just now',
            read: false,
            type: 'reminder',
            icon: <Info className="w-5 h-5 text-blue-500" />,
            color: 'bg-blue-50',
          })
        }

      } else if (user?.role === 'therapist') {
        const apptRes = await api.get('/appointments/')
        const appts = Array.isArray(apptRes.data) ? apptRes.data : []

        appts.forEach((appt, i) => {
          if (appt.status === 'pending') {
            notifs.push({
              id: `new_booking_${appt.id}`,
              title: 'New Session Booking',
              message: `Patient #${appt.user_id} has booked a ${appt.session_type} session for ${new Date(appt.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Please confirm.`,
              time: getTimeAgo(appt.scheduled_at),
              read: i > 0,
              type: 'booking',
              icon: <Clock className="w-5 h-5 text-yellow-500" />,
              color: 'bg-yellow-50',
            })
          }
          if (appt.status === 'completed') {
            notifs.push({
              id: `completed_${appt.id}`,
              title: 'Session Completed',
              message: `Session with Patient #${appt.user_id} on ${new Date(appt.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} has been completed.`,
              time: getTimeAgo(appt.scheduled_at),
              read: true,
              type: 'completed',
              icon: <CheckCircle className="w-5 h-5 text-green-500" />,
              color: 'bg-green-50',
            })
          }
        })
      }

      // Welcome notification always
      notifs.push({
        id: 'welcome',
        title: 'Welcome to MindHeal! 🎉',
        message: 'Thank you for joining MindHeal. Start your mental wellness journey today.',
        time: '5 days ago',
        read: true,
        type: 'info',
        icon: <Info className="w-5 h-5 text-primary-500" />,
        color: 'bg-primary-50',
      })

      setNotifications(notifs.slice(0, 10))
    } catch (error) {
      // Fallback static notifications
      setNotifications([
        { id: 1, title: 'Welcome to MindHeal!', message: 'Thank you for joining MindHeal.', time: '5 days ago', read: true, icon: <Info className="w-5 h-5 text-primary-500" />, color: 'bg-primary-50' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>
                )}
              </h1>
              <p className="text-gray-500 text-sm hidden sm:block">Stay updated with your activity</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-primary-600 text-sm font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    !notif.read
                      ? `border-primary-200 ${notif.color || 'bg-primary-50'}`
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
                      {notif.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <span className="text-gray-400 text-xs flex-shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2.5 h-2.5 bg-primary-600 rounded-full flex-shrink-0 mt-1"></div>
                    )}
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