import React from 'react';

interface RetroMicIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const RetroMicIcon: React.FC<RetroMicIconProps> = ({
  className = 'w-7 h-7 text-black',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Sound wave bursts on the upper left */}
      <line x1="16" y1="12" x2="21" y2="16" strokeWidth="3.2" />
      <line x1="11" y1="21" x2="17" y2="22" strokeWidth="3.2" />
      <line x1="13" y1="30" x2="19" y2="28" strokeWidth="3.2" />

      {/* Microphone capsule and swivel tilted ~12 degrees */}
      <g transform="rotate(12 36 24)">
        {/* Outer capsule shell */}
        <rect x="25" y="7" width="22" height="30" rx="9" strokeWidth="3.5" />

        {/* Center vertical dividing rib */}
        <line x1="36" y1="9.5" x2="36" y2="34.5" strokeWidth="2.5" />

        {/* Horizontal grille slats */}
        <line x1="28" y1="14" x2="44" y2="14" strokeWidth="2.8" />
        <line x1="26.5" y1="19" x2="45.5" y2="19" strokeWidth="2.8" />
        <line x1="26.5" y1="24" x2="45.5" y2="24" strokeWidth="2.8" />
        <line x1="28" y1="29" x2="44" y2="29" strokeWidth="2.8" />

        {/* Swivel mount / socket under the capsule */}
        <path d="M31 37 c0 3 2.2 4.5 5 4.5 s5 -1.5 5 -4.5" strokeWidth="3.2" />
      </g>

      {/* Vertical stand post */}
      <line x1="36" y1="42.5" x2="36" y2="50" strokeWidth="3.8" />

      {/* Rounded horizontal base */}
      <rect x="17" y="50" width="34" height="6.5" rx="3.25" strokeWidth="3.5" />
    </svg>
  );
};

export default RetroMicIcon;
