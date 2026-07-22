/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // عدم تجميع Prisma في webpack حتى يحلّه OpenNext بنسخة workerd (محرّك WASM)
  // بدل نسخة Node التي تعتمد على نظام الملفات.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1"],
};

module.exports = nextConfig;
