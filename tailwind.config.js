/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0c",
        surf: "#17171a",
        surf2: "#222226",
        surf3: "#2c2c31",
        line: "#2f2f35",
        tx: "#f2f2f3",
        tx2: "#a1a1a8",
        tx3: "#6e6e76",
        acc: "#3987e5",
        "acc-dim": "#1d3b61",
        good: "#3fb96b",
        bad: "#e66767",
        gold: "#f5c542",
        carbs: "#199e70",
        protein: "#3987e5",
        fat: "#d95926",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "slide-right": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pr-pop": {
          "0%": { transform: "scale(0.3) rotate(-20deg)", opacity: "0" },
          "55%": { transform: "scale(1.15) rotate(6deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
        shine: { "0%,100%": { filter: "drop-shadow(0 0 0 #f5c542)" }, "50%": { filter: "drop-shadow(0 0 14px #f5c542)" } },
      },
      animation: {
        "slide-up": "slide-up 220ms cubic-bezier(.2,.8,.2,1)",
        "slide-right": "slide-right 220ms cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in 160ms ease-out",
        "pr-pop": "pr-pop 520ms cubic-bezier(.2,.8,.2,1) both, shine 1.2s ease-in-out 520ms 2",
      },
    },
  },
  plugins: [],
};
