import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, Video, MessageSquare,
  Phone, CheckCircle, XCircle, AlertCircle,
  Star, X
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

  useEffect(() => { fetchAppointments() }, [])

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

  const handleJoinSession = (appt) => {
    // Store session info for timer + review
    sessionStorage.setItem(`session_${appt.therapist_id}`, 'true')
    sessionStorage.setItem(`appt_${appt.therapist_id}`, appt.id)
    if (appt.session_type === 'chat') {
      navigate(`/chat/${appt.therapist_id}`)
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
                <span className="text-primary-700 font-bold text-xl">T{reviewModal.therapist_id}</span>
              </div>
              <p className="font-semibold text-gray-900">Therapist #{reviewModal.therapist_id}</p>
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
                {rating === 5 ? '⭐ Excellent' : rating === 4 ? '😊 Good' : rating === 3 ? '😐 Okay' : rating === 2 ? '😔 Poor' : '😢 Very Poor'}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Share your experience</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How did the session help you? What did you like about the therapist?"
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setReviewModal(null); setRating(5); setComment('') }}
                className="flex-1 btn-secondary py-2.5"
              >Cancel</button>
              <button onClick={handleSubmitReview} disabled={submittingReview}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
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
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Sessions</h1>
              <p className="text-gray-500 text-sm hidden sm:block">Manage your therapy appointments</p>
            </div>
            <Link to="/therapists" className="btn-primary text-sm py-2 px-4">+ Book Session</Link>
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
                  activeTab === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sessions found</h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'upcoming' ? 'No upcoming sessions' : `No ${activeTab} sessions`}
              </p>
              <Link to="/therapists" className="btn-primary">Book a Session</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => (
                <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold">T{appt.therapist_id}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Therapist #{appt.therapist_id}</h3>
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
                      <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleJoinSession(appt)}
                            className="flex items-center gap-1 bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700"
                          >
                            {appt.session_type === 'chat' ? <MessageSquare className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                            {appt.session_type === 'chat' ? 'Chat' : 'Join'}
                          </button>
                        )}
                        {(appt.status === 'confirmed' || appt.status === 'pending') && (
                          <button onClick={() => handleCancel(appt.id)}
                            className="flex items-center gap-1 bg-red-50 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100"
                          >
                            <XCircle className="w-3 h-3" />Cancel
                          </button>
                        )}
                        {appt.status === 'completed' && (
                          <>
                            <button onClick={() => setReviewModal(appt)}
                              className="flex items-center gap-1 bg-yellow-50 text-yellow-600 text-xs px-3 py-1.5 rounded-lg hover:bg-yellow-100 font-medium"
                            >
                              <Star className="w-3 h-3" />Rate Session
                            </button>
                            <Link to={`/book/${appt.therapist_id}`}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-100"
                            >
                              <CheckCircle className="w-3 h-3" />Book Again
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {appt.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-gray-500 text-xs flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{appt.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}