import { useEffect, useState, useRef } from 'react'
import { Camera, Save, User, Phone, Calendar, Mail, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [profilePic, setProfilePic] = useState(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  })

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me')
      const data = res.data
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
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
      toast.success('Profile picture updated! ✅')
    } catch (error) {
      toast.error('Failed to upload picture')
    } finally {
      setUploadingPic(false)
    }
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error('Full name is required')
      return
    }
    setSaving(true)
    try {
      await api.put('/users/me', form)
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
      <Sidebar role="user" />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between pl-12 lg:pl-0">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500 text-sm">Manage your personal information</p>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2 py-2 px-4"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">

          {/* Profile Picture */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {profilePic ? (
                <img src={getImageUrl(profilePic)} alt={form.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
                />
              ) : (
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center border-4 border-primary-50">
                  <span className="text-primary-700 font-bold text-3xl">{form.full_name?.charAt(0)}</span>
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
            <h2 className="text-xl font-bold text-gray-900">{form.full_name}</h2>
            <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            <p className="text-gray-400 text-xs mt-1">Click camera icon to update photo</p>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input type="text" value={form.full_name}
                  onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Date of Birth
                </label>
                <input type="date" value={form.date_of_birth}
                  onChange={(e) => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select value={form.gender}
                  onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Account Type', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
                { label: 'Email Verified', value: '✅ Verified' },
                { label: 'Account Status', value: '✅ Active' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <p className="text-gray-600 text-sm">{item.label}</p>
                  <p className="font-medium text-gray-900 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving Changes...' : 'Save Profile'}
          </button>

        </div>
      </div>
    </div>
  )
}