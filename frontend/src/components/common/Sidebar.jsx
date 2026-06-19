import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Heart, Activity, Calendar, MessageCircle,
  BookOpen, TrendingUp, Bell, LogOut,
  Menu, X, Users, Star, DollarSign, BarChart2
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function Sidebar({ role = 'user' }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      await api.post('/auth/logout', { refresh_token: refreshToken })
    } catch (e) {}
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const userNavItems = [
    { icon: <Activity className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Calendar className="w-5 h-5" />, label: 'My Sessions', path: '/appointments' },
    { icon: <Heart className="w-5 h-5" />, label: 'Therapists', path: '/therapists' },
    { icon: <MessageCircle className="w-5 h-5" />, label: 'Messages', path: '/messages' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Self Help', path: '/self-help' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Mood Tracker', path: '/mood-tracker' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Payments', path: '/payments' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', path: '/notifications' },
  ]

  const therapistNavItems = [
    { icon: <BarChart2 className="w-5 h-5" />, label: 'Dashboard', path: '/therapist/dashboard' },
    { icon: <Calendar className="w-5 h-5" />, label: 'My Sessions', path: '/therapist/sessions' },
    { icon: <MessageCircle className="w-5 h-5" />, label: 'Messages', path: '/messages' },
    { icon: <Users className="w-5 h-5" />, label: 'My Clients', path: '/therapist/clients' },
    { icon: <Star className="w-5 h-5" />, label: 'Reviews', path: '/therapist/reviews' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Earnings', path: '/therapist/earnings' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', path: '/notifications' },
    { icon: <User className="w-5 h-5" />, label: 'My Profile', path: '/therapist/profile' },
  ]

  const navItems = role === 'therapist' ? therapistNavItems : userNavItems

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <Link to={role === 'therapist' ? '/therapist/dashboard' : '/dashboard'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Mind Unleash</span>
          {role === 'therapist' && (
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">Pro</span>
          )}
        </Link>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && item.path !== '/therapist/dashboard' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={i}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-gray-100">
        <Link to="/profile" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-3 px-2 mb-3 hover:bg-gray-50 rounded-xl p-2 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.profile_picture ? (
                <img src={`http://localhost:8000${user.profile_picture}`}
                  alt={user?.full_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-primary-700 font-semibold text-sm">{user?.full_name?.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user?.full_name}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-xl shadow-md border border-gray-200"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 lg:hidden ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 z-30">
        <SidebarContent />
      </aside>
    </>
  )
}