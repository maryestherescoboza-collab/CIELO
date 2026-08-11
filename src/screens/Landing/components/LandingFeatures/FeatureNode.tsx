import React from 'react';

interface FeatureNodeProps {
  x: number;
  y: number;
  label: string;
  isActive: boolean;
  onActivate: () => void;
}

export const FeatureNode: React.FC<FeatureNodeProps> = ({ x, y, label, isActive, onActivate }) => {
  return (
    <div
      className="absolute z-30 cursor-pointer"
      onMouseEnter={onActivate}
      onClick={onActivate}
      style={{ 
        left: `${x}%`, 
        top: `${y}%`, 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      <div 
        className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2
          ${isActive 
            ? 'bg-[#2E3330] text-white border-white scale-105 shadow-md' 
            : 'bg-white border-primary text-primary scale-100 hover:scale-105'
          }
        `}
      >
        <span className="font-black text-2xl md:text-4xl tracking-tighter">{label}</span>
      </div>
    </div>
  );
};
