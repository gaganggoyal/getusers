import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The giveaway widget must be embeddable on any advertiser site.
      // (The route itself also sets `frame-ancestors *` on its response.)
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      // Everything else is frame-protected against clickjacking.
      {
        source: "/((?!embed/|embed.js).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
