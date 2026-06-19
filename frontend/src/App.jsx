import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OTPVerifyPage from './pages/auth/OTPVerifyPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import UserDashboard from './pages/user/UserDashboard'
import TherapistListing from './pages/user/TherapistListing'
import TherapistProfile from './pages/user/TherapistProfile'
import BookingPage from './pages/user/BookingPage'
import MoodTracker from './pages/user/MoodTracker'
import AppointmentsPage from './pages/user/AppointmentsPage'
import SelfHelp from './pages/user/SelfHelp'
import SelfHelpDetail from './pages/user/SelfHelpDetail'
import Notifications from './pages/user/Notifications'
import ProfilePage from './pages/user/ProfilePage'
import PaymentHistory from './pages/user/PaymentHistory'
import TherapistDashboard from './pages/therapist/TherapistDashboard'
import TherapistSessions from './pages/therapist/TherapistSessions'
import TherapistClients from './pages/therapist/TherapistClients'
import TherapistReviews from './pages/therapist/TherapistReviews'
import AdminDashboard from './pages/admin/AdminDashboard'
import ChatPage from './pages/shared/ChatPage'
import VideoConsultation from './pages/shared/VideoConsultation'
import NotFoundPage from './pages/NotFoundPage'
import TherapistEarnings from './pages/therapist/TherapistEarnings'
import TherapistProfile from './pages/therapist/TherapistProfile'

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />
  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated()) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />
    if (user?.role === 'therapist') return <Navigate to="/therapist/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function UnauthorizedPage() {
  const { user } = useAuthStore()
  const getDashboard = () => {
    if (user?.role === 'therapist') return '/therapist/dashboard'
    if (user?.role === 'admin') return '/admin'
    return '/dashboard'
  }
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
        <p className="text-gray-600 text-lg mb-6">You are not authorized to view this page</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-secondary">Go Back</button>
          <a href={getDashboard()} className="btn-primary">Go to Dashboard</a>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#fff', color: '#1e293b', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px 16px', fontSize: '14px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/verify-otp" element={<GuestRoute><OTPVerifyPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

        {/* User routes */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/therapists" element={<ProtectedRoute roles={['user']}><TherapistListing /></ProtectedRoute>} />
        <Route path="/therapists/:id" element={<ProtectedRoute roles={['user']}><TherapistProfile /></ProtectedRoute>} />
        <Route path="/book/:therapistId" element={<ProtectedRoute roles={['user']}><BookingPage /></ProtectedRoute>} />
        <Route path="/mood-tracker" element={<ProtectedRoute roles={['user']}><MoodTracker /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute roles={['user']}><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/self-help" element={<ProtectedRoute roles={['user']}><SelfHelp /></ProtectedRoute>} />
        <Route path="/self-help/:slug" element={<ProtectedRoute roles={['user']}><SelfHelpDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['user', 'therapist', 'admin']}><ProfilePage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute roles={['user']}><PaymentHistory /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute roles={['user', 'therapist', 'admin']}><Notifications /></ProtectedRoute>} />

        {/* Therapist routes */}
        <Route path="/therapist/dashboard" element={<ProtectedRoute roles={['therapist']}><TherapistDashboard /></ProtectedRoute>} />
        <Route path="/therapist/sessions" element={<ProtectedRoute roles={['therapist']}><TherapistSessions /></ProtectedRoute>} />
        <Route path="/therapist/clients" element={<ProtectedRoute roles={['therapist']}><TherapistClients /></ProtectedRoute>} />
        <Route path="/therapist/reviews" element={<ProtectedRoute roles={['therapist']}><TherapistReviews /></ProtectedRoute>} />
        <Route path="/therapist/earnings" element={<ProtectedRoute roles={['therapist']}><TherapistEarnings /></ProtectedRoute>} />
        <Route path="/therapist/profile" element={<ProtectedRoute roles={['therapist']}><TherapistProfile /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Shared routes */}
        <Route path="/messages" element={<ProtectedRoute roles={['user', 'therapist', 'admin']}><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:userId" element={<ProtectedRoute roles={['user', 'therapist', 'admin']}><ChatPage /></ProtectedRoute>} />
        <Route path="/session/:appointmentId" element={<ProtectedRoute roles={['user', 'therapist', 'admin']}><VideoConsultation /></ProtectedRoute>} />

        {/* Other */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}