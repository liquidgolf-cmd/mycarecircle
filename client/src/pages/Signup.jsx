import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(values) {
    try {
      await signup(values)
      // If arriving from an invite link, return there to accept it.
      // Otherwise go through the normal Willow onboarding.
      navigate(inviteToken ? `/invite/${inviteToken}` : '/onboarding')
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.'
      toast.error(msg)
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
          <h1 className="text-2xl font-semibold text-charcoal">Create your account</h1>
          <p className="mt-1 text-mid text-sm">
            {inviteToken
              ? 'Create a free account to accept your invitation.'
              : 'Free to start, no credit card needed.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-charcoal mb-1">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className={`w-full rounded-lg border px-3 py-2.5 text-charcoal text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.full_name ? 'border-rose' : 'border-border'
                }`}
                {...register('full_name', {
                  required: 'Full name is required',
                  maxLength: { value: 100, message: 'Name must be 100 characters or fewer' },
                })}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-rose">{errors.full_name.message}</p>
              )}
            </div>

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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`w-full rounded-lg border px-3 py-2.5 text-charcoal text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.password ? 'border-rose' : 'border-border'
                }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sage text-white py-3 rounded-xl font-medium text-sm hover:bg-sage-light disabled:opacity-60 transition-colors mt-2"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mid mt-4">
          Already have an account?{' '}
          <Link
            to={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
            className="text-sage font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
