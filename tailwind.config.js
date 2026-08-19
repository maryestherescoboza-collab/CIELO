/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New CIELO Artisan Palette
        "olive-branch": "#BFC9A6",
        "herb-garden": "#7A8D69",
        "french-blue": "#6D8FB9",
        "clementine": "#EB8847",
        "calendula": "#F5BC5D",
        "sicilian-sky": "#B8CADC",
        "terra-cotta": "#B87449",
        "linen": "#EAE4DA",
        "ink": "#2E3330",
        "background": "#F8F3ED",

        // Semantic bindings mapped to new palette
        "color-1": "#BFC9A6",
        "color-2": "#7A8D69",
        "color-3": "#EB8847",
        "color-4": "#B87449",
        "color-5": "#F5BC5D",
        "neutral-warm": "#EAE4DA",
        "primary": "#6D8FB9",
        "primary-soft": "#6D8FB926",
        "success": "#7A8D69",
        "warning-soft": "#F5BC5D26",
        "warning": "#F5BC5D",
        "attention": "#EB8847",
        "danger": "#E7363C",
        "risk": "#E7363C",
        
        "on-background": "#2E3330",
        "surface": "#FFFFFF",
        "outline": "rgba(46, 51, 48, 0.12)",
        "cielo-bg-main": "#F8F3ED",
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
