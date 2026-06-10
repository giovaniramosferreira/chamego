/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#ff2957', // Main Nossoday brand pink/red
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        sugar: {
          50: '#fff8f9',  // Soft sweet background
          100: '#ffedf0',
          200: '#ffd6db',
          300: '#ffa3ae',
          400: '#ff7084',
          500: '#ff3d5a',
          600: '#ed1a3c',
          700: '#c80f2c',
          800: '#a50f28',
          900: '#490212', // Dark border red
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
        marker: ['Permanent Marker', 'cursive'],
      },
      animation: {
        'float-hearts': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-10vh) scale(1.2)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
