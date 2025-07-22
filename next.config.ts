import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // This is to allow connections from the development environment (Firebase Studio)
  allowedDomains: ['https://*.cloudworkstations.dev'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
