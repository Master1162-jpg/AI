import React, { useId } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'dark',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const shieldGradId = `rbShield-${uid}`;
  const boltGradId = `rbBolt-${uid}`;
  const mainTextGradId = `rbMain-${uid}`;
  const boGradId = `rbBo-${uid}`;
  const glowId = `rbGlow-${uid}`;
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-11' : 'h-8';

  const isDarkSurface = variant === 'dark';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 select-none ${className}`}
      aria-label="RaidenBO"
    >
      <svg
        viewBox="0 0 218 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightClass} w-auto shrink-0`}
        role="img"
        aria-label="RaidenBO Logo"
      >
        <defs>
          <linearGradient id={shieldGradId} x1="4" y1="5" x2="48" y2="47" gradientUnits="userSpaceOnUse">
            {isDarkSurface ? (
              <>
                <stop offset="0%" stopColor="#DDD6FE" />
                <stop offset="52%" stopColor="#C4B5FD" />
                <stop offset="100%" stopColor="#A78BFA" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="52%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#5B21B6" />
              </>
            )}
          </linearGradient>
          <linearGradient id={boltGradId} x1="16" y1="8" x2="36" y2="44" gradientUnits="userSpaceOnUse">
            {isDarkSurface ? (
              <>
                <stop offset="0%" stopColor="#140E24" />
                <stop offset="65%" stopColor="#1B1330" />
                <stop offset="100%" stopColor="#09090D" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#EDE9FE" />
                <stop offset="100%" stopColor="#C4B5FD" />
              </>
            )}
          </linearGradient>
          <linearGradient id={mainTextGradId} x1="56" y1="10" x2="56" y2="38" gradientUnits="userSpaceOnUse">
            {isDarkSurface ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#EAE6F8" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#2E1065" />
                <stop offset="100%" stopColor="#4C1D95" />
              </>
            )}
          </linearGradient>
          <linearGradient id={boGradId} x1="145" y1="10" x2="210" y2="38" gradientUnits="userSpaceOnUse">
            {isDarkSurface ? (
              <>
                <stop offset="0%" stopColor="#DDD6FE" />
                <stop offset="50%" stopColor="#C4B5FD" />
                <stop offset="100%" stopColor="#A78BFA" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6D28D9" />
              </>
            )}
          </linearGradient>
          <filter id={glowId} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2.6"
              floodColor={isDarkSurface ? '#C4B5FD' : '#7C3AED'}
              floodOpacity={isDarkSurface ? '0.32' : '0.28'}
            />
          </filter>
        </defs>

        {/* RaidenBO Geometric Obsidian & Soft-Lavender Lightning Crest */}
        <g filter={`url(#${glowId})`}>
          <path
            d="M25.5 4L44 13.5V33.5L25.5 46L7 33.5V13.5L25.5 4Z"
            fill={`url(#${shieldGradId})`}
          />
          <path
            d="M25.5 7.2L41 15.2V31.8L25.5 42.6L10 31.8V15.2L25.5 7.2Z"
            stroke={isDarkSurface ? '#FFFFFF' : '#EDE9FE'}
            strokeOpacity={isDarkSurface ? '0.45' : '0.38'}
            strokeWidth="1.2"
          />
          {/* Stylized Thunder Bolt R-Slash */}
          <path
            d="M28.6 10.5L15.4 27.2H24.2L21.4 39.5L35.6 22.4H26.4L28.6 10.5Z"
            fill={`url(#${boltGradId})`}
          />
        </g>

        {/* Crisp Dynamic Wordmark: RAIDENBO */}
        <g transform="skewX(-9)">
          <text
            x="58"
            y="34"
            fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="800"
            fontSize="23"
            letterSpacing="0.4"
            fill={`url(#${mainTextGradId})`}
          >
            RAIDEN
          </text>
          <text
            x="154"
            y="34"
            fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="800"
            fontSize="23"
            letterSpacing="0.4"
            fill={`url(#${boGradId})`}
          >
            BO
          </text>
        </g>

        {/* Soft lilac speed underline */}
        <path
          d="M54 39.8H206L201 42H50L54 39.8Z"
          fill={`url(#${boGradId})`}
          fillOpacity={isDarkSurface ? '0.88' : '0.55'}
        />
      </svg>
    </span>
  );
};
