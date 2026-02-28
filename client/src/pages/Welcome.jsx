import { useNavigate } from 'react-router-dom'

// ── Pre-generate star data at module level (stable across renders) ──────────
const STARS = Array.from({ length: 120 }, () => {
  const size    = (Math.random() * 2.5 + 0.5).toFixed(1)
  const minOp   = (Math.random() * 0.3 + 0.1).toFixed(2)
  const maxOp   = (Math.random() * 0.5 + 0.5).toFixed(2)
  return {
    size:  `${size}px`,
    left:  `${(Math.random() * 100).toFixed(1)}%`,
    top:   `${(Math.random() * 65).toFixed(1)}%`,
    dur:   `${(Math.random() * 4 + 2).toFixed(1)}s`,
    delay: `${(Math.random() * 5).toFixed(1)}s`,
    minOp,
    maxOp,
  }
})

// ── Detailed SVG landscape: mountains, trees, lake, mist ────────────────────
function LandscapeSVG() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
      style={{ height: '55%' }}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wc-mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a3850" />
          <stop offset="100%" stopColor="#0d2035" />
        </linearGradient>
        <linearGradient id="wc-mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1e4060" />
          <stop offset="100%" stopColor="#0d1e30" />
        </linearGradient>
        <linearGradient id="wc-tree" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a3828" />
          <stop offset="100%" stopColor="#0d1e18" />
        </linearGradient>
        <linearGradient id="wc-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a3060" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a1520" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="wc-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#b8d0e0" stopOpacity="0" />
          <stop offset="50%"  stopColor="#7fa8c4" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#b8d0e0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wc-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#d4c8a0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#d4c8a0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Far mountains */}
      <path
        d="M0,220 L80,140 L160,180 L240,100 L320,155 L400,120 L480,160 L560,90 L640,145 L720,110 L800,150 L880,95 L960,140 L1040,115 L1120,155 L1200,130 L1200,400 L0,400 Z"
        fill="url(#wc-mtn1)" opacity="0.7"
      />
      {/* Mid mountains */}
      <path
        d="M0,260 L100,190 L200,230 L300,175 L400,215 L500,170 L600,205 L700,185 L800,220 L900,180 L1000,215 L1100,195 L1200,210 L1200,400 L0,400 Z"
        fill="url(#wc-mtn2)" opacity="0.85"
      />
      {/* Tree line — left */}
      <path
        d="M0,285 L20,265 L30,280 L45,250 L55,270 L70,245 L80,265 L95,240 L108,260 L120,238 L130,258 L145,235 L155,255 L170,232 L180,252 L195,245 L210,230 L220,248 L235,228 L245,246 L260,226 L270,244 L285,224 L295,244 L310,400 L0,400 Z"
        fill="url(#wc-tree)"
      />
      {/* Tree line — right */}
      <path
        d="M890,400 L900,250 L912,268 L924,245 L936,262 L948,242 L960,260 L972,238 L984,258 L996,236 L1008,255 L1020,234 L1032,253 L1044,232 L1056,250 L1068,242 L1080,228 L1092,248 L1104,230 L1116,246 L1128,228 L1140,245 L1152,226 L1164,244 L1176,230 L1188,248 L1200,235 L1200,400 Z"
        fill="url(#wc-tree)"
      />
      {/* Water / lake surface */}
      <path
        d="M0,310 Q150,298 300,308 Q450,318 600,305 Q750,295 900,308 Q1050,318 1200,310 L1200,400 L0,400 Z"
        fill="url(#wc-water)"
      />
      {/* Moon reflection */}
      <ellipse cx="820" cy="350" rx="12" ry="40" fill="url(#wc-reflect)" opacity="0.6" />
      {/* Mist bands */}
      <rect x="-50" y="278" width="1300" height="30" fill="url(#wc-mist)" rx="15" />
      <rect x="-50" y="295" width="1300" height="20" fill="url(#wc-mist)" rx="10" opacity="0.6" />
      {/* Water shimmer */}
      <line x1="200" y1="325" x2="260" y2="325" stroke="rgba(184,208,224,0.12)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="350" y1="332" x2="430" y2="332" stroke="rgba(184,208,224,0.08)" strokeWidth="1"   strokeLinecap="round" />
      <line x1="500" y1="320" x2="560" y2="320" stroke="rgba(184,208,224,0.1)"  strokeWidth="1.5" strokeLinecap="round" />
      <line x1="700" y1="328" x2="760" y2="328" stroke="rgba(184,208,224,0.09)" strokeWidth="1"   strokeLinecap="round" />
    </svg>
  )
}

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(185deg, #080f18 0%, #0d1b2a 20%, #152a42 45%, #1e3d5a 65%, #2d5a6e 80%, #3d6b5a 92%, #4a7a5e 100%)',
      }}
    >
      {/* ── Stars ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: s.size,
              height: s.size,
              left: s.left,
              top: s.top,
              '--min-op': s.minOp,
              '--max-op': s.maxOp,
              animation: `twinkle ${s.dur} ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* ── Moon ── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '12%',
          right: '18%',
          width: '48px',
          height: '48px',
          background: 'radial-gradient(circle at 35% 40%, #f8f4e8, #d4c8a0)',
          animation: 'moonGlow 8s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* ── SVG Landscape ── */}
      <LandscapeSVG />

      {/* ── Atmospheric glow at horizon ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '35%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: '120px',
          background: 'radial-gradient(ellipse, rgba(90,138,110,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        aria-hidden="true"
      />

      {/* ── Mist layer 1 ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '38%',
          left: '-10%',
          right: '-10%',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(127,168,196,1)',
          filter: 'blur(12px)',
          '--op': '0.08',
          animation: 'mistDrift 25s ease-in-out infinite',
          animationDelay: '0s',
        }}
        aria-hidden="true"
      />

      {/* ── Mist layer 2 ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '34%',
          left: '-10%',
          right: '-10%',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(90,138,110,1)',
          filter: 'blur(12px)',
          '--op': '0.06',
          animation: 'mistDrift 32s ease-in-out infinite',
          animationDelay: '8s',
        }}
        aria-hidden="true"
      />

      {/* ── Dark overlay — makes bottom text legible ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(8,15,24,0.2) 0%, rgba(13,27,42,0.3) 30%, rgba(13,27,42,0.0) 55%, rgba(8,15,24,0.6) 80%, rgba(8,15,24,0.92) 100%)',
        }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div
        className="relative z-10 flex flex-col min-h-screen"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Wordmark */}
        <div
          className="pt-12 px-8 sm:px-10"
          style={{ animation: 'fadeDown 0.8s cubic-bezier(0.4,0,0.2,1) 0.3s both' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 flex items-center justify-center text-lg rounded-[10px] shrink-0"
              style={{
                background: 'linear-gradient(135deg, #5a8a6e, #2d4a6e)',
                boxShadow: '0 4px 16px rgba(90,138,110,0.35)',
              }}
            >
              🌿
            </div>
            <span
              className="text-xl font-medium tracking-tight"
              style={{ fontFamily: "'Lora', Georgia, serif", color: '#fafcfe' }}
            >
              The CareCircle
            </span>
          </div>
        </div>

        {/* Hero — anchored to bottom */}
        <div className="flex-1 flex flex-col justify-end px-8 sm:px-10 pb-10">

          <p
            className="text-xs font-medium uppercase mb-4"
            style={{
              color: '#8bb89a',
              letterSpacing: '0.14em',
              animation: 'fadeUp 0.7s cubic-bezier(0.4,0,0.2,1) 0.7s both',
            }}
          >
            Family Caregiver Coordination
          </p>

          <h1
            className="font-display font-normal leading-tight mb-5"
            style={{
              fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
              letterSpacing: '-0.02em',
              color: '#fafcfe',
              animation: 'fadeUp 0.7s cubic-bezier(0.4,0,0.2,1) 0.9s both',
            }}
          >
            Stay connected<br />
            around the people<br />
            you love{' '}
            <em className="italic" style={{ color: '#a8c8b4' }}>most</em>
          </h1>

          <p
            className="text-sm font-light leading-7 max-w-sm mb-10"
            style={{
              color: '#b8d0e0',
              animation: 'fadeUp 0.7s cubic-bezier(0.4,0,0.2,1) 1.1s both',
            }}
          >
            A calm, shared space for families navigating caregiving together —
            care updates, medications, and peace of mind, all in one place.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col gap-3"
            style={{ animation: 'fadeUp 0.7s cubic-bezier(0.4,0,0.2,1) 1.3s both' }}
          >
            <button
              onClick={() => navigate('/signup')}
              className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-full text-white text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #5a8a6e 0%, #3d7a5a 100%)',
                boxShadow: '0 4px 20px rgba(90,138,110,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
                letterSpacing: '0.01em',
              }}
            >
              Get Started — It&apos;s Free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center py-4 px-8 rounded-full text-sm font-normal transition-all"
              style={{
                border: '1.5px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                color: '#fafcfe',
                letterSpacing: '0.01em',
              }}
            >
              Log In to Your Circle
            </button>
          </div>

          {/* Trust line */}
          <p
            className="text-center mt-5"
            style={{
              fontSize: '0.7rem',
              color: 'rgba(184,208,224,0.5)',
              fontWeight: 300,
              letterSpacing: '0.03em',
              animation: 'fadeUp 0.7s cubic-bezier(0.4,0,0.2,1) 1.5s both',
            }}
          >
            No ads · Private by design · Your family&apos;s data stays yours
          </p>
        </div>
      </div>
    </div>
  )
}
