/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployments
  output: "standalone",

  // Typed routes
  typedRoutes: false,

  // External packages for server components
  serverExternalPackages: [],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    root: "../..",
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.agentcut.ai",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Rewrites for API proxy in development
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/backend/:path*",
            destination: `${process.env.API_URL ?? "http://localhost:8000"}/:path*`,
          },
        ]
      : [];
  },

  // Webpack config
  webpack(config) {
    // Support for audio/video files imported in components
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
