import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Ensure all tide-* classes are always included even when
    // constructed dynamically in template literals
    { pattern: /^(bg|text|border|ring)-(tide)-(blue|blue-lt|blue-dk|teal|teal-lt|teal-dk|slack|slack-lt|slack-dk|amber|amber-lt|red|red-lt|purple|purple-lt)$/ },
    { pattern: /^(bg|text|border)-(red|amber|blue|green)-(50|100|200|300|400|500|600|700|800|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        tide: {
          blue:       '#0a6bbd',
          'blue-lt':  '#deeefb',
          'blue-dk':  '#0c447c',
          teal:       '#00897b',
          'teal-lt':  '#dff2ee',
          'teal-dk':  '#00695c',
          slack:      '#059669',
          'slack-lt': '#d1fae5',
          'slack-dk': '#065f46',
          amber:      '#b45309',
          'amber-lt': '#fef3c7',
          red:        '#dc2626',
          'red-lt':   '#fee2e2',
          purple:     '#534ab7',
          'purple-lt':'#eeedfe',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config