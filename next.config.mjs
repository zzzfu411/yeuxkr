/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    maximumDiskCacheSize: 0
  }
};

export default nextConfig;
