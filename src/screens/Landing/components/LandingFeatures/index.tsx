import React, { useState } from 'react';
import { networkData } from './featureData';
import { FeatureNode } from './FeatureNode';
import { FeatureBranch } from './FeatureBranch';
import { FeatureLine } from './FeatureLine';

export function LandingFeatures() {
  const [isNetworkActive, setIsNetworkActive] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsNetworkActive(false);
      setActiveBranch(null);
    }
  };

  return (
    <section className="py-12 md:py-20 bg-[#FDFBF7] relative overflow-hidden">
      {/* Title */}
      <div className="text-center mb-10 relative z-20">
        <h2 className="text-3xl md:text-5xl font-black text-[#2E3330] tracking-tighter">
          El Ecosistema CIELO
        </h2>
        <p className="text-slate-500 mt-3 md:text-lg max-w-xl mx-auto px-4">
          Descubre todas las herramientas interconectadas que potencian la educación.
        </p>
      </div>

      {/* Swipe Indicator for Mobile */}
      <div className="md:hidden text-center mb-4 text-xs font-medium text-slate-400 flex justify-center items-center gap-2">
        <span>← Desliza para explorar →</span>
      </div>

      {/* Container - Scrollable on mobile */}
      <div 
        className="w-[95%] max-w-350 mx-auto relative z-10 h-137.5 md:h-162.5 rounded-4xl border border-[rgba(46,51,48,0.08)] shadow-sm overflow-x-auto overflow-y-hidden md:overflow-hidden bg-white/60 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onMouseLeave={() => {
          setIsNetworkActive(false);
          setActiveBranch(null);
        }}
      >
        <div 
          className="min-w-225 md:min-w-full w-full h-full relative"
          onClick={handleContainerClick}
        >
          {/* SVG layer for connections (Static rendering, CSS transitions for opacity) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {networkData.branches.map((branch) => (
              <g key={`lines-${branch.id}`}>
                {/* Line from center to branch */}
                <FeatureLine 
                  x1={networkData.center.x}
                  y1={networkData.center.y}
                  x2={branch.x}
                  y2={branch.y}
                  isActive={isNetworkActive}
                />
                
                {/* Lines from branch to children */}
                {branch.children.map((child) => (
                  <FeatureLine 
                    key={`line-${child.id}`}
                    x1={branch.x}
                    y1={branch.y}
                    x2={child.x}
                    y2={child.y}
                    isActive={activeBranch === branch.id}
                    isSub
                  />
                ))}
              </g>
            ))}
          </svg>

          {/* Branch Nodes and Sub-nodes */}
          {networkData.branches.map((branch) => (
            <FeatureBranch
              key={branch.id}
              branch={branch}
              isVisible={isNetworkActive}
              isActive={activeBranch === branch.id}
              isFaded={activeBranch !== null && activeBranch !== branch.id}
              onActivate={() => setActiveBranch(branch.id)}
              onDeactivate={() => setActiveBranch(null)}
              onClick={() => setActiveBranch(activeBranch === branch.id ? null : branch.id)}
            />
          ))}

          {/* Center Node (CIELO) */}
          <FeatureNode 
            x={networkData.center.x}
            y={networkData.center.y}
            label={networkData.center.label}
            isActive={isNetworkActive}
            onActivate={() => setIsNetworkActive(true)}
          />
        </div>
      </div>
    </section>
  );
}
