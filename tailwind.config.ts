/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sakura: {
          50: '#fef5f7',
          100: '#fcb7d1',
          200: '#f8c3ce',
          300: '#f29b4',
          400: '#eb7185',
          500: '#e85d7a',
          600: '#c42b4d',
          700: '#9d1f3a',
          800: '#7a1528',
          900: '#570d1a',
          950: '#3a060d',
        },
        warm: {
          50: '#faf5f6',
          100: '#f0e4e7',
          200: '#d4c4c8',
          300: '#b8a4a9',
          400: '#8c7a7f',
          500: '#6b585d',
          600: '#544448',
          700: '#3e3034',
          800: '#2d2224',
          900: '#22181a',
          925: '#1a1214',
          950: '#0f0a0b',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Microsoft YaHei"',
          '"PingFang SC"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Cascadia Code"',
          '"Fira Code"',
          '"Consolas"',
          'monospace',
        ],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'glass-shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-spring',
      },
    },
  },
  plugins: [],
}
