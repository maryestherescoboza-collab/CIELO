import {
    LayoutDashboard, ClipboardList, FileDown, AlertTriangle, Building2, KeyRound, LogOut,
    type LucideIcon
} from 'lucide-react';
import logo from '../../assets/logo.png';

export type SeccionCentro = 'inicio' | 'tareas' | 'boletines' | 'incidencias' | 'centro' | 'codigos';

const NAV_ITEMS: { id: SeccionCentro; label: string; icon: LucideIcon }[] = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'tareas', label: 'Tareas', icon: ClipboardList },
    { id: 'boletines', label: 'Boletines', icon: FileDown },
    { id: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
    { id: 'centro', label: 'Centro', icon: Building2 },
    { id: 'codigos', label: 'Códigos', icon: KeyRound },
];

interface Props {
    active: SeccionCentro;
    onSelect: (section: SeccionCentro) => void;
    onLogout: () => void;
}

export default function CentroSidebar({ active, onSelect, onLogout }: Props) {
    return (
        <aside className="w-65 shrink-0 hidden md:block">
            <div className="sticky top-4 h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-white border border-[#E6E1D8] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E6E1D8] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <img src={logo} alt="CIELO" className="w-12 h-12 object-contain" />
                    </div>
                    <div className="min-w-0 leading-tight">
                        <h1 className="text-[14px] font-semibold text-[#3F3C36] truncate">Panel de Dirección</h1>
                        <p className="text-xs text-[#6B7280] truncate">Centro educativo</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = active === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item.id)}
                                className={`w-full inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                                    isActive
                                        ? 'bg-primary/10 text-primary border border-primary/30'
                                        : 'text-[#6B7280] hover:bg-[#F9F8F6] hover:text-[#3F3C36] border border-transparent'
                                }`}
                            >
                                <Icon size={16} className="shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="px-3 py-3 border-t border-[#E6E1D8]">
                    <button
                        onClick={onLogout}
                        className="w-full inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6B7280] hover:bg-[#F9F8F6] hover:text-[#D93025] transition-colors"
                    >
                        <LogOut size={16} className="shrink-0" />
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    );
}
