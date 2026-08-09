import React from 'react';
import type { FeatureBranchType } from './featureData';

interface FeatureBranchProps {
  branch: FeatureBranchType;
  isActive: boolean;
  isFaded: boolean;
  isVisible: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onClick: () => void;
}

export const FeatureBranch: React.FC<FeatureBranchProps> = ({
  branch,
  isActive,
  isFaded,
  isVisible,
  onActivate,
  onDeactivate,
  onClick
}) => {
  return (
    <>
      {/* Sub-nodes (only shown if isActive) */}
      {branch.children.map((child) => (
        <div
          key={child.id}
          className="absolute transition-all duration-300 ease-in-out flex items-center justify-center z-10"
          style={{
            left: `${child.x}%`,
            top: `${child.y}%`,
            opacity: isActive ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0.8})`,
            pointerEvents: isActive ? 'auto' : 'none'
          }}
        >
          <div className="px-3 py-1.5 bg-white/90 rounded-full border border-[rgba(46,51,48,0.1)] shadow-sm text-xs md:text-sm text-[#5F665E] font-medium whitespace-nowrap transition-colors hover:bg-white hover:text-[#ADC762] hover:border-[#ADC762]/30 hover:shadow-md cursor-default">
            {child.label}
          </div>
        </div>
      ))}

      {/* Main Branch Node */}
      <div
        className="absolute transition-all duration-300 ease-in-out cursor-pointer z-20"
        style={{
          left: `${branch.x}%`,
          top: `${branch.y}%`,
          opacity: isVisible ? (isFaded ? 0.4 : 1) : 0,
          transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.8})`,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
        onMouseEnter={onActivate}
        onMouseLeave={onDeactivate}
        onClick={onClick}
      >
        <div 
          className={`px-5 py-2.5 md:px-6 md:py-3 rounded-full border text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-300
            ${isActive 
              ? 'bg-[#ADC762] border-[#ADC762] text-white shadow-md scale-105' 
              : 'bg-white border-[rgba(46,51,48,0.1)] text-[#2E3330] shadow-sm hover:border-[#ADC762]/50 hover:scale-105'
            }
          `}
        >
          {branch.label}
        </div>
      </div>
    </>
  );
};
