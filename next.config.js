/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // better-sqlite3 وحدة أصلية (Node) تُستخدم للتطوير المحلي فقط؛ تُترك خارج
  // التجميع حتى لا يحاول المُجمِّع حزمها (على Workers نستخدم ربط D1 الأصلي).
  serverExternalPackages: ["better-sqlite3"],
};

module.exports = nextConfig;
