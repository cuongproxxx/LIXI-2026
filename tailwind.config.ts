import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        festive: {
          red: "#8f1d20",
          "red-dark": "#6f1318",
          gold: "#d2a44a",
          "gold-light": "#f1d89a",
          cream: "#fff7e6",
          ink: "#2e2420"
        }
      },
      boxShadow: {
        "envelope-soft": "0 18px 38px rgba(143, 29, 32, 0.2)",
        "card-soft": "0 10px 30px rgba(70, 40, 25, 0.12)"
      },
      keyframes: {
        floatEnvelope: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        grainDrift: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-8%, -5%, 0)" }
        },
        confettiFall: {
          "0%": { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translate3d(var(--confetti-x), 118px, 0) rotate(var(--confetti-r))",
            opacity: "0"
          }
        },
        flapOpen: {
          "0%": { transform: "rotateX(0deg)" },
          "100%": { transform: "rotateX(-168deg)" }
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(210, 164, 74, 0.45)" },
          "60%": { boxShadow: "0 0 0 12px rgba(210, 164, 74, 0)" }
        }
      },
      animation: {
        "float-envelope": "floatEnvelope 4.5s ease-in-out infinite",
        "grain-drift": "grainDrift 18s linear infinite alternate",
        "flap-open": "flapOpen 700ms cubic-bezier(0.2, 0.9, 0.2, 1) forwards",
        "pulse-gold": "pulseGold 1.8s ease-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
