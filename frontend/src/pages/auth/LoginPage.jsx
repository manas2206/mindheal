import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, Heart } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await api.post('/auth/login', data)
      setAuth(response.data)
      toast.success(`Welcome back, ${response.data.full_name}!`)
      if (response.data.role === 'admin') navigate('/admin')
      else if (response.data.role === 'therapist') navigate('/therapist/dashboard')
      else navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        // Get user info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        const userInfo = await userInfoRes.json()

        // Send to our backend
        const response = await api.post('/auth/google', {
          token: tokenResponse.access_token,
          email: userInfo.email,
          name: userInfo.name,
        })
        setAuth(response.data)
        toast.success(`Welcome, ${response.data.full_name}!`)
        if (response.data.role === 'admin') navigate('/admin')
        else if (response.data.role === 'therapist') navigate('/therapist/dashboard')
        else navigate('/dashboard')
      } catch (error) {
        toast.error('Google login failed. Please try email login.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      toast.error('Google login cancelled or failed')
      setGoogleLoading(false)
    }
  })

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left side — green panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary-600 p-12 text-white">
        <div className="flex items-center gap-2">
          <img src="/mindunleash_logo.png" alt="MindUnleash" className="h-8 w-auto object-contain" />
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Your mental health journey starts here
          </h2>
          <p className="text-primary-100 text-lg">
            Connect with licensed therapists and get the support you deserve.
          </p>
          <div className="mt-8 space-y-4">
            {['✅ 85+ verified therapists', '🔒 100% confidential sessions', '📱 Available on all devices', '⭐ 4.9 average rating'].map((item, i) => (
              <p key={i} className="text-primary-100">{item}</p>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-sm">© 2026 MindHeal. All rights reserved.</p>
      </div>

      {/* Right side — form */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/mindunleash_logo.png" alt="MindHeal" className="h-12 w-auto object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue to your account</p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Google Login */}
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                )}
                <span className="text-gray-700 font-medium text-sm">
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">or</span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Enter your email"
                  className="input-field"
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  
                  <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Login'}
              </button>

            </form>

            <p className="text-center text-gray-600 text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}