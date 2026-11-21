/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        raw: {
          black: '#000000',
          white: '#FFFFFF',
          blue: '#0000FF',
          success: '#008000',
          warning: '#FFA500',
          error: '#FF0000',
          sunken: '#F0F0F0',
          sunkenHover: '#E8E8E8',
          borderDim: '#CCCCCC',
        },
      },
      fontFamily: {
        headline: ['"Archivo Black"', 'sans-serif'],
        body: ['"Work Sans"', 'sans-serif'],
        sans: ['"Work Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderWidth: {
        'thin': '1px',
        'thick': '3px',
        'heavy': '5px',
      },
      borderRadius: {
        'none': '0px',
      },
      boxShadow: {
        'none': 'none',
      },
    },
  },
  plugins: [],
}
