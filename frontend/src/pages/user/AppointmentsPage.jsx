import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, Video, MessageSquare,
  Phone, CheckCircle, XCircle, AlertCircle,
  Star, X, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Sidebar from '../../components/common/Sidebar'

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [reviewModal, setReviewModal] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchAppointments()
    // Update current time every 30 seconds
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments')
      setAppointments(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel?')) return
    try {
      await api.put(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      fetchAppointments()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // ── Session time check ────────────────────────────────────────────────────
  const getSessionStatus = (appt) => {
    const scheduledAt = new Date(appt.scheduled_at)
    const sessionEnd = new Date(scheduledAt.getTime() + appt.duration_mins * 60 * 1000)
    const fiveMinBefore = new Date(scheduledAt.getTime() - 5 * 60 * 1000)

    if (now < fiveMinBefore) {
      // Too early
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
      // Session time has passed
      return { canJoin: false, reason: 'Session expired', expired: true }
    }

    // Within valid window (5 min before to end of session)
    return { canJoin: true }
  }

  const handleJoinSession = (appt) => {
    const status = getSessionStatus(appt)
    if (!status.canJoin) {
      if (status.expired) {
        toast.error('Session time has passed. Please book a new session.')
      } else {
        toast.error(`Session not yet available. ${status.reason}`)
      }
      return
    }

    // Store session info for timer
    const therapistUserId = appt.therapist_user_id || appt.therapist_id
    sessionStorage.setItem(`session_${therapistUserId}`, 'true')
    sessionStorage.setItem(`appt_${therapistUserId}`, appt.id)
    if (appt.session_type === 'chat') {
      navigate(`/chat/${therapistUserId}`)
    } else {
      navigate(`/session/${appt.id}`)
    }
  }

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      toast.error('Please write a comment')
      return
    }
    setSubmittingReview(true)
    try {
      await api.post(`/appointments/${reviewModal.id}/review`, { rating, comment })
      toast.success('Review submitted! 🎉')
      setReviewModal(null)
      setRating(5)
      setComment('')
      fetchAppointments()
    } catch (error) {
      toast.error(error.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
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

  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'upcoming') return a.status === 'confirmed' || a.status === 'pending'
    if (activeTab === 'completed') return a.status === 'completed'
    if (activeTab === 'cancelled') return a.status === 'cancelled'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="user" />

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Rate Your Session</h3>
              <button onClick={() => { setReviewModal(null); setRating(5); setComment('') }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary-700 font-bold text-xl">
                  {reviewModal.therapist_name?.charAt(0) || 'T'}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{reviewModal.therapist_name}</p>
              <p className="text-gray-500 text-sm capitalize">{reviewModal.session_type} Session</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                How was your experience?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 transition-colors ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {rating === 5 ? '⭐ Excellent' : rating === 4 ? '😊 Good' : rating === 3 ? '😐 Average' : rating === 2 ? '😔 Poor' : '😢 Very Poor'}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your feedback</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setReviewModal(null); setRating(5); setComment('') }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm"
              >Cancel</button>
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {submittingReview
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Star className="w-4 h-4" />
                }
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-gray-500 text-sm">Manage your therapy appointments</p>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
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
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No appointments found</p>
              <p className="text-gray-400 text-sm mt-1">Book a session with a therapist to get started</p>
              <button onClick={() => navigate('/therapists')}
                className="btn-primary mt-4 text-sm px-6 py-2"
              >Find a Therapist</button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => {
                const sessionStatus = appt.status === 'confirmed' ? getSessionStatus(appt) : null

                return (
                  <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 font-bold text-lg">
                            {appt.therapist_name?.charAt(0) || 'T'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{appt.therapist_name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-gray-500 text-sm">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(appt.scheduled_at).toLocaleDateString('en-IN', {
                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                              })} at {new Date(appt.scheduled_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              {getSessionIcon(appt.session_type)}
                              <span className="capitalize">{appt.session_type}</span>
                              • {appt.duration_mins} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>

                        {/* Upcoming confirmed sessions */}
                        {appt.status === 'confirmed' && sessionStatus && (
                          <>
                            {sessionStatus.canJoin ? (
                              <button onClick={() => handleJoinSession(appt)}
                                className="flex items-center gap-1.5 bg-primary-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-primary-700 font-medium"
                              >
                                {getSessionIcon(appt.session_type)}
                                Join Session
                              </button>
                            ) : sessionStatus.expired ? (
                              <div className="flex items-center gap-1.5 bg-gray-50 text-gray-400 text-xs px-3 py-2 rounded-xl border border-gray-200">
                                <Lock className="w-3.5 h-3.5" />
                                Session expired
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 text-xs px-3 py-2 rounded-xl border border-yellow-200">
                                <Clock className="w-3.5 h-3.5" />
                                {sessionStatus.reason}
                              </div>
                            )}
                            <button onClick={() => handleCancel(appt.id)}
                              className="flex items-center gap-1 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl hover:bg-red-100"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        )}

                        {/* Pending sessions */}
                        {appt.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 text-xs px-3 py-2 rounded-xl border border-yellow-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Awaiting confirmation
                            </div>
                            <button onClick={() => handleCancel(appt.id)}
                              className="flex items-center gap-1 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl hover:bg-red-100"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Completed sessions */}
                        {appt.status === 'completed' && (
                          <button onClick={() => setReviewModal(appt)}
                            className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 text-sm px-4 py-2 rounded-xl hover:bg-yellow-100 border border-yellow-200 font-medium"
                          >
                            <Star className="w-4 h-4" />
                            Rate Session
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Session availability info */}
                    {appt.status === 'confirmed' && sessionStatus && !sessionStatus.canJoin && !sessionStatus.expired && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Session will be available 5 minutes before scheduled time
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}