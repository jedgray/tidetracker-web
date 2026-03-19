/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
  // Ensure all routes are treated as dynamic — prevents Prisma being
  // called at build time when DATABASE_URL is not available.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig