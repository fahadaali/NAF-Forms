import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        // الهوية الأساسية (من الشعار): كحلي · كريمي · بيج
        brand: {
          navy: "#2a3149",
          cream: "#e9f1ec",
          taupe: "#b4a78f",
          taupeDeep: "#9c8c6f",
        },
        // اللون الأساسي (مشتق من الكحلي مع لمسة بنفسجية متناغمة)
        naf: {
          50: "#eef0f7",
          100: "#dbdfee",
          200: "#bcc4dc",
          300: "#94a0c3",
          400: "#6f7da8",
          500: "#5566a6",
          600: "#44528a",
          700: "#3a4470",
          800: "#2f3757",
          900: "#2a3149",
        },
        // ألوان دلالية متناغمة
        ok: "#3f9d78",
        warn: "#c99a4e",
        bad: "#cf6b6b",
        // ألوان تمييز أنواع النماذج
        survey: "#5566a6",
        exam: "#8b7cc8",
        job: "#4fa3a0",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(180,167,143,0.25), 0 8px 30px -8px rgba(68,82,138,0.45)",
        card: "0 1px 2px rgba(16,20,34,0.06), 0 8px 24px -12px rgba(16,20,34,0.12)",
      },
      keyframes: {
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "card-in": "card-in 0.35s cubic-bezier(0.16,1,0.3,1)",
        floaty: "floaty 6s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
