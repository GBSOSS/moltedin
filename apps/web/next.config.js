/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // 使用环境变量，默认指向本地开发服务器
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
