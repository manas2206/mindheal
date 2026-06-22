import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart, Users, UserCheck, Calendar, DollarSign,
  LogOut, Bell, TrendingUp, Shield, CheckCircle,
  XCircle, BarChart2, Settings, Play, MessageCircle,
  Video, X, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [pendingTherapists, setPendingTherapists] = useState([])
  const [payments, setPayments] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Recording viewer modal state
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [loadingRecording, setLoadingRecording] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [analyticsRes, usersRes, pendingRes, paymentsRes, sessionsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users?limit=20'),
        api.get('/admin/therapists/pending'),
        api.get('/admin/payments?limit=20'),
        api.get('/admin/sessions?limit=50'),
      ])
      setAnalytics(analyticsRes.data)
      setUsers(usersRes.data)
      setPendingTherapists(pendingRes.data.pending_therapists || [])
      setPayments(paymentsRes.data.payments || [])
      setSessions(sessionsRes.data.sessions || [])
    } catch (error) {
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTherapist = async (id, status) => {
    try {
      await api.put(`/admin/therapists/${id}/verify`, { status })
      toast.success(`Therapist ${status}!`)
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleToggleUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`)
      toast.success('User status updated!')
      fetchData()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'refunded': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'

  const handleViewTranscript = async (session) => {
    setSelectedSession(session)
    setShowTranscriptModal(true)
    setLoadingRecording(true)
    setTranscript(null)
    try {
      const res = await api.get(`/admin/sessions/${session.id}/chat-transcript`)
      setTranscript(res.data)
    } catch (error) {
      toast.error('No chat transcript found for this session')
    } finally {
      setLoadingRecording(false)
    }
  }

  const handleViewVideo = async (session) => {
    setSelectedSession(session)
    setShowVideoModal(true)
    setLoadingRecording(true)
    setVideoUrl(null)
    try {
      const res = await api.get(`/admin/sessions/${session.id}/video-recording`)
      setVideoUrl(`${API_BASE}${res.data.recording_url}`)
    } catch (error) {
      toast.error('No video recording found for this session')
    } finally {
      setLoadingRecording(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Chat Transcript Modal ── */}
      {showTranscriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Chat Transcript</h3>
                <p className="text-gray-500 text-sm">
                  {selectedSession?.patient_name} ↔ {selectedSession?.therapist_name}
                </p>
              </div>
              <button onClick={() => setShowTranscriptModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingRecording ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !transcript || transcript.transcript.length === 0 ? (
                <p className="text-gray-400 text-center py-12 text-sm">No messages found for this session</p>
              ) : (
                transcript.transcript.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_role === 'patient' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs rounded-xl px-3 py-2 ${
                      msg.sender_role === 'patient' ? 'bg-gray-100' : 'bg-primary-100'
                    }`}>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">{msg.sender_name}</p>
                      <p className="text-sm text-gray-900">{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Video Recording Modal ── */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Video Recording</h3>
                <p className="text-gray-500 text-sm">
                  {selectedSession?.patient_name} ↔ {selectedSession?.therapist_name}
                </p>
              </div>
              <button onClick={() => setShowVideoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              {loadingRecording ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !videoUrl ? (
                <p className="text-gray-400 text-center py-12 text-sm">No video recording available for this session</p>
              ) : (
                <div>
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-xl bg-black"
                    style={{ maxHeight: '60vh' }}
                  />
                  <a  
                    href={videoUrl}
                    download
                    className="flex items-center justify-center gap-2 mt-4 bg-primary-600 text-white py-2.5 rounded-xl font-medium hover:bg-primary-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download Recording
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 fixed inset-y-0">
        <div className="flex items-center gap-2 p-6 border-b border-gray-700">
          <img src="/mindunleash_logo.png" alt="MindHeal" className="h-8 w-auto object-contain brightness-0 invert" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: <BarChart2 className="w-5 h-5" />, label: 'Dashboard', tab: 'overview' },
            { icon: <Users className="w-5 h-5" />, label: 'Users', tab: 'users' },
            { icon: <UserCheck className="w-5 h-5" />, label: 'Therapists', tab: 'therapists' },
            { icon: <Calendar className="w-5 h-5" />, label: 'Sessions & Recordings', tab: 'sessions' },
            { icon: <DollarSign className="w-5 h-5" />, label: 'Payments', tab: 'payments' },
            { icon: <Shield className="w-5 h-5" />, label: 'Security', tab: 'security' },
            { icon: <Settings className="w-5 h-5" />, label: 'Settings', tab: 'settings' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium w-full text-left ${
                activeTab === item.tab
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">{user?.full_name?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user?.full_name}</p>
              <p className="text-gray-400 text-xs">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 text-sm">Welcome back, {user?.full_name}</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              {pendingTherapists.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        <main className="p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* ── Overview Tab ── */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Users', value: analytics?.total_users || 0, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600', change: '+11%' },
                      { label: 'Therapists', value: analytics?.total_therapists || 0, icon: <UserCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-600', change: '+48%' },
                      { label: 'Total Sessions', value: analytics?.total_appointments || 0, icon: <Calendar className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600', change: '+18%' },
                      { label: 'Total Revenue', value: `₹${analytics?.total_revenue?.toLocaleString() || 0}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-600', change: '+16%' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                            {stat.icon}
                          </div>
                          <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  {pendingTherapists.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
                      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-yellow-500" />
                        Pending Therapist Verification
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{pendingTherapists.length}</span>
                      </h2>
                      <div className="space-y-3">
                        {pendingTherapists.map((therapist) => (
                          <div key={therapist.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <div>
                              <p className="font-medium text-gray-900">Therapist #{therapist.id}</p>
                              <p className="text-gray-500 text-sm">License: {therapist.license_number}</p>
                              <p className="text-gray-400 text-xs">{therapist.experience_years} years experience</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleVerifyTherapist(therapist.id, 'verified')}
                                className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
                                <CheckCircle className="w-4 h-4" />Verify
                              </button>
                              <button onClick={() => handleVerifyTherapist(therapist.id, 'rejected')}
                                className="flex items-center gap-1 bg-red-100 text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
                                <XCircle className="w-4 h-4" />Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-600" />Recent Users
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">User</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Role</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Status</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Joined</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {users.slice(0, 5).map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50">
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-primary-700 text-xs font-bold">{u.full_name?.charAt(0)}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{u.full_name}</p>
                                    <p className="text-gray-400 text-xs">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'therapist' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="py-3 text-xs text-gray-500">
                                {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-3">
                                <button onClick={() => handleToggleUser(u.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ── Users Tab ── */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-600" />All Users ({users.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">User</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Role</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Status</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Verified</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Joined</th>
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <span className="text-primary-700 text-xs font-bold">{u.full_name?.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{u.full_name}</p>
                                  <p className="text-gray-400 text-xs">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'therapist' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {u.is_verified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 text-xs text-gray-500">
                              {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3">
                              <button onClick={() => handleToggleUser(u.id)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Therapists Tab ── */}
              {activeTab === 'therapists' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary-600" />
                      Pending Verification ({pendingTherapists.length})
                    </h2>
                    {pendingTherapists.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No pending therapists ✅</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingTherapists.map((therapist) => (
                          <div key={therapist.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <div>
                              <p className="font-medium text-gray-900">Therapist #{therapist.id}</p>
                              <p className="text-gray-500 text-sm">License: {therapist.license_number}</p>
                              <p className="text-gray-400 text-xs">{therapist.experience_years} years • Fee: ₹{therapist.session_fee}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleVerifyTherapist(therapist.id, 'verified')}
                                className="flex items-center gap-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700">
                                <CheckCircle className="w-4 h-4" />Verify
                              </button>
                              <button onClick={() => handleVerifyTherapist(therapist.id, 'rejected')}
                                className="flex items-center gap-1 bg-red-100 text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-200">
                                <XCircle className="w-4 h-4" />Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Payments Tab ── */}
              {activeTab === 'payments' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary-600" />All Payments ({payments.length})
                  </h2>
                  {payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No payments yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">ID</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">User</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Amount</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Status</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="py-3 text-sm text-gray-600">#{payment.id}</td>
                              <td className="py-3 text-sm text-gray-600">User #{payment.user_id}</td>
                              <td className="py-3 text-sm font-medium text-gray-900">₹{payment.amount}</td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-3 text-xs text-gray-500">
                                {new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Sessions & Recordings Tab ── */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Sessions', value: analytics?.total_appointments || 0, color: 'bg-blue-50 text-blue-600' },
                      { label: 'Completed', value: analytics?.completed_appointments || 0, color: 'bg-green-50 text-green-600' },
                      { label: 'Pending', value: (analytics?.total_appointments || 0) - (analytics?.completed_appointments || 0), color: 'bg-yellow-50 text-yellow-600' },
                      { label: 'Total Revenue', value: `₹${analytics?.total_revenue || 0}`, color: 'bg-purple-50 text-purple-600' },
                    ].map((stat, i) => (
                      <div key={i} className={`rounded-2xl p-5 text-center ${stat.color}`}>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm mt-2 font-medium">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-600" />
                      Completed Session Recordings ({sessions.length})
                    </h2>
                    {sessions.length === 0 ? (
                      <p className="text-gray-500 text-center py-12 text-sm">No completed sessions yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Patient</th>
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Therapist</th>
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Type</th>
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Date</th>
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Duration</th>
                              <th className="text-left text-xs font-medium text-gray-500 pb-3">Recording</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {sessions.map((session) => (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="py-3 text-sm font-medium text-gray-900">{session.patient_name}</td>
                                <td className="py-3 text-sm text-gray-600">{session.therapist_name}</td>
                                <td className="py-3">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                                    session.session_type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {session.session_type}
                                  </span>
                                </td>
                                <td className="py-3 text-xs text-gray-500">
                                  {new Date(session.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-3 text-xs text-gray-500">{session.duration_mins} mins</td>
                                <td className="py-3">
                                  <div className="flex gap-2">
                                    {(session.session_type === 'chat' || session.session_type === 'video') && (
                                      <button onClick={() => handleViewTranscript(session)}
                                        className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-100"
                                        title="View chat transcript"
                                      >
                                        <MessageCircle className="w-3 h-3" />Chat
                                      </button>
                                    )}
                                    {session.session_type === 'video' && (
                                      <button onClick={() => handleViewVideo(session)}
                                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${
                                          session.has_recording
                                            ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                            : 'bg-gray-50 text-gray-400'
                                        }`}
                                        title={session.has_recording ? 'View video recording' : 'No recording available'}
                                      >
                                        <Video className="w-3 h-3" />
                                        {session.has_recording ? 'Video' : 'No video'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Security Tab ── */}
              {activeTab === 'security' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-600" />Security Overview
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'JWT Authentication', status: 'Active' },
                      { label: 'Bcrypt Password Hashing (12 rounds)', status: 'Active' },
                      { label: 'Rate Limiting (10/min auth, 100/min API)', status: 'Active' },
                      { label: 'CORS Protection', status: 'Active' },
                      { label: 'OTP Email Verification', status: 'Active' },
                      { label: 'Refresh Token Rotation', status: 'Active' },
                      { label: 'Audit Logging', status: 'Active' },
                      { label: 'SQL Injection Protection (ORM)', status: 'Active' },
                      { label: 'XSS Protection (DOMPurify)', status: 'Active' },
                      { label: 'Trusted Host Middleware', status: 'Active' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <p className="font-medium text-gray-700">{item.label}</p>
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          ✅ {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Settings Tab ── */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary-600" />Platform Settings
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Platform Name', value: 'MindHeal' },
                      { label: 'Support Email', value: 'mwp.counseling@gmail.com' },
                      { label: 'Default Session Duration', value: '25 minutes' },
                      { label: 'OTP Expiry', value: '10 minutes' },
                      { label: 'Access Token Expiry', value: '30 minutes' },
                      { label: 'Refresh Token Expiry', value: '7 days' },
                      { label: 'Payment Currency', value: 'INR (₹)' },
                      { label: 'Payment Gateway', value: 'Razorpay' },
                      { label: 'Database', value: 'MySQL 8.x' },
                      { label: 'Backend Framework', value: 'FastAPI (Python)' },
                      { label: 'Frontend Framework', value: 'React Vite JS' },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <p className="text-gray-600 text-sm">{setting.label}</p>
                        <p className="font-medium text-gray-900 text-sm">{setting.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}