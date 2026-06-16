import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Heart, Loader2, Mail, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: email, 2: otp + new password
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Step 1 form
  const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
  })
  const emailForm = useForm({ resolver: zodResolver(emailSchema) })

  // Step 2 form
  const resetSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
    new_password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character'),
    confirm_password: z.string(),
  }).refine(data => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  const resetForm = useForm({ resolver: zodResolver(resetSchema) })

  const onSendOTP = async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setEmail(data.email)
      setStep(2)
      toast.success('OTP sent to your email!')
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const onResetPassword = async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        email: email,
        otp: data.otp,
        new_password: data.new_password,
      })
      toast.success('Password reset successfully! Please login.')
      navigate('/login')
    } catch (error) {
      toast.error(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-primary-600 p-12 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">MindHeal</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Reset your password
          </h2>
          <p className="text-primary-100 text-lg">
            Don't worry — we'll help you get back into your account safely.
          </p>
          <div className="mt-8 space-y-4">
            {['🔒 Secure OTP verification', '📧 Check your email inbox', '⏱️ OTP valid for 10 minutes', '✅ Set a strong new password'].map((item, i) => (
              <p key={i} className="text-primary-100">{item}</p>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-sm">© 2026 MindHeal. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">MindHeal</span>
          </div>

          {/* Back button */}
          <Link to="/login" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          {/* Step 1 — Email */}
          {step === 1 && (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-gray-600">Enter your email and we'll send you an OTP to reset your password.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      {...emailForm.register('email')}
                      type="email"
                      placeholder="Enter your email"
                      className="input-field"
                    />
                    {emailForm.formState.errors.email && (
                      <p className="error-text">{emailForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>

                <p className="text-center text-gray-600 text-sm mt-6">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
                </p>
              </div>
            </>
          )}

          {/* Step 2 — OTP + New Password */}
          {step === 2 && (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                  <KeyRound className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
                <p className="text-gray-600">
                  OTP sent to <span className="font-medium text-gray-900">{email}</span>.
                  Enter it below with your new password.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-5">

                  {/* OTP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                    <input
                      {...resetForm.register('otp')}
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      className="input-field text-center text-2xl tracking-widest font-bold"
                    />
                    {resetForm.formState.errors.otp && (
                      <p className="error-text">{resetForm.formState.errors.otp.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        {...resetForm.register('new_password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        className="input-field pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.new_password && (
                      <p className="error-text">{resetForm.formState.errors.new_password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      {...resetForm.register('confirm_password')}
                      type="password"
                      placeholder="Confirm new password"
                      className="input-field"
                    />
                    {resetForm.formState.errors.confirm_password && (
                      <p className="error-text">{resetForm.formState.errors.confirm_password.message}</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setStep(1)}
                    className="text-primary-600 text-sm hover:underline"
                  >
                    Didn't receive OTP? Try again
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}