import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { CieloModal } from '../ui/CieloModal';
import { supabase } from '../../lib/supabase';
import type { GrupoActividades } from '../../hooks/useAgruparActividades';

interface Props {
    selectedGroupData: GrupoActividades | null;
    onClose: () => void;
}

export function ActividadesGrupoModal({ selectedGroupData, onClose }: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
    const [targetCursoId, setTargetCursoId] = useState<number | null>(null);
    const [targetAsignatura, setTargetAsignatura] = useState<string | null>(null);
    const [targetPeriodo, setTargetPeriodo] = useState<string | null>(null);

    const handleDuplicate = async () => {
        if (!targetCursoId || !targetAsignatura || !targetPeriodo || selectedActivities.size === 0 || !session?.user?.id) return;
        
        setIsDuplicating(true);
        const actsToCopy = state.actividades.filter(a => selectedActivities.has(a.id));
        const targetCurso = state.cursos.find(c => c.id === targetCursoId);
        const shared_course_id = targetCurso?.sharedCourseId || (targetCurso?.grupoId ? `group_${targetCurso.grupoId}` : String(targetCursoId));
        
        const newActs = actsToCopy.map(a => ({
            nombre: a.nombre,
            fecha: a.fecha || new Date().toISOString().split('T')[0],
            periodo: targetPeriodo,
            curso_id: targetCursoId,
            bc_asignados: (a.bcAsignados && a.bcAsignados.length > 0) ? a.bcAsignados : ['BC1'],
            secuencia_id: a.secuenciaId ?? null,
            is_rec: a.isRec ?? false,
            is_producto_final: false,
            user_id: session.user.id,
            asignatura: targetAsignatura,
            shared_course_id: shared_course_id,
            indicador: a.indicador ?? null,
            producto: a.producto ?? null,
            requiere_producto: a.requiereProducto ?? false,
            descripcion: a.descripcion ?? null,
            plan_ficha_id: a.planFichaId ?? null,
            tipo_calendario: a.tipo_calendario || 'actividad',
            hora_inicio: a.hora_inicio ?? null,
            duracion_minutos: a.duracion_minutos ?? null,
            color_calendario: a.color_calendario ?? null
        }));

        try {
            const { data, error } = await supabase.from('actividades').insert(newActs).select();
            if (error) throw error;
            
            if (data && data.length > 0) {
                const mappedNewActs = data.map(row => ({
                    id: row.id as number,
                    nombre: row.nombre as string,
                    cursoId: row.curso_id as number,
                    fecha: row.fecha as string,
                    periodo: row.periodo as string,
                    hora_inicio: row.hora_inicio || undefined,
                    duracion_minutos: row.duracion_minutos || undefined,
                    tipo_calendario: (row.tipo_calendario || 'actividad') as 'actividad' | 'clase',
                    color_calendario: row.color_calendario,
                    bcAsignados: row.bc_asignados || ['BC1'],
                    secuenciaId: row.secuencia_id,
                    planFichaId: row.plan_ficha_id,
                    isRec: row.is_rec,
                    userId: row.user_id,
                    asignatura: row.asignatura,
                    sharedCourseId: row.shared_course_id,
                    indicador: row.indicador,
                    producto: row.producto,
                    requiereProducto: row.requiere_producto,
                    descripcion: row.descripcion,
                    isProductoFinal: row.is_producto_final
                }));

                useAppStore.getState().setAppState(prev => {
                    const existingMap = new Map(prev.actividades.map(a => [a.id, a]));
                    mappedNewActs.forEach(a => existingMap.set(a.id, a as any));
                    return {
                        ...prev,
                        actividades: Array.from(existingMap.values())
                    };
                });
            }

            setSelectedActivities(new Set());
            onClose();
            alert(`${newActs.length} actividad(es) duplicada(s) con éxito.`);
        } catch (error: any) {
            console.error('Error duplicating activities:', error);
            alert(`Error al duplicar las actividades: ${error?.message || 'Error en la base de datos'}`);
        } finally {
            setIsDuplicating(false);
        }
    };

    // Al cambiar de grupo (o cerrarse), limpiar selección
    // No usamos useEffect porque selectedGroupData no cambia mientras está abierto para el mismo grupo, 
    // pero idealmente deberíamos resetearlo si cambia de id. 
    // Por simplicidad, dejamos que el padre desmonte el modal o lo gestione, o reseteamos cuando cambia selectedGroupData
    
    return (
        <CieloModal 
            isOpen={!!selectedGroupData} 
            onClose={onClose}
            className="max-w-4xl"
        >
            {selectedGroupData && (
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-(--ink) tracking-tight">
                                Actividades de {selectedGroupData.cursoName}
                            </h2>
                            <p className="text-sm font-bold text-(--ink-soft)">
                                {selectedGroupData.asignatura} • {selectedGroupData.periodo}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="mb-6 bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">
                            Usar actividades en otros cursos
                        </h3>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-50">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    Curso y Asignatura Destino
                                </label>
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-(--primary) focus:ring-1 focus:ring-(--primary)"
                                    value={targetCursoId && targetAsignatura ? `${targetCursoId}|${targetAsignatura}` : ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setTargetCursoId(null);
                                            setTargetAsignatura(null);
                                        } else {
                                            const [cId, asig] = val.split('|');
                                            setTargetCursoId(Number(cId));
                                            setTargetAsignatura(asig);
                                        }
                                    }}
                                >
                                    <option value="">Selecciona el destino...</option>
                                    {state.cursoDocentes.map(cd => {
                                        const c = state.cursos.find(curso => curso.id === cd.cursoId);
                                        if (!c) return null;
                                        return (
                                            <option key={cd.id} value={`${c.id}|${cd.asignatura}`}>
                                                {c.grado} {c.seccion} • {cd.asignatura}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    Período
                                </label>
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-(--primary) focus:ring-1 focus:ring-(--primary)"
                                    value={targetPeriodo || ''}
                                    onChange={(e) => setTargetPeriodo(e.target.value)}
                                >
                                    <option value="">Período...</option>
                                    <option value="P1">P1</option>
                                    <option value="P2">P2</option>
                                    <option value="P3">P3</option>
                                    <option value="P4">P4</option>
                                </select>
                            </div>
                            <button
                                onClick={handleDuplicate}
                                disabled={selectedActivities.size === 0 || !targetCursoId || !targetAsignatura || !targetPeriodo || isDuplicating}
                                className="flex items-center gap-2 px-4 py-2 bg-(--primary) text-white font-bold rounded-lg shadow-sm hover:bg-(--primary-dark) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Copy size={16} />
                                Duplicar ({selectedActivities.size})
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 w-10">
                                        <input 
                                            type="checkbox"
                                            checked={selectedActivities.size === selectedGroupData.actividades.length && selectedGroupData.actividades.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedActivities(new Set(selectedGroupData.actividades.map(a => a.id)));
                                                } else {
                                                    setSelectedActivities(new Set());
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-(--primary) focus:ring-(--primary)"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Actividad</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Indicador</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedGroupData.actividades.map(act => (
                                    <tr key={act.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox"
                                                checked={selectedActivities.has(act.id)}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedActivities);
                                                    if (e.target.checked) {
                                                        newSet.add(act.id);
                                                    } else {
                                                        newSet.delete(act.id);
                                                    }
                                                    setSelectedActivities(newSet);
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-(--primary) focus:ring-(--primary)"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-slate-900">{act.nombre}</p>
                                            {act.producto && (
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wider">
                                                    Producto: {act.producto}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                                            {act.indicador || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 line-clamp-2">
                                            {act.descripcion || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </CieloModal>
    );
}
