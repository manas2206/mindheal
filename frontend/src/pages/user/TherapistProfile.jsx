import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, Globe, Clock, Award, MessageCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Sidebar from '../../components/common/Sidebar'

import { getImageUrl } from '../../utils/imageUrl'

export default function TherapistProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [therapist, setTherapist] = useState(null)
  const [availability, setAvailability] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => { fetchTherapist() }, [id])

  const fetchTherapist = async () => {
    try {
      const [therapistRes, availRes] = await Promise.all([
        api.get(`/therapists/${id}`),
        api.get(`/therapists/${id}/availability`),
      ])
      setTherapist(therapistRes.data)
      setAvailability(availRes.data.availability || [])

      // Fetch real reviews
      try {
        const reviewsRes = await api.get(`/appointments/reviews/therapist/${id}`)
        setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : [])
      } catch (e) {}
    } catch (error) {
      toast.error('Therapist not found')
      navigate('/therapists')
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="user" />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/therapists')}
              className="p-2 hover:bg-gray-100 rounded-lg ml-10 lg:ml-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Therapist Profile</h1>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-4xl mx-auto">

          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:p-6 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar */}
              <div className="w-24 h-24 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {therapist?.profile_picture ? (
                  <img src={getImageUrl(therapist.profile_picture)}
                    alt={therapist?.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-primary-700 font-bold text-3xl">
                    {therapist?.full_name?.charAt(0) || 'T'}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{therapist?.full_name}</h2>
                    <p className="text-primary-600 font-medium mt-1">{therapist?.specializations?.[0]}</p>
                    <p className="text-gray-500 text-sm mt-1">{therapist?.experience_years}+ Years Experience</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={`w-4 h-4 ${i <= Math.round(therapist?.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-900">{therapist?.rating}</span>
                      <span className="text-gray-400 text-sm">({therapist?.total_reviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">{therapist?.languages?.join(', ')}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold text-primary-600">₹{therapist?.session_fee}</p>
                    <p className="text-gray-400 text-sm">per session</p>
                    <Link to={`/book/${therapist?.id}`}
                      className="btn-primary mt-3 inline-block text-sm px-6"
                    >
                      Book a Session
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left */}
            <div className="lg:col-span-2 space-y-6">

              {/* About */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {therapist?.bio || 'Experienced mental health professional dedicated to helping clients achieve their wellness goals through evidence-based therapy approaches.'}
                </p>
              </div>

              {/* Specializations */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {therapist?.specializations?.map((spec, i) => (
                    <span key={i} className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium capitalize">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education */}
              {therapist?.education && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary-600" />
                    Education & Credentials
                  </h3>
                  <div className="space-y-2">
                    {therapist.education.split('|').map((edu, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-600 text-sm">{edu.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Client Reviews</h3>
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 text-xs font-bold">{review.user_name?.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{review.user_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">"{review.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="space-y-6">

              {/* Availability */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  Availability
                </h3>
                {availability.length === 0 ? (
                  <p className="text-gray-400 text-sm">No availability set</p>
                ) : (
                  <div className="space-y-2">
                    {availability.map((slot, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 text-sm font-medium">{DAYS[slot.day_of_week]}</span>
                        <span className="text-primary-600 text-xs">{slot.start_time} - {slot.end_time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Experience', value: `${therapist?.experience_years}+ years` },
                    { label: 'Total Reviews', value: therapist?.total_reviews },
                    { label: 'Rating', value: `${therapist?.rating}/5.0` },
                    { label: 'Languages', value: therapist?.languages?.length },
                    { label: 'Specializations', value: therapist?.specializations?.length },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">{stat.label}</span>
                      <span className="font-semibold text-gray-900 text-sm">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link to={`/book/${therapist?.id}`} className="btn-primary w-full text-center block py-3">
                Book Session — ₹{therapist?.session_fee}
              </Link>

              <Link to={`/chat/${therapist?.user_id}`}
                className="btn-secondary w-full text-center flex items-center justify-center gap-2 py-3"
              >
                <MessageCircle className="w-4 h-4" />
                Send Message
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}