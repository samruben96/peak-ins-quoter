import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for pdfjs-dist and canvas to work properly in API routes
  // This prevents Next.js from bundling these native packages
  serverExternalPackages: [
    "pdfjs-dist",
    "pdf-to-img",
    "canvas",
    "@napi-rs/canvas",
  ],

  // Turbopack configuration (Next.js 16+ default bundler)
  turbopack: {
    // Resolve aliases for server-side rendering
    resolveAlias: {
      // Prevent canvas bundling issues (pdf-to-img uses node-canvas)
      canvas: { browser: "./empty-module.js" },
    },
  },

  // Webpack fallback configuration (when using --webpack flag)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle the worker file
      // The worker will be loaded via dynamic import at runtime
      config.resolve.alias = {
        ...config.resolve.alias,
        // Alias canvas to false for server-side (pdf-to-img uses node-canvas)
        canvas: false,
      };

      // Mark pdfjs-dist worker as external to avoid bundling issues
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          "pdfjs-dist/legacy/build/pdf.worker.mjs":
            "commonjs pdfjs-dist/legacy/build/pdf.worker.mjs",
        });
      }
    }

    return config;
  },
};

export default nextConfig;
