/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'tesseract.js', 'pdf-parse'],
  },
}

module.exports = nextConfig
