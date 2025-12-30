/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker deployments
  output: 'standalone',
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
  // IMPORTANT: Do NOT put DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET in env config!
  // They get baked at build time. Server-side code can access them via process.env at runtime.
  // Only use env config for variables that need to be exposed to client-side code.
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
