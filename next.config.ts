import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's default Server Action body limit (1MB) is too small for a
    // .docx meeting note upload — see extractDocxNoteBody in
    // src/lib/server/docxExtract.ts.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// §9 PWA layer. swSrc is compiled to public/sw.js. Disabled in dev so
// `next dev` doesn't fight the cache with hot-reloaded assets.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
