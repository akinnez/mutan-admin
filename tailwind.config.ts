import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0f9f4',
          100: '#dcf0e4',
          200: '#bbe2cc',
          300: '#8acbaa',
          400: '#55ad82',
          500: '#329162',
          600: '#22744e',
          700: '#1a5c3f',
          800: '#174a34',
          900: '#0F5132',
          950: '#082d1d',
        },
        gold: {
          50:  '#fdf9ed',
          100: '#f9f0d0',
          200: '#f2de9d',
          300: '#e9c765',
          400: '#D4AF37',
          500: '#c5a028',
          600: '#a8821e',
          700: '#87641b',
          800: '#6f4f1d',
          900: '#5e431c',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 81, 50, 0.08), 0 1px 2px -1px rgba(15, 81, 50, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(15, 81, 50, 0.12), 0 2px 4px -1px rgba(15, 81, 50, 0.08)',
        'modal': '0 20px 60px -10px rgba(15, 81, 50, 0.25)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

export default config
