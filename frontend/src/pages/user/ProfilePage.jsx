import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2, ArrowLeft, Camera } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
})

export default function ProfilePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [profilePic, setProfilePic] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me')
      setProfile(res.data)
      setProfilePic(res.data.profile_picture)
      reset({
        full_name: res.data.full_name || '',
        phone: res.data.phone || '',
        gender: res.data.gender || '',
        date_of_birth: res.data.date_of_birth ? res.data.date_of_birth.split('T')[0] : '',
      })
    } catch (error) {
      toast.error('Failed to load profile')
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

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await api.put('/users/me', data)
      toast.success('Profile updated successfully!')
      fetchProfile()
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4 pl-12 lg:pl-0">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500 text-sm">Manage your personal information</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-2xl mx-auto">

          {/* Avatar with upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6 text-center">
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
                {uploadingPic ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
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
            <p className="text-gray-500 capitalize mt-1">{user?.role}</p>
            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium mt-2">
              ✅ Verified Account
            </div>
            <p className="text-gray-400 text-xs mt-2">Click the camera icon to update photo</p>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-5">Edit Information</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input {...register('full_name')} type="text" className="input-field" placeholder="Your full name" />
                {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input-field bg-gray-50 cursor-not-allowed text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input {...register('phone')} type="tel" className="input-field" placeholder="+91 98765 43210" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select {...register('gender')} className="input-field">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input {...register('date_of_birth')} type="date" className="input-field" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              {[
                { label: 'Account Type', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
                { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A' },
                { label: 'Account Status', value: '✅ Active & Verified' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-sm">{item.label}</span>
                  <span className="font-medium text-gray-900 text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}