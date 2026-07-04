/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        tint: 'var(--bg-tint)',
        accent: { DEFAULT: 'var(--accent)', press: 'var(--accent-press)', soft: 'var(--accent-soft)', ink: 'var(--accent-ink)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
      },
      borderColor: { line: 'var(--line)', 'line-2': 'var(--line-2)', 'accent-line': 'var(--accent-line)' },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '22px', btn: '13px', img: '24px' },
      transitionTimingFunction: { brand: 'cubic-bezier(.22,.61,.36,1)' },
    },
  },
  plugins: [],
};
