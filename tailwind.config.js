/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        couple: {
          pink: '#ff6b8b',
          rose: '#ff85a2',
          blush: '#ffd1dc',
          peach: '#ffaaa6',
          cream: '#fff9f6',
          mint: '#2ed573',
          yellow: '#ffa502',
          purple: '#9b59b6',
          sky: '#70a1ff'
        }
      },
      fontFamily: {
        cute: ['Fredoka', 'Quicksand', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
