/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  safelist: [
    {
      pattern:
        /(bg|border|text|hover:bg)-(indigo|red|sky|emerald|teal|green|amber|cyan|orange|slate)-(50|100|200|300|400|500|600|700|800)/,
    },
  ],
};
