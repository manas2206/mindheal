import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Brain, Loader2, Mail } from 'lucide-react'
import api from '../../services/api'

const schema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export default function OTPVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: location.state?.email || '',
    }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/verify-otp', data)
      toast.success('Email verified! Please login.')
      navigate('/login')
    } catch (error) {
      toast.error(error.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Brain className="w-10 h-10 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">Mind Unleash</span>
          </Link>
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mt-6 mb-4">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-600 mt-1">Enter the 6-digit OTP sent to your email</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="you@example.com"
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            {/* OTP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OTP Code
              </label>
              <input
                {...register('otp')}
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                className="input-field text-center text-2xl tracking-widest font-bold"
              />
              {errors.otp && <p className="error-text">{errors.otp.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-600 text-sm">
              Didn't receive OTP? Check your spam folder.
            </p>
            <Link to="/register" className="text-primary-600 text-sm hover:underline">
              Back to Register
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}