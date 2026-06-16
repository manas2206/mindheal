import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Heart, ArrowLeft, Star, Globe, Clock,
  Calendar, Video, MessageCircle, Phone, ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function BookingPage() {
  const { therapistId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [therapist, setTherapist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [sessionType, setSessionType] = useState('video')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchTherapist()
  }, [therapistId])

  const fetchTherapist = async () => {
    try {
      const res = await api.get(`/therapists/${therapistId}`)
      setTherapist(res.data)
    } catch (error) {
      toast.error('Therapist not found')
      navigate('/therapists')
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth)

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time')
      return
    }

    setBooking(true)
    try {
      const timeMap = {
        '09:00 AM': '09:00', '10:00 AM': '10:00', '11:00 AM': '11:00',
        '12:00 PM': '12:00', '01:00 PM': '13:00', '02:00 PM': '14:00',
        '03:00 PM': '15:00', '04:00 PM': '16:00', '05:00 PM': '17:00',
        '06:00 PM': '18:00'
      }

      const scheduledAt = `${selectedDate}T${timeMap[selectedTime]}:00`

      // Step 1 — Create appointment
      const apptRes = await api.post('/appointments/', {
        therapist_id: parseInt(therapistId),
        scheduled_at: scheduledAt,
        session_type: sessionType,
        duration_mins: 50,
      })
      const appointment = apptRes.data
      toast.success('Appointment created! Proceeding to payment...')

      // Step 2 — Create Razorpay order
      const orderRes = await api.post('/payments/create-order', {
        appointment_id: appointment.id
      })
      const { order_id, amount, currency, key_id } = orderRes.data

      // Step 3 — Open Razorpay checkout
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'MindHeal',
        description: `Therapy Session with Therapist #${therapistId}`,
        order_id: order_id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              appointment_id: appointment.id,
            })
            toast.success('🎉 Payment successful! Appointment confirmed!')
            navigate('/dashboard')
          } catch (error) {
            toast.error('Payment verification failed. Contact support.')
          }
        },
        prefill: {
          name: user?.full_name || '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#16a34a',
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled')
            setBooking(false)
          }
        }
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`)
        setBooking(false)
      })
      razorpayInstance.open()

    } catch (error) {
      toast.error(error.message || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/therapists')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Mind Unleash</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Therapist Info + Calendar */}
          <div className="lg:col-span-2 space-y-6">

            {/* Therapist Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-xl">T{therapist?.id}</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-900 text-lg">Therapist #{therapist?.id}</h2>
                  <p className="text-gray-500 text-sm">{therapist?.specializations?.[0]}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{therapist?.rating}</span>
                    <span className="text-gray-400 text-sm">({therapist?.total_reviews} reviews)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {therapist?.specializations?.slice(0, 3).map((s, i) => (
                      <span key={i} className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full capitalize">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600 text-xl">₹{therapist?.session_fee}</p>
                  <p className="text-gray-400 text-xs">/ session</p>
                </div>
              </div>
            </div>

            {/* Session Type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Session Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'video', icon: <Video className="w-5 h-5" />, label: 'Video' },
                  { value: 'chat', icon: <MessageCircle className="w-5 h-5" />, label: 'Chat' },
                  { value: 'audio', icon: <Phone className="w-5 h-5" />, label: 'Audio' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSessionType(type.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      sessionType === type.value
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-gray-200 text-gray-600 hover:border-primary-300'
                    }`}
                  >
                    {type.icon}
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Select Date & Time</h3>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="font-medium text-gray-900">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const today = new Date()
                  const isPast = new Date(dateStr) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === today.toISOString().split('T')[0]

                  return (
                    <button
                      key={day}
                      disabled={isPast}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        isPast ? 'text-gray-300 cursor-not-allowed' :
                        isSelected ? 'bg-primary-600 text-white' :
                        isToday ? 'border-2 border-primary-600 text-primary-600' :
                        'hover:bg-primary-50 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className="mt-5">
                  <h4 className="font-medium text-gray-900 mb-3 text-sm">Available Times</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_SLOTS.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTime === time
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — Booking Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Therapist</span>
                  <span className="font-medium">#{therapistId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Session Type</span>
                  <span className="font-medium capitalize">{sessionType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">50 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium">{selectedTime || 'Not selected'}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-primary-600 text-lg">₹{therapist?.session_fee}</span>
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={booking || !selectedDate || !selectedTime}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {booking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                🔒 100% Secure Payment
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}