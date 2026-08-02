import React from 'react';

interface FlameIconProps {
  size?: number;
  className?: string;
}

const FlameIcon: React.FC<FlameIconProps> = ({ size = 16, className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center cursor-pointer group ${className}`} style={{ width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-1 group-hover:drop-shadow-lg"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" className="group-hover:animate-pulse group-hover:fill-current transition-all duration-300" />
      </svg>
    </div>
  );
};

export default FlameIcon;
