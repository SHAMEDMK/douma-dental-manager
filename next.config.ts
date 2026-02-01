import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactive les logs "GET / 200 in ..." en développement
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
