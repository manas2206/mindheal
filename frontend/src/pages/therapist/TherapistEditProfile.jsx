import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Save, Camera, Plus, X, ArrowLeft,
  User, BookOpen, Globe, DollarSign,
  Award, FileText, Loader2
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

export default function TherapistProfile() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [profilePic, setProfilePic] = useState(null)

  const [form, setForm] = useState({
    bio: '',
    experience_years: 0,
    education: '',
    session_fee: 1000,
    specializations: [],
    languages: [],
  })

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/therapists/profile/me')
      const data = res.data
      setForm({
        bio: data.bio || '',
        experience_years: data.experience_years || 0,
        education: data.education || '',
        session_fee: data.session_fee || 1000,
        specializations: data.specializations || [],
        languages: data.languages || [],
      })
      setProfilePic(data.profile_picture)
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
    if (!form.bio.trim()) {
      toast.error('Please add a bio')
      return
    }
    if (form.specializations.length === 0) {
      toast.error('Please select at least one specialization')
      return
    }
    if (form.languages.length === 0) {
      toast.error('Please select at least one language')
      return
    }
    if (form.session_fee < 100) {
      toast.error('Session fee must be at least ₹100')
      return
    }

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

        {/* Header */}
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
                <p className="text-gray-500 text-sm">Update your therapist profile</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2 py-2 px-4"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">

          {/* Profile Picture */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {profilePic ? (
                <img
                  src={getImageUrl(profilePic)}
                  alt={user?.full_name}
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
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePictureUpload}
                  disabled={uploadingPic}
                />
              </label>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm mt-1">Licensed Therapist</p>
            <p className="text-gray-400 text-xs mt-1">Click camera icon to update photo</p>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              About You
            </h3>
            <textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Write a professional bio describing your approach, expertise, and what clients can expect from working with you..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-gray-400 text-xs mt-2">{form.bio.length} characters</p>
          </div>

          {/* Experience & Fee */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Experience & Fee
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={form.experience_years}
                  onChange={(e) => setForm(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Fee (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={form.session_fee}
                  onChange={(e) => setForm(prev => ({ ...prev, session_fee: parseFloat(e.target.value) || 1000 }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              Education & Credentials
            </h3>
            <textarea
              value={form.education}
              onChange={(e) => setForm(prev => ({ ...prev, education: e.target.value }))}
              placeholder="e.g. PhD Psychology - Delhi University | Licensed Clinical Psychologist | CBT Certified"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-gray-400 text-xs mt-2">
              Separate multiple credentials with | (pipe symbol)
            </p>
          </div>

          {/* Specializations */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              Specializations
            </h3>
            <p className="text-gray-500 text-sm mb-4">Select all areas you specialize in</p>

            {/* Selected */}
            {form.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {form.specializations.map(spec => (
                  <span key={spec}
                    className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {spec}
                    <button onClick={() => toggleSpecialization(spec)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.filter(s => !form.specializations.includes(s)).map(spec => (
                <button key={spec}
                  onClick={() => toggleSpecialization(spec)}
                  className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-600" />
              Languages
            </h3>
            <p className="text-gray-500 text-sm mb-4">Select languages you can conduct sessions in</p>

            {/* Selected */}
            {form.languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {form.languages.map(lang => (
                  <span key={lang}
                    className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {lang}
                    <button onClick={() => toggleLanguage(lang)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.filter(l => !form.languages.includes(l)).map(lang => (
                <button key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className="flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
          >
            {saving
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Save className="w-5 h-5" />
            }
            {saving ? 'Saving Changes...' : 'Save Profile'}
          </button>

        </div>
      </div>
    </div>
  )
}