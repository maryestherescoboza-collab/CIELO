import React from 'react';

interface FeatureLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isActive: boolean;
  isSub?: boolean;
}

export const FeatureLine: React.FC<FeatureLineProps> = ({ x1, y1, x2, y2, isActive, isSub }) => {
  return (
    <line
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
      stroke={isSub ? "#8BA177" : "#7A8D69"}
      strokeWidth={isSub ? "1.5" : "2"}
      className="transition-opacity duration-300 ease-in-out"
      style={{
        opacity: isActive ? (isSub ? 0.3 : 0.4) : 0
      }}
    />
  );
};
