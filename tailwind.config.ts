import type { Config } from "tailwindcss";
import { tokens } from "./lib/design-system/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        "overdue-red": "#f5415f",
        "alert-orange": "#f18a10",
        "background-light": "#f8f9fb",
        "background-dark": "#0f172a",
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
        neutral: tokens.colors.neutral,
        financial: tokens.colors.financial,
        // Keep existing CSS variables for backward compatibility
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: [...tokens.typography.fontFamily.sans],
        devanagari: [...tokens.typography.fontFamily.devanagari],
        "display": ["Public Sans", "sans-serif"],
      },
      fontSize: {
        xs: [...tokens.typography.fontSize.xs],
        sm: [...tokens.typography.fontSize.sm],
        base: [...tokens.typography.fontSize.base],
        lg: [...tokens.typography.fontSize.lg],
        xl: [...tokens.typography.fontSize.xl],
        '2xl': [...tokens.typography.fontSize['2xl']],
        '3xl': [...tokens.typography.fontSize['3xl']],
        '4xl': [...tokens.typography.fontSize['4xl']],
      },
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      spacing: tokens.spacing,
      boxShadow: tokens.shadows,
      borderRadius: tokens.borderRadius,
      screens: {
        tablet: tokens.breakpoints.tablet,
        desktop: tokens.breakpoints.desktop,
        wide: tokens.breakpoints.wide,
      },
      transitionDuration: {
        fast: tokens.animation.duration.fast,
        base: tokens.animation.duration.base,
        slow: tokens.animation.duration.slow,
      },
      transitionTimingFunction: {
        'ease-in': tokens.animation.easing.easeIn,
        'ease-out': tokens.animation.easing.easeOut,
        'ease-in-out': tokens.animation.easing.easeInOut,
      },
    },
  },
  plugins: [],
};
export default config;
