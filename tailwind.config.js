module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f23',
        surface: '#1a1a35',
        card: '#24243d',
        border: '#2d2d50',
        primary: '#6366f1',
        income: '#22c55e',
        expense: '#ef4444',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
};
