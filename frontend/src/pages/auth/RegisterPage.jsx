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
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
  role: z.enum(['user', 'therapist']),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'user', terms: false }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const { confirmPassword, terms, ...payload } = data
      await api.post('/auth/register', payload)
      toast.success('Account created! Check your email for OTP.')
      navigate('/verify-otp', { state: { email: data.email } })
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        const userInfo = await userInfoRes.json()

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
        toast.error('Google sign-up failed. Please try email registration.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      toast.error('Google sign-up cancelled or failed')
      setGoogleLoading(false)
    }
  })

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left side — green panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary-600 p-12 text-white">
        <div className="flex items-center gap-2">
          <img src="/mindunleash_logo.png" alt="MindHeal" className="h-8 w-auto object-contain brightness-0 invert" />
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Start your healing journey today
          </h2>
          <p className="text-primary-100 text-lg">
            Join thousands of people who have found peace and clarity through MindHeal.
          </p>
          <div className="mt-8 space-y-4">
            {[
              '🧠 Expert mental health support',
              '📅 Flexible scheduling',
              '💬 Chat and video sessions',
              '📊 Progress tracking',
            ].map((item, i) => (
              <p key={i} className="text-primary-100">{item}</p>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-sm">© 2026 MindHeal. All rights reserved.</p>
      </div>

      {/* Right side — form */}
      <div className="flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MindHeal</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600 mb-8">Let's get you started on your journey</p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Google Sign Up */}
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

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'user', label: '👤 User' },
                    { value: 'therapist', label: '🏥 Therapist' }
                  ].map((role) => (
                    <label key={role.value} className="relative cursor-pointer">
                      <input
                        {...register('role')}
                        type="radio"
                        value={role.value}
                        className="peer sr-only"
                      />
                      <div className="border-2 border-gray-200 rounded-lg p-3 text-center peer-checked:border-primary-600 peer-checked:bg-primary-50 transition-all">
                        <p className="font-medium text-gray-700 text-sm">{role.label}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  {...register('full_name')}
                  type="text"
                  placeholder="Enter your full name"
                  className="input-field"
                />
                {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Confirm your password"
                  className="input-field"
                />
                {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  {...register('terms')}
                  type="checkbox"
                  id="terms"
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:underline">Terms & Conditions</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                </label>
              </div>
              {errors.terms && <p className="error-text">{errors.terms.message}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>

            </form>

            <p className="text-center text-gray-600 text-sm mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}