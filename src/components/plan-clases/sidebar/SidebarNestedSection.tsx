import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface SidebarNestedSectionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  defaultOpen?: boolean;
  path?: string;
  isActive?: boolean;
  children: React.ReactNode;
}

export default function SidebarNestedSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  path,
  isActive = false,
  children,
}: SidebarNestedSectionProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(defaultOpen ? null : 0);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className="ml-2 rounded-xl overflow-hidden">
      <button
        onClick={() => {
          if (path) navigate(path);
          setIsOpen((v) => !v);
        }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold transition-colors duration-150 ${
          isActive
            ? 'bg-white/80 text-[#2E3330] shadow-[0_1px_3px_rgba(46,51,48,0.06)] border border-[#2E3330]/10'
            : 'text-[#2E3330]/70 hover:bg-white/50 border border-transparent'
        }`}
      >
        <Icon size={13} className="text-[#689C63]/70 shrink-0" />
        <span className="flex-1 text-left truncate">{title}</span>
        {count > 0 && (
          <span className="text-[10px] font-bold text-[#689C63]/60 bg-[#689C63]/8 px-1.5 py-0.5 rounded-full min-w-4.5 text-center">
            {count}
          </span>
        )}
        <ChevronRight
          size={12}
          className="text-[#2E3330]/40 transition-transform duration-200 ease-out shrink-0"
          style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: isOpen && contentHeight !== null ? contentHeight : isOpen ? 'none' : 0 }}
      >
        <div ref={contentRef} className="pl-2 pb-1 flex flex-col gap-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}
