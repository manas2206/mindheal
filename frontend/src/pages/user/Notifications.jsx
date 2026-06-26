import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Calendar, CheckCircle, XCircle,
  MessageCircle, DollarSign, Clock, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

export default function Notifications() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [apptRes, payRes] = await Promise.all([
        api.get('/appointments'),
        user?.role === 'user' ? api.get('/payments/history') : Promise.resolve({ data: [] }),
      ])
      setAppointments(Array.isArray(apptRes.data) ? apptRes.data : [])
      setPayments(Array.isArray(payRes.data) ? payRes.data : payRes.data?.payments || [])
    } catch (error) {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  // Generate notifications from real data
  const generateNotifications = () => {
    const notifs = []
    const now = new Date()

    appointments.forEach(appt => {
      const scheduledAt = new Date(appt.scheduled_at)
      const fiveMinBefore = new Date(scheduledAt.getTime() - 5 * 60 * 1000)
      const thirtyMinBefore = new Date(scheduledAt.getTime() - 30 * 60 * 1000)

      // Upcoming session in 30 min
      if (appt.status === 'confirmed' && now >= thirtyMinBefore && now < scheduledAt) {
        notifs.push({
          id: `upcoming_${appt.id}`,
          type: 'upcoming',
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          bg: 'bg-yellow-50 border-yellow-200',
          title: 'Session Starting Soon!',
          message: `Your ${appt.session_type} session with ${
            user?.role === 'user' ? appt.therapist_name : appt.patient_name
          } starts in ~30 minutes`,
          time: scheduledAt,
          action: () => navigate(appt.session_type === 'chat' ? `/chat/${appt.therapist_user_id || appt.therapist_id}` : `/session/${appt.id}`),
          actionLabel: 'Join Session',
          priority: 1,
        })
      }

      // Session available now (5 min window)
      if (appt.status === 'confirmed' && now >= fiveMinBefore && now <= scheduledAt) {
        notifs.push({
          id: `join_${appt.id}`,
          type: 'join',
          icon: <Bell className="w-5 h-5 text-green-500" />,
          bg: 'bg-green-50 border-green-200',
          title: 'Session Ready to Join!',
          message: `Your session with ${
            user?.role === 'user' ? appt.therapist_name : appt.patient_name
          } is ready. Click to join now.`,
          time: scheduledAt,
          action: () => navigate(appt.session_type === 'chat' ? `/chat/${appt.therapist_user_id || appt.therapist_id}` : `/session/${appt.id}`),
          actionLabel: 'Join Now 🚀',
          priority: 0,
        })
      }

      // Confirmed appointment
      if (appt.status === 'confirmed' && scheduledAt > now) {
        notifs.push({
          id: `confirmed_${appt.id}`,
          type: 'confirmed',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          bg: 'bg-green-50 border-green-100',
          title: 'Appointment Confirmed ✅',
          message: `${
            user?.role === 'user'
              ? `Your session with ${appt.therapist_name}`
              : `Session with ${appt.patient_name}`
          } is confirmed for ${scheduledAt.toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short'
          })} at ${scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
          time: new Date(appt.updated_at),
          action: () => navigate('/appointments'),
          actionLabel: 'View',
          priority: 2,
        })
      }

      // Pending appointment (therapist needs to confirm)
      if (appt.status === 'pending' && user?.role === 'therapist') {
        notifs.push({
          id: `pending_${appt.id}`,
          type: 'pending',
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          bg: 'bg-yellow-50 border-yellow-100',
          title: 'New Appointment Request',
          message: `${appt.patient_name} has requested a ${appt.session_type} session on ${
            scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
          }`,
          time: new Date(appt.created_at),
          action: () => navigate('/therapist/dashboard'),
          actionLabel: 'Review',
          priority: 1,
        })
      }

      // Pending appointment (user waiting for confirmation)
      if (appt.status === 'pending' && user?.role === 'user') {
        notifs.push({
          id: `waiting_${appt.id}`,
          type: 'pending',
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          bg: 'bg-yellow-50 border-yellow-100',
          title: 'Awaiting Confirmation',
          message: `Your session with ${appt.therapist_name} on ${
            scheduledAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
          } is pending therapist confirmation`,
          time: new Date(appt.created_at),
          action: () => navigate('/appointments'),
          actionLabel: 'View',
          priority: 2,
        })
      }

      // Cancelled appointment
      if (appt.status === 'cancelled') {
        notifs.push({
          id: `cancelled_${appt.id}`,
          type: 'cancelled',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          bg: 'bg-red-50 border-red-100',
          title: 'Appointment Cancelled',
          message: `Your session with ${
            user?.role === 'user' ? appt.therapist_name : appt.patient_name
          } on ${scheduledAt.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
          })} has been cancelled`,
          time: new Date(appt.updated_at),
          action: user?.role === 'user' ? () => navigate('/therapists') : null,
          actionLabel: user?.role === 'user' ? 'Book Again' : null,
          priority: 3,
        })
      }

      // Completed session
      if (appt.status === 'completed' && user?.role === 'user') {
        notifs.push({
          id: `completed_${appt.id}`,
          type: 'completed',
          icon: <CheckCircle className="w-5 h-5 text-blue-500" />,
          bg: 'bg-blue-50 border-blue-100',
          title: 'Session Completed',
          message: `Your ${appt.session_type} session with ${appt.therapist_name} has been completed. Leave a review!`,
          time: new Date(appt.updated_at),
          action: () => navigate('/appointments'),
          actionLabel: 'Rate Session ⭐',
          priority: 3,
        })
      }
    })

    // Payment notifications (user only)
    if (user?.role === 'user') {
      payments.forEach(payment => {
        if (payment.status === 'success') {
          notifs.push({
            id: `payment_${payment.id}`,
            type: 'payment',
            icon: <DollarSign className="w-5 h-5 text-green-500" />,
            bg: 'bg-green-50 border-green-100',
            title: 'Payment Successful 💰',
            message: `Payment of ₹${parseFloat(payment.amount).toFixed(0)} received successfully`,
            time: new Date(payment.created_at),
            action: () => navigate('/payments'),
            actionLabel: 'View Receipt',
            priority: 3,
          })
        }
      })
    }

    return notifs.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return new Date(b.time) - new Date(a.time)
    })
  }

  const notifications = generateNotifications()

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-500 text-sm">{notifications.length} notifications</p>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="bg-primary-100 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">
                  {notifications.filter(n => n.priority <= 1).length} urgent
                </span>
              </div>
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
              <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-400 text-sm">No notifications at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm ${notif.bg} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      {notif.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                        <span className="text-gray-400 text-xs flex-shrink-0">{getTimeAgo(notif.time)}</span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                      {notif.action && notif.actionLabel && (
                        <button onClick={notif.action}
                          className="mt-3 text-xs font-medium text-primary-600 hover:text-primary-700 bg-white px-3 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                        >
                          {notif.actionLabel}
                        </button>
                      )}
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