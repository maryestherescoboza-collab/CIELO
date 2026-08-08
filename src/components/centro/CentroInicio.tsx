import { useMemo } from 'react';
import { GraduationCap, Users, ClipboardList, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { Centro } from '../../types';

interface Props {
    centroId: string;
    centro: Centro;
}

export default function CentroInicio({ centroId, centro }: Props) {
    const state = useAppStore(s => s.state);

    const cursosCentro = useMemo(() => {
        const seen = new Set<string>();
        return (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .filter(c => {
                const key = c.sharedCourseId || String(c.id);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [state.cursos, centroId]);

    const docentesCentro = useMemo(
        () => (state.perfiles || []).filter(p => p.centro_id === centroId),
        [state.perfiles, centroId]
    );

    const tareasPendientes = useMemo(() =>
        (state.tareas || [])
            .filter(t => t.centroId === centroId && t.estado !== 'cancelada')
            .filter(t => {
                const asignaciones = t.asignaciones || [];
                return asignaciones.length === 0 || !asignaciones.every(a => a.estado === 'completada');
            }).length,
        [state.tareas, centroId]
    );

    const centroSharedIds = useMemo(() => {
        const set = new Set<string>();
        (state.cursos || [])
            .filter(c => c.centroId === centroId)
            .forEach(c => { if (c.sharedCourseId) set.add(c.sharedCourseId); });
        return set;
    }, [state.cursos, centroId]);

    const incidenciasCentro = useMemo(() =>
        (state.incidencias || []).filter(i => centroSharedIds.has(i.sharedCourseId || '')),
        [state.incidencias, centroSharedIds]
    );

    const cards: { label: string; valor: number; icon: LucideIcon; color: string }[] = [
        { label: 'Cursos', valor: cursosCentro.length, icon: GraduationCap, color: 'bg-[#6F94AF]/10 text-[#6F94AF]' },
        { label: 'Docentes', valor: docentesCentro.length, icon: Users, color: 'bg-[#EB8847]/10 text-[#A34B22]' },
        { label: 'Tareas pendientes', valor: tareasPendientes, icon: ClipboardList, color: 'bg-[#F5BC5D]/20 text-[#8A651F]' },
        { label: 'Incidencias', valor: incidenciasCentro.length, icon: AlertTriangle, color: 'bg-[#D93025]/10 text-[#D93025]' },
    ];

    return (
        <section className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] overflow-hidden">
            <header className="px-5 py-3.5 border-b border-[#E6E1D8] flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center text-[#6F94AF] shrink-0">
                    <GraduationCap size={16} />
                </span>
                <div>
                    <h2 className="text-[15px] font-semibold text-[#3F3C36]">Inicio</h2>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Resumen general de {centro.nombre}</p>
                </div>
            </header>

            <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-xl bg-white border border-[#E6E1D8] p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[12px] font-medium text-[#6B7280]">{card.label}</p>
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                                    <Icon size={15} />
                                </span>
                            </div>
                            <p className="mt-2 text-[24px] font-bold text-[#3F3C36] leading-none">{card.valor}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
