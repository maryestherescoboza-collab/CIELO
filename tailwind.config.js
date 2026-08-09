/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "seashell": "#FEF0E7",
        "red-ochre": "#86A792",
        "jet-black": "#123C47",
        "turf-green": "#86A792",
        "golden-orange": "#F2D6A2",
        "primary": "#86A792",
        "background": "#FEF0E7",
        "on-background": "#8695A7",
        "surface": "#FFFFFF",
        "outline": "#6E8CA0",
        // CIELO official palette
        "cielo-high": "#BFC9A6",
        "cielo-medium": "#ADC762",
        "cielo-low": "#EB8847",
        "cielo-accent1": "#6D8FB9",
        "cielo-accent2": "#F5BC5D",
        "cielo-accent3": "#B87449",
        // Additional UI colors
        "cielo-bg-main": "#FDFBF7",
        "cielo-sidebar": "#EAE4DA"
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
};
