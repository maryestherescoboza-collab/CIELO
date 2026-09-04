import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  color: 'orange' | 'yellow' | 'green';
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const COLOR_MAP = {
  orange: {
    bg: 'bg-[#FFF3E6]',
    iconBg: 'bg-[#F5A623]/15',
    iconColor: 'text-[#D4841A]',
    labelColor: 'text-[#9A6520]',
    countBg: 'bg-[#F5A623]/12',
    countText: 'text-[#B8841A]',
    border: 'border-[#F5A623]/15',
  },
  yellow: {
    bg: 'bg-[#FFF9E6]',
    iconBg: 'bg-[#E8C840]/15',
    iconColor: 'text-[#B89A20]',
    labelColor: 'text-[#8A7418]',
    countBg: 'bg-[#E8C840]/12',
    countText: 'text-[#9A8420]',
    border: 'border-[#E8C840]/15',
  },
  green: {
    bg: 'bg-[#EEF6EB]',
    iconBg: 'bg-[#689C63]/15',
    iconColor: 'text-[#4A7A46]',
    labelColor: 'text-[#3D6639]',
    countBg: 'bg-[#689C63]/12',
    countText: 'text-[#4A7A46]',
    border: 'border-[#689C63]/15',
  },
} as const;

export default function SidebarSection({
  title,
  icon: Icon,
  count,
  color,
  defaultOpen = false,
  children,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(defaultOpen ? null : 0);
  const c = COLOR_MAP[color];

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden transition-colors duration-200`}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 ${c.bg} transition-colors duration-150 hover:brightness-[0.97]`}
      >
        <span className={`w-6 h-6 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={13} className={c.iconColor} />
        </span>
        <span className={`text-[12.5px] font-bold ${c.labelColor} flex-1 text-left`}>
          {title}
        </span>
        <span className={`text-[11px] font-bold ${c.countText} ${c.countBg} px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
          {count}
        </span>
        <ChevronRight
          size={14}
          className={`${c.labelColor} transition-transform duration-200 ease-out shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: isOpen && contentHeight !== null ? contentHeight : isOpen ? 'none' : 0 }}
      >
        <div ref={contentRef} className="px-2 pb-2 pt-1 flex flex-col gap-0.5">
          {count === 0 ? (
            <p className="text-[11px] text-[#2E3330]/35 px-2 py-2 italic">
              Sin elementos
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
