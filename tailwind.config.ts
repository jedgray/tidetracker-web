import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TideTracker brand palette — mirrors the widget CSS vars
        tide: {
          blue:    '#0a6bbd',
          'blue-lt': '#deeefb',
          'blue-dk': '#0c447c',
          teal:    '#00897b',
          'teal-lt': '#dff2ee',
          'teal-dk': '#00695c',
          slack:   '#059669',
          'slack-lt': '#d1fae5',
          'slack-dk': '#065f46',
          amber:   '#b45309',
          'amber-lt': '#fef3c7',
          red:     '#dc2626',
          'red-lt': '#fee2e2',
          purple:  '#534ab7',
          'purple-lt': '#eeedfe',
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
