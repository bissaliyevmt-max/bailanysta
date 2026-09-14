import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Драйвер PostgreSQL — нативный Node-модуль. Он не должен попадать
   * в бандлер Next.js: собирать его в один файл незачем и вредно.
   * serverExternalPackages оставляет его обычным серверным require.
   */
  serverExternalPackages: ['pg'],
};

export default nextConfig;
