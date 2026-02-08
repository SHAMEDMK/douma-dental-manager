import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactive les logs "GET / 200 in ..." en développement
  logging: {
    incomingRequests: false,
  },
  // Autorise 127.0.0.1 en dev (E2E Playwright) pour éviter le warning "Cross origin request detected"
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
