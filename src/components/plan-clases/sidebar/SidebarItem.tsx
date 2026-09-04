import { useNavigate } from 'react-router-dom';

interface SidebarItemProps {
  label: string;
  path: string;
  isActive: boolean;
  depth?: number;
}

export default function SidebarItem({ label, path, isActive, depth = 0 }: SidebarItemProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150 flex items-center gap-2 group ${
        depth > 0 ? 'ml-3' : ''
      } ${
        isActive
          ? 'bg-white/80 text-[#2E3330] shadow-[0_1px_3px_rgba(46,51,48,0.06)] border border-[#2E3330]/10'
          : 'text-[#2E3330]/60 hover:text-[#2E3330]/80 hover:bg-white/50'
      }`}
    >
      {depth > 0 && (
        <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
