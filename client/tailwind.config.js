/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ── Fonts ────────────────────────────────────────────────────────────
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },

      // ── Colours ──────────────────────────────────────────────────────────
      colors: {
        // Core palette
        night:       '#0b1620',
        dusk:        '#152435',
        twilight:    '#2d4a6e',
        horizon:     '#3d6b8f',
        mist:        '#7fa8c4',
        cloud:       '#b8d0e0',
        dawn:        '#e8f2f8',
        'warm-white':'#fafcfe',

        // Semantic
        sage: {
          DEFAULT: '#5a8a6e',
          light:   '#8bb89a',
          pale:    '#d4e8db',
        },
        amber: {
          DEFAULT: '#c4874a',
          pale:    '#f5e6d0',
        },
        rose: {
          DEFAULT: '#a06070',
          pale:    '#f0dde2',
        },
        'status-green':  '#4a8c6a',
        'status-yellow': '#c49a3c',
        'status-red':    '#a05858',

        // ── Legacy aliases — keep old class names working ─────────────────
        // Components still using old tokens will pick up the new colours.
        cream:    { DEFAULT: '#e8f2f8', dark: '#d8eaf4' },
        charcoal: '#0b1620',
        mid:      '#7fa8c4',
        border:   '#cddde8',
      },

      // ── Gradients ────────────────────────────────────────────────────────
      backgroundImage: {
        'gradient-night':    'linear-gradient(160deg, #0b1620 0%, #152435 55%, #1e3a4a 100%)',
        'gradient-twilight': 'linear-gradient(135deg, #2d4a6e, #3d6b8f)',
        'gradient-sage':     'linear-gradient(135deg, #5a8a6e, #3d7a5a)',
        'gradient-forest':   'linear-gradient(135deg, #5a8a6e, #2d4a6e)',
        'gradient-ocean':    'linear-gradient(135deg, #152435, #2d4a6e)',
      },

      // ── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        'twilight': '0 4px 16px rgba(45,74,110,0.35)',
        'sage':     '0 4px 20px rgba(90,138,110,0.4)',
        'card':     '0 2px 12px rgba(13,27,42,0.06)',
        'card-md':  '0 4px 20px rgba(13,27,42,0.10)',
      },

      // ── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        'card': '20px',
        'sheet': '28px 28px 0 0',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
