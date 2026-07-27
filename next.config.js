const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");

// يتيح لـ `next dev` قراءة روابط Cloudflare (D1 و KV) عبر miniflare.
// لازمٌ للدخول الموحّد: الوسيط يقرأ AUTH_KV و DB من getCloudflareContext،
// وبدون هذه التهيئة يفشل كل طلب محليًا. لا بديل عنها بتجاوز الحماية.
initOpenNextCloudflareForDev();

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
