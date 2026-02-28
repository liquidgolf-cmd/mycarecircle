import { useNavigate } from 'react-router-dom'

// Layered hill silhouette — rendered at the bottom of the screen
function LandscapeSVG() {
  return (
    <svg
      viewBox="0 0 400 110"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax slice"
      className="w-full block"
      aria-hidden="true"
    >
      {/* Far hills */}
      <path d="M0 72 Q80 42 180 56 Q280 72 400 46 L400 110 L0 110 Z" fill="#2d4a6e" opacity="0.55" />
      {/* Mid hills */}
      <path d="M0 82 Q100 58 220 70 Q320 82 400 62 L400 110 L0 110 Z" fill="#1e3a4a" />
      {/* Near hills */}
      <path d="M0 92 Q130 74 260 84 Q345 90 400 76 L400 110 L0 110 Z" fill="#152435" />
      {/* Trees — left cluster */}
      <g fill="#0f1f30">
        <polygon points="18,86 27,66 36,86" />
        <polygon points="33,88 43,70 53,88" />
        <polygon points="8,88 15,77 22,88" />
      </g>
      {/* Trees — right cluster */}
      <g fill="#0f1f30">
        <polygon points="318,74 328,54 338,74" />
        <polygon points="335,76 346,58 357,76" />
        <polygon points="353,78 363,62 373,78" />
      </g>
      {/* Lone tree — centre */}
      <g fill="#152435">
        <polygon points="196,76 205,57 214,76" />
      </g>
    </svg>
  )
}

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-night flex flex-col relative overflow-hidden">
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-[8%]  left-[14%]  w-1   h-1   bg-cloud/50 rounded-full" />
        <span className="absolute top-[5%]  left-[44%]  w-1.5 h-1.5 bg-cloud/35 rounded-full" />
        <span className="absolute top-[13%] left-[68%]  w-1   h-1   bg-cloud/45 rounded-full" />
        <span className="absolute top-[4%]  left-[82%]  w-0.5 h-0.5 bg-cloud/65 rounded-full" />
        <span className="absolute top-[19%] left-[28%]  w-0.5 h-0.5 bg-cloud/45 rounded-full" />
        <span className="absolute top-[3%]  left-[55%]  w-0.5 h-0.5 bg-cloud/55 rounded-full" />
        <span className="absolute top-[24%] left-[60%]  w-1   h-1   bg-cloud/30 rounded-full" />
        <span className="absolute top-[9%]  left-[35%]  w-1   h-1   bg-cloud/40 rounded-full" />
        <span className="absolute top-[7%]  left-[90%]  w-1   h-1   bg-cloud/35 rounded-full" />
        <span className="absolute top-[16%] left-[8%]   w-1   h-1   bg-cloud/40 rounded-full" />
      </div>

      {/* Content — vertically centred */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 relative z-10">
        {/* Wordmark */}
        <div className="text-center mb-14">
          <h1 className="font-display text-[2.75rem] leading-tight text-cloud font-medium tracking-wide">
            The CareCircle
          </h1>
          <p className="mt-3 text-mist text-base max-w-xs mx-auto leading-relaxed">
            Stay in sync with everyone who helps care for someone you love.
          </p>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-gradient-sage text-white py-4 px-8 rounded-full font-medium text-base shadow-sage hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full border border-twilight text-cloud py-4 px-8 rounded-full font-medium text-base hover:bg-twilight/30 transition-colors"
          >
            Log In
          </button>
        </div>
      </div>

      {/* Landscape at bottom */}
      <div className="w-full mt-auto relative z-0">
        <LandscapeSVG />
      </div>
    </div>
  )
}
