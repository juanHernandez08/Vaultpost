/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 es un módulo nativo: no debe pasar por webpack
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
