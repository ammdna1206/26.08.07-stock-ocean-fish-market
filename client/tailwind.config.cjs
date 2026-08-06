module.exports = {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Noto Sans TC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ocean: {
          950: '#03152c',
          900: '#062a50',
          800: '#0a4274',
          700: '#0d5685',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
