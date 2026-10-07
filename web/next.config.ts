import type { NextConfig } from "next";

const BACKEND = "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // Spotify's registered redirect URI is the app root, so its OAuth
      // callback (/?code=…&state=… or /?error=…&state=…) is handed to the
      // backend before the landing page can claim it.
      beforeFiles: [
        { source: "/", has: [{ type: "query", key: "state" }, { type: "query", key: "code" }], destination: `${BACKEND}/api/auth/spotify/callback` },
        { source: "/", has: [{ type: "query", key: "state" }, { type: "query", key: "error" }], destination: `${BACKEND}/api/auth/spotify/callback` },
      ],
      afterFiles: [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }],
      fallback: [],
    };
  },
};

export default nextConfig;
