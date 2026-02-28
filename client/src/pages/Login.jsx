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
    <div className="min-h-screen bg-gradient-night flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="font-display text-3xl text-cloud font-medium tracking-wide"
          >
            My CareCircle
          </button>
          <p className="mt-2 text-mist text-sm">
            {inviteToken ? 'Sign in to accept your invitation.' : 'Welcome back.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-card shadow-card-md p-6">
          <h2 className="text-lg font-semibold text-night mb-5">Sign In</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className={`w-full rounded-xl border px-3 py-2.5 text-night text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.email ? 'border-rose' : 'border-cloud'
                }`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && <p className="mt-1 text-xs text-rose">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-xl border px-3 py-2.5 text-night text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.password ? 'border-rose' : 'border-cloud'
                }`}
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="mt-1 text-xs text-rose">{errors.password.message}</p>}
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
              className="w-full bg-gradient-sage text-white py-3 rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mist mt-5">
          New to My CareCircle?{' '}
          <Link
            to={inviteToken ? `/signup?invite=${inviteToken}` : '/signup'}
            className="text-cloud font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
