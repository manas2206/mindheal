import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Save, Camera, Plus, X, ArrowLeft,
  User, BookOpen, Globe, DollarSign,
  Award, FileText, Loader2, Calendar, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

const SPECIALIZATION_OPTIONS = [
  'Anxiety', 'Depression', 'Stress', 'Relationships',
  'Trauma', 'ADHD', 'Grief', 'OCD', 'PTSD',
  'Addiction', 'Sleep Issues', 'Self-Esteem',
  'Career Counseling', 'Family Therapy', 'Couples Therapy'
]

const LANGUAGE_OPTIONS = [
  'English', 'Hindi', 'Marathi', 'Tamil', 'Telugu',
  'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
]

const DEFAULT_AVAILABILITY = DAYS.map((_, i) => ({
  day_of_week: i,
  start_time: '09:00',
  end_time: '17:00',
  is_available: i >= 1 && i <= 5, // Mon-Fri by default
}))

export default function TherapistEditProfile() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [profilePic, setProfilePic] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')

  const [form, setForm] = useState({
    bio: '',
    experience_years: 0,
    education: '',
    session_fee: 1000,
    specializations: [],
    languages: [],
  })

  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const [profileRes, availRes] = await Promise.all([
        api.get('/therapists/profile/me'),
        api.get(`/therapists/profile/me`).then(() =>
          api.get('/therapists/profile/me')
        ).catch(() => ({ data: null }))
      ])

      const data = profileRes.data
      setForm({
        bio: data.bio || '',
        experience_years: data.experience_years || 0,
        education: data.education || '',
        session_fee: data.session_fee || 1000,
        specializations: data.specializations || [],
        languages: data.languages || [],
      })
      setProfilePic(data.profile_picture)

      // Fetch availability separately
      try {
        const avRes = await api.get(`/therapists/${data.id}/availability`)
        if (avRes.data.availability && avRes.data.availability.length > 0) {
          // Merge with defaults
          const fetched = avRes.data.availability
          const merged = DEFAULT_AVAILABILITY.map(def => {
            const found = fetched.find(f => f.day_of_week === def.day_of_week)
            return found ? { ...def, ...found } : def
          })
          setAvailability(merged)
        }
      } catch (e) {
        // Use defaults
      }
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePictureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB')
      return
    }
    setUploadingPic(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/users/me/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfilePic(res.data.profile_picture)
      toast.success('Profile picture updated!')
    } catch (error) {
      toast.error('Failed to upload picture')
    } finally {
      setUploadingPic(false)
    }
  }

  const toggleSpecialization = (spec) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }))
  }

  const toggleLanguage = (lang) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const handleSave = async () => {
    if (!form.bio.trim()) { toast.error('Please add a bio'); return }
    if (form.specializations.length === 0) { toast.error('Please select at least one specialization'); return }
    if (form.languages.length === 0) { toast.error('Please select at least one language'); return }
    if (form.session_fee < 100) { toast.error('Session fee must be at least ₹100'); return }

    setSaving(true)
    try {
      await api.put('/therapists/profile/me', form)
      toast.success('Profile updated successfully! ✅')
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAvailability = async () => {
    setSavingAvailability(true)
    try {
      await api.post('/therapists/availability', { availability })
      toast.success('Availability updated! ✅')
    } catch (error) {
      toast.error('Failed to update availability')
    } finally {
      setSavingAvailability(false)
    }
  }

  const toggleDayAvailable = (dayIndex) => {
    setAvailability(prev => prev.map(slot =>
      slot.day_of_week === dayIndex
        ? { ...slot, is_available: !slot.is_available }
        : slot
    ))
  }

  const updateDayTime = (dayIndex, field, value) => {
    setAvailability(prev => prev.map(slot =>
      slot.day_of_week === dayIndex
        ? { ...slot, [field]: value }
        : slot
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="therapist" />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/therapist/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500 text-sm">Update your profile and availability</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6">
          <div className="flex gap-0 pl-0">
            {[
              { key: 'profile', label: 'Profile Info', icon: <User className="w-4 h-4" /> },
              { key: 'availability', label: 'Availability', icon: <Calendar className="w-4 h-4" /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto">

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">

              {/* Profile Picture */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {profilePic ? (
                    <img src={getImageUrl(profilePic)} alt={user?.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center border-4 border-primary-50">
                      <span className="text-primary-700 font-bold text-3xl">{user?.full_name?.charAt(0)}</span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 shadow-lg transition-colors">
                    {uploadingPic
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera className="w-4 h-4 text-white" />
                    }
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={handlePictureUpload} disabled={uploadingPic} />
                  </label>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
                <p className="text-gray-500 text-sm mt-1">Licensed Therapist</p>
              </div>

              {/* Bio */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />About You
                </h3>
                <textarea value={form.bio}
                  onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Write a professional bio..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-gray-400 text-xs mt-2">{form.bio.length} characters</p>
              </div>

              {/* Experience & Fee */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-600" />Experience & Fee
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                    <input type="number" min="0" max="50" value={form.experience_years}
                      onChange={(e) => setForm(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Fee (₹)</label>
                    <input type="number" min="100" max="10000" value={form.session_fee}
                      onChange={(e) => setForm(prev => ({ ...prev, session_fee: parseFloat(e.target.value) || 1000 }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />Education & Credentials
                </h3>
                <textarea value={form.education}
                  onChange={(e) => setForm(prev => ({ ...prev, education: e.target.value }))}
                  placeholder="e.g. PhD Psychology - Delhi University | Licensed Clinical Psychologist"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-gray-400 text-xs mt-2">Separate multiple credentials with | symbol</p>
              </div>

              {/* Specializations */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-600" />Specializations
                </h3>
                <p className="text-gray-500 text-sm mb-4">Select all areas you specialize in</p>
                {form.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {form.specializations.map(spec => (
                      <span key={spec} className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                        {spec}
                        <button onClick={() => toggleSpecialization(spec)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATION_OPTIONS.filter(s => !form.specializations.includes(s)).map(spec => (
                    <button key={spec} onClick={() => toggleSpecialization(spec)}
                      className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                      <Plus className="w-3 h-3" />{spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary-600" />Languages
                </h3>
                <p className="text-gray-500 text-sm mb-4">Languages you can conduct sessions in</p>
                {form.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {form.languages.map(lang => (
                      <span key={lang} className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        {lang}
                        <button onClick={() => toggleLanguage(lang)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.filter(l => !form.languages.includes(l)).map(lang => (
                    <button key={lang} onClick={() => toggleLanguage(lang)}
                      className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all">
                      <Plus className="w-3 h-3" />{lang}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* ── Availability Tab ── */}
          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-600" />Weekly Availability
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Set your available days and working hours. Patients will see these slots when booking.
                </p>

                <div className="space-y-4">
                  {availability.map((slot) => (
                    <div key={slot.day_of_week}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        slot.is_available
                          ? 'border-primary-200 bg-primary-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleDayAvailable(slot.day_of_week)}
                            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                              slot.is_available ? 'bg-primary-600' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              slot.is_available ? 'left-7' : 'left-1'
                            }`} />
                          </button>
                          <span className={`font-medium text-sm w-24 ${
                            slot.is_available ? 'text-primary-700' : 'text-gray-400'
                          }`}>
                            {DAYS[slot.day_of_week]}
                          </span>
                        </div>

                        {slot.is_available && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <select value={slot.start_time}
                              onChange={(e) => updateDayTime(slot.day_of_week, 'start_time', e.target.value)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            >
                              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="text-gray-400 text-sm">to</span>
                            <select value={slot.end_time}
                              onChange={(e) => updateDayTime(slot.day_of_week, 'end_time', e.target.value)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            >
                              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        )}

                        {!slot.is_available && (
                          <span className="text-gray-400 text-sm">Not available</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-blue-700 text-sm flex items-start gap-2">
                    <span className="flex-shrink-0">💡</span>
                    <span>Toggle days on/off and set your working hours. Patients will only be able to book sessions during your available times.</span>
                  </p>
                </div>
              </div>

              <button onClick={handleSaveAvailability} disabled={savingAvailability}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
              >
                {savingAvailability ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                {savingAvailability ? 'Saving...' : 'Save Availability'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}