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
    bg: 'bg-[#EB8847]/5',
    iconBg: 'bg-[#EB8847]/15',
    iconColor: 'text-[#EB8847]',
    labelColor: 'text-[#C26B33]',
    countBg: 'bg-[#EB8847]/12',
    countText: 'text-[#C26B33]',
    border: 'border-[#EB8847]/15',
  },
  yellow: {
    bg: 'bg-[#F5BC5D]/10',
    iconBg: 'bg-[#F5BC5D]/20',
    iconColor: 'text-[#D4A04B]',
    labelColor: 'text-[#B88630]',
    countBg: 'bg-[#F5BC5D]/20',
    countText: 'text-[#B88630]',
    border: 'border-[#F5BC5D]/20',
  },
  green: {
    bg: 'bg-[#7A8D69]/10',
    iconBg: 'bg-[#7A8D69]/15',
    iconColor: 'text-[#7A8D69]',
    labelColor: 'text-[#5A694D]',
    countBg: 'bg-[#7A8D69]/12',
    countText: 'text-[#5A694D]',
    border: 'border-[#7A8D69]/15',
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
        <span className={`text-[11px] font-bold ${c.countText} ${c.countBg} px-1.5 py-0.5 rounded-full min-w-5 text-center`}>
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
