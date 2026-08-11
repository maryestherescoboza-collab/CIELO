/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "color-1": "#5F9563",
        "color-2": "#79C599",
        "color-3": "#D68253",
        "color-4": "#C63D3D",
        "color-5": "#E8C166",
        "neutral-warm": "#DDD5C8",
        "primary": "#79C599",
        "primary-soft": "#79C59926", // 15% opacity
        "success": "#5F9563",
        "warning-soft": "#E8C16626", // 15% opacity
        "warning": "#E8C166",
        "attention": "#D68253",
        "danger": "#C63D3D",
        "risk": "#E8C166",
        
        // Manteniendo los neutrales sin modificar mucho la estética original,
        // pero eliminando las referencias a la paleta antigua (cielo-high, turf-green, etc).
        "background": "#FDFBF7",
        "on-background": "#8695A7",
        "surface": "#FFFFFF",
        "outline": "#6E8CA0",
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
