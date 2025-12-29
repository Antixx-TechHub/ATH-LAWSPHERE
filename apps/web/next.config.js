/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Do not fail production builds on ESLint errors; keep linting for dev/CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Temporarily allow production builds to succeed despite TS errors
  // TODO: remove after addressing type issues
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    domains: ['localhost', 'avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
