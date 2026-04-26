import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#0F4C35',
          50: '#E8F2ED',
          100: '#C6DDD2',
          200: '#8FBFA8',
          300: '#5AA17E',
          400: '#2D8359',
          500: '#0F4C35',
          600: '#0C3D2A',
          700: '#092E20',
          800: '#061F15',
          900: '#030F0B',
        },
        mint: {
          DEFAULT: '#00C875',
          50: '#E6FFF4',
          100: '#B3FFE0',
          200: '#66FFBF',
          300: '#33FF9E',
          400: '#00FF7D',
          500: '#00C875',
          600: '#009E5D',
          700: '#007545',
          800: '#004B2C',
          900: '#002214',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        body: ['var(--font-instrument)', 'Instrument Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
export default config
