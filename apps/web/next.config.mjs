/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@geekdesign/command-system",
    "@geekdesign/design-schema",
    "@geekdesign/renderer-core",
    "@geekdesign/scene-graph",
  ],
};

export default nextConfig;
