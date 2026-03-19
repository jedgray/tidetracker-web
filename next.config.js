/** @type {import('next').NextConfig} */
const nextConfig = {
  // Leaflet needs this for SSR compatibility
  transpilePackages: ['leaflet', 'react-leaflet'],
  images: {
    domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
}

module.exports = nextConfig
