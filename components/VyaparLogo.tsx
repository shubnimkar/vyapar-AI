/* eslint-disable react/jsx-no-bind */
'use client';

import React, { useState } from 'react';

interface VyaparLogoProps {
  /** 'full' = Digital Concierge lockup, 'compact' = scaled lockup, 'icon' = mark only */
  variant?: 'full' | 'compact' | 'icon';
  /** Height in px — width scales proportionally */
  height?: number;
  className?: string;
}

const DIGITAL_CONCIERGE_LOGO_SRC = '/background-removed.png';

/**
 * Vyapar AI brand logo.
 * Palette: Deep Indigo #0b1a7d · Soft Gold #ffe088 / #735c00
 * Style: Editorial Luxury × Modern Fintech
 */
export default function VyaparLogo({ variant = 'full', height = 48, className = '' }: VyaparLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        height={height}
        width={height}
        fill="none"
        role="img"
        aria-label="Vyapar AI"
        className={className}
      >
        <defs>
          <linearGradient id="vl-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b1a7d" />
            <stop offset="100%" stopColor="#283593" />
          </linearGradient>
          <linearGradient id="vl-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe088" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#vl-mark)" />
        <rect x="10" y="30" width="5" height="10" rx="2" fill="#ffe088" opacity="0.35" />
        <rect x="17" y="24" width="5" height="16" rx="2" fill="#ffe088" opacity="0.55" />
        <rect x="24" y="18" width="5" height="22" rx="2" fill="#ffe088" opacity="0.75" />
        <rect x="31" y="12" width="5" height="28" rx="2" fill="url(#vl-gold)" />
        <path d="M33.5 9 L36.5 13 L30.5 13 Z" fill="#ffe088" />
      </svg>
    );
  }

  const [imgFailed, setImgFailed] = useState(false);

  const InlineCompact = () => {
    const w = Math.round(height * 3.6);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 172 48"
        height={height}
        width={w}
        fill="none"
        role="img"
        aria-label="Vyapar AI"
        className={className}
      >
        <defs>
          <linearGradient id="vlc-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b1a7d" />
            <stop offset="100%" stopColor="#283593" />
          </linearGradient>
          <linearGradient id="vlc-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe088" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>

        {/* Icon mark */}
        <rect width="48" height="48" rx="12" fill="url(#vlc-mark)" />
        <rect x="10" y="30" width="5" height="10" rx="2" fill="#ffe088" opacity="0.35" />
        <rect x="17" y="24" width="5" height="16" rx="2" fill="#ffe088" opacity="0.55" />
        <rect x="24" y="18" width="5" height="22" rx="2" fill="#ffe088" opacity="0.75" />
        <rect x="31" y="12" width="5" height="28" rx="2" fill="url(#vlc-gold)" />
        <path d="M33.5 9 L36.5 13 L30.5 13 Z" fill="#ffe088" />

        {/* Wordmark */}
        <text x="60" y="28" fontFamily="Manrope, system-ui, sans-serif" fontSize="20" fontWeight="800" letterSpacing="-0.5" fill="#0b1a7d">
          VYAPAR
        </text>

        {/* AI pill */}
        <rect x="60" y="34" width="28" height="13" rx="6.5" fill="url(#vlc-gold)" />
        <text x="74" y="44" fontFamily="Manrope, system-ui, sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="1.5" textAnchor="middle" fill="#735c00">
          AI
        </text>
      </svg>
    );
  };

  const InlineFull = () => {
    const w = Math.round(height * 3.9);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 188 56"
        height={height}
        width={w}
        fill="none"
        role="img"
        aria-label="Vyapar AI — Smart Business OS"
        className={className}
      >
        <defs>
          <linearGradient id="vlf-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b1a7d" />
            <stop offset="100%" stopColor="#283593" />
          </linearGradient>
          <linearGradient id="vlf-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe088" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          {/* Subtle glow on the tallest bar */}
          <filter id="vlf-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Icon mark */}
        <rect y="4" width="48" height="48" rx="12" fill="url(#vlf-mark)" />

        {/* Growth bars — ascending heights, tonal gold */}
        <rect x="10" y="34" width="5" height="10" rx="2" fill="#ffe088" opacity="0.30" />
        <rect x="17" y="28" width="5" height="16" rx="2" fill="#ffe088" opacity="0.50" />
        <rect x="24" y="22" width="5" height="22" rx="2" fill="#ffe088" opacity="0.70" />
        <rect x="31" y="16" width="5" height="28" rx="2" fill="url(#vlf-gold)" filter="url(#vlf-glow)" />

        {/* Arrow cap */}
        <path d="M33.5 13 L37 17.5 L30 17.5 Z" fill="#ffe088" />

        {/* Wordmark: VYAPAR */}
        <text x="58" y="30" fontFamily="Manrope, system-ui, sans-serif" fontSize="20" fontWeight="800" letterSpacing="-0.5" fill="#0b1a7d">
          VYAPAR
        </text>

        {/* AI badge pill */}
        <rect x="58" y="36" width="28" height="14" rx="7" fill="url(#vlf-gold)" />
        <text
          x="72"
          y="47"
          fontFamily="Manrope, system-ui, sans-serif"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.5"
          textAnchor="middle"
          fill="#735c00"
        >
          AI
        </text>

        {/* Tagline */}
        <text x="92" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="8.5" fontWeight="500" letterSpacing="0.3" fill="#7a7c7e">
          Smart Business OS
        </text>
      </svg>
    );
  };

  // 'full' and 'compact': render the provided lockup as an image,
  // but fall back to inline SVG when the file is missing.
  if (!imgFailed) {
    return (
      <img
        src={DIGITAL_CONCIERGE_LOGO_SRC}
        alt="Vyapar AI"
        aria-label="Vyapar AI"
        height={height}
        style={{ height, width: 'auto', display: 'block' }}
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return variant === 'compact' ? <InlineCompact /> : <InlineFull />;
}
