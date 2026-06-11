/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FAF7F2', 100: '#F3EDE3', 200: '#E8DFD0' },
        ink: { 900: '#1A1714', 600: '#5C554C', 400: '#948C80' },
        wine: { 700: '#B3284F', 600: '#C9355F', 100: '#F7E3E9' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
