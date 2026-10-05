import { useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useAgruparActividades } from '../../hooks/useAgruparActividades';
import type { GrupoActividades } from '../../hooks/useAgruparActividades';
import { ActividadesGrupoModal } from './ActividadesGrupoModal';

interface Props {
    cursoId?: number; // Opcional, si se provee filtra por curso
    periodo?: string; // Opcional, para la vista de 4 columnas
    hideTitle?: boolean; // Opcional, para ocultar el título en la vista de columnas
}

export function ActividadesPorCursoSection({ cursoId, periodo, hideTitle }: Props) {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const { groups, groupList } = useAgruparActividades();

    let filteredGroupList = groupList;
    if (cursoId) {
        // Si Plantillas pasa un cursoId, lo ideal sería filtrar por él.
        // Pero como Plantillas en la implementación previa mostraba todos, dejaremos que filtre si se desea
        // o si es necesario. (La instrucción decía que muestre lo que Plantillas genera).
        // En este caso, filtraremos si se pasa, para que sea "por curso" real.
        filteredGroupList = filteredGroupList.filter(([_, data]) => data.cursoId === cursoId);
    }
    if (periodo) {
        filteredGroupList = filteredGroupList.filter(([_, data]) => data.periodo === periodo);
    }

    const selectedGroupData: GrupoActividades | null = selectedGroup ? groups[selectedGroup] : null;

    return (
        <div className={hideTitle ? "" : "mt-6 mb-6"}>
            {!hideTitle && (
                <h2 className="text-sm font-black text-(--ink) uppercase tracking-widest mb-3 border-b border-(--border-soft) pb-2 flex justify-between items-end">
                    <span>Actividades por curso</span>
                </h2>
            )}
            
            <div className="flex flex-col gap-2">
                {filteredGroupList.map(([key, data]) => (
                    <button
                        key={key}
                        onClick={() => setSelectedGroup(key)}
                        className="flex items-center justify-between p-3 bg-white border border-(--border-soft) rounded-xl hover:border-(--primary)/30 hover:bg-(--primary)/5 transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-(--primary)/10 flex items-center justify-center text-(--primary)">
                                <BookOpen size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-(--ink)">
                                    Actividades de {data.cursoName}, {data.asignatura} {data.periodo}
                                </h3>
                                <p className="text-xs text-(--ink-soft) font-medium">
                                    {data.actividades.length} {data.actividades.length === 1 ? 'actividad' : 'actividades'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-(--ink-soft)/50" />
                    </button>
                ))}
                
                {filteredGroupList.length === 0 && (
                    <div className="py-5 px-5 bg-(--linen)/30 border border-dashed border-(--border-soft) rounded-xl flex flex-col items-center text-center">
                        <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest mb-1">No hay actividades</p>
                        <p className="text-xs text-(--ink-soft)/70 max-w-sm">No tienes actividades registradas aún para este filtro.</p>
                    </div>
                )}
            </div>

            <ActividadesGrupoModal 
                selectedGroupData={selectedGroupData} 
                onClose={() => setSelectedGroup(null)} 
            />
        </div>
    );
}
