import type { NextConfig } from "next";

/** Minimal CSP compatible Next.js (script/style/font/img/connect). Durcir plus tard si besoin — voir docs/SECURITY_HEADERS.md */
function getSecurityHeaders(): { key: string; value: string }[] {
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  const scriptSrc =
    isProd ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
  const headers: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
  ];
  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
    });
  }
  return headers;
}

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: false,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Puppeteer (dev uniquement, pour PDF en local) — ne pas bundler
  serverExternalPackages: ["puppeteer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
