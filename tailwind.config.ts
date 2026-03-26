import type { Config } from "tailwindcss";
// @ts-ignore
import { tokens } from "./lib/design-system/tokens.ts";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        primary:   tokens.colors.primary,
        secondary: tokens.colors.secondary,
        tertiary:  tokens.colors.tertiary,

        // Surface hierarchy (The "No-Line" Rule)
        surface: tokens.colors.surface,
        "on-surface": tokens.colors.onSurface,

        // Semantic
        success:  tokens.colors.success,
        warning:  tokens.colors.warning,
        error:    tokens.colors.error,
        info:     tokens.colors.info,
        neutral:  tokens.colors.neutral,
        financial: tokens.colors.financial,

        // Outline / ghost borders
        outline: tokens.colors.outline,

        // Legacy aliases
        "overdue-red":      "#f5415f",
        "alert-orange":     "#f18a10",
        "background-light": tokens.colors.surface.DEFAULT,
        "background-dark":  "#0f172a",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans:       [...tokens.typography.fontFamily.sans],
        headline:   [...tokens.typography.fontFamily.headline],
        mono:       [...tokens.typography.fontFamily.mono],
        devanagari: [...tokens.typography.fontFamily.devanagari],
      },
      fontSize: {
        xs:   [...tokens.typography.fontSize.xs],
        sm:   [...tokens.typography.fontSize.sm],
        base: [...tokens.typography.fontSize.base],
        lg:   [...tokens.typography.fontSize.lg],
        xl:   [...tokens.typography.fontSize.xl],
        '2xl':[...tokens.typography.fontSize['2xl']],
        '3xl':[...tokens.typography.fontSize['3xl']],
        '4xl':[...tokens.typography.fontSize['4xl']],
        '5xl':[...tokens.typography.fontSize['5xl']],
        '6xl':[...tokens.typography.fontSize['6xl']],
      },
      fontWeight:  tokens.typography.fontWeight,
      lineHeight:  tokens.typography.lineHeight,
      letterSpacing: tokens.typography.letterSpacing,
      spacing:     tokens.spacing,
      boxShadow:   tokens.shadows,
      borderRadius: tokens.borderRadius,
      backdropBlur: {
        sm:  '8px',
        md:  '12px',
        lg:  '20px',
        xl:  '32px',
      },
      screens: {
        tablet:  tokens.breakpoints.tablet,
        desktop: tokens.breakpoints.desktop,
        wide:    tokens.breakpoints.wide,
      },
      transitionDuration: {
        fast: tokens.animation.duration.fast,
        base: tokens.animation.duration.base,
        slow: tokens.animation.duration.slow,
      },
      transitionTimingFunction: {
        'ease-in':     tokens.animation.easing.easeIn,
        'ease-out':    tokens.animation.easing.easeOut,
        'ease-in-out': tokens.animation.easing.easeInOut,
      },
      backgroundImage: {
        // Primary CTA gradient: indigo → container at 135°
        'primary-gradient': 'linear-gradient(135deg, #0b1a7d 0%, #283593 100%)',
        // Prosperity Header gradient
        'prosperity-gradient': 'linear-gradient(135deg, #fae3d5 0%, #fdf3ee 100%)',
        // Subtle surface gradient for hero areas
        'surface-gradient': 'linear-gradient(180deg, #f9f9fb 0%, #f3f3f5 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
