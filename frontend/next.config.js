/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      (process.env.PORT === '3005' || process.env.NODE_ENV === 'production'
        ? 'http://localhost:5005'
        : 'http://localhost:5000');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
