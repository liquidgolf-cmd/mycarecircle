import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const inviteName = searchParams.get('name') || ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { full_name: inviteName } })

  async function onSubmit(values) {
    try {
      await signup(values)
      navigate(inviteToken ? `/invite/${inviteToken}` : '/onboarding')
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.'
      toast.error(msg)
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
            {inviteToken ? 'Create a free account to accept your invitation.' : 'Free to start, no credit card needed.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-card shadow-card-md p-6">
          <h2 className="text-lg font-semibold text-night mb-5">Create Account</h2>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            <div>
              <label htmlFor="full_name" className="block text-xs font-medium text-mist mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className={`w-full rounded-xl border px-3 py-2.5 text-night text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.full_name ? 'border-rose' : 'border-cloud'
                }`}
                {...register('full_name', {
                  required: 'Full name is required',
                  maxLength: { value: 100, message: 'Name must be 100 characters or fewer' },
                })}
              />
              {errors.full_name && <p className="mt-1 text-xs text-rose">{errors.full_name.message}</p>}
            </div>

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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`w-full rounded-xl border px-3 py-2.5 text-night text-sm outline-none focus:ring-2 focus:ring-sage transition ${
                  errors.password ? 'border-rose' : 'border-cloud'
                }`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.password && <p className="mt-1 text-xs text-rose">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-sage text-white py-3 rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity mt-2"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mist mt-5">
          Already have an account?{' '}
          <Link
            to={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
            className="text-cloud font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
