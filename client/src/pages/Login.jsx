import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, forgotPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(values) {
    try {
      await login(values)
      // If arriving from an invite link, return there to accept it
      navigate(inviteToken ? `/invite/${inviteToken}` : '/home')
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid email or password.'
      toast.error(msg)
    }
  }

  async function handleForgotPassword() {
    const email = getValues('email')
    if (!email) {
      toast.error('Enter your email address first.')
      return
    }
    try {
      await forgotPassword(email)
      toast.success('If that email exists, a reset link has been sent.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-sage rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🌿</span>
          </div>
          <h1 className="text-2xl font-semibold text-charcoal">Welcome back</h1>
          <p className="mt-1 text-mid text-sm">
            {inviteToken
              ? 'Sign in to accept your invitation.'
              : 'Sign in to your My Care Circle account.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className={`w-full rounded-lg border px-3 py-2.5 text-charcoal text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.email ? 'border-rose' : 'border-border'
                }`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3 py-2.5 text-charcoal text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.password ? 'border-rose' : 'border-border'
                }`}
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-sage hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sage text-white py-3 rounded-xl font-medium text-sm hover:bg-sage-light disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mid mt-4">
          New to My Care Circle?{' '}
          <Link
            to={inviteToken ? `/signup?invite=${inviteToken}` : '/signup'}
            className="text-sage font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
