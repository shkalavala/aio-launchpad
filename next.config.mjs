/** @type {import('next').NextConfig} */
// Static export config — produces a fully static `out/` that GitHub Pages can
// serve. Repo base path is supplied at build time:
//   - Local dev: NEXT_PUBLIC_BASE_PATH unset → served at "/"
//   - GitHub Pages: workflow sets NEXT_PUBLIC_BASE_PATH=/<repo>
const repoBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: repoBasePath,
  assetPrefix: repoBasePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
