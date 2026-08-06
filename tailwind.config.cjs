module.exports = {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#03152c',
          900: '#062a50',
          800: '#0a4274',
          700: '#0d5685',
        },
      },
      fontFamily: {
        display: ['"Noto Sans TC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
