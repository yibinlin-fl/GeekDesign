/** @type {import("next").NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  transpilePackages: [
    "@geekdesign/command-system",
    "@geekdesign/design-schema",
    "@geekdesign/renderer-core",
    "@geekdesign/scene-graph",
  ],
};

export default nextConfig;
