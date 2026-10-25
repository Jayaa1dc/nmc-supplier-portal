/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allows multi-file uploads (up to ~5 x 10 MB) through the registration server action.
    serverActions: { bodySizeLimit: '12mb' },
  },
};
export default nextConfig;
