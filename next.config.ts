import type { NextConfig } from "next";

const publicDataRepository =
  "https://raw.githubusercontent.com/heybadrinath/arrival-atlas-data/main";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/data/:path*",
        destination: `${publicDataRepository}/:path*`,
      },
    ];
  },
};

export default nextConfig;
