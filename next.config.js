/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/dev.db'],
    },
  },
}

module.exports = nextConfig
