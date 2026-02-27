import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-sage rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">🌿</span>
          </div>
          <h1 className="text-3xl font-semibold text-charcoal tracking-tight">My Care Circle</h1>
          <p className="mt-2 text-mid text-base">
            Stay in sync with everyone who helps care for someone you love.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-sage text-white py-3 px-6 rounded-xl font-medium text-base hover:bg-sage-light transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-cream-dark text-charcoal py-3 px-6 rounded-xl font-medium text-base hover:bg-border transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  )
}
