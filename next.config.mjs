/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pg usa módulos de Node (net/tls): no debe pasar por webpack
    serverComponentsExternalPackages: ['pg'],
  },
};

export default nextConfig;
