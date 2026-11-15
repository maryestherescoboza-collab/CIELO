import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Bell, Link, SquareCheck, X, CheckCheck } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
    showNotifs: boolean;
    notificaciones: Notification[];
    onMarkNotifyRead?: (id: number) => void;
    onCompleteTarea?: (tareaId: string) => void;
    onClose?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    showNotifs,
    notificaciones,
    onMarkNotifyRead,
    onCompleteTarea,
    onClose
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 1. Gestión de eventos globales: Click Outside y tecla Escape (Accesibilidad DX/UX)
    useEffect(() => {
        if (!showNotifs) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;

            const btnAlertas = document.getElementById('btn-alertas-header');
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                (!btnAlertas || !btnAlertas.contains(target))
            ) {
                onClose?.();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showNotifs, onClose]);

    // 2. Memorización de filtros para evitar re-computaciones en cada render
    const notificacionesGenerales = useMemo(() => {
        return notificaciones.filter((n) => n.tipo !== 'tarea');
    }, [notificaciones]);

    const tareasInstitucionales = useMemo(() => {
        return notificaciones.filter((n) => n.tipo === 'tarea' && Boolean(n.tareaId));
    }, [notificaciones]);

    const hayGeneralesSinLeer = useMemo(() => {
        return notificacionesGenerales.some((n) => !n.leida);
    }, [notificacionesGenerales]);

    const marcarTodasLeidas = useCallback(() => {
        if (!onMarkNotifyRead) return;
        notificacionesGenerales.forEach((n) => {
            if (!n.leida) {
                onMarkNotifyRead(n.id);
            }
        });
    }, [notificacionesGenerales, onMarkNotifyRead]);

    if (!showNotifs) return null;

    return (
        <aside
            ref={dropdownRef}
            role="dialog"
            aria-label="Centro de actividad y alertas"
            className="absolute top-16 right-4 md:right-16 w-84 sm:w-96 bg-white rounded-(--radius-lg) shadow-xl border border-(--border-soft) p-4 sm:p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
            {/* Encabezado del Centro de Actividad */}
            <div className="flex items-center justify-between border-b border-(--border-soft) pb-3 mb-3.5">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-(--ink) uppercase tracking-widest">
                        Centro de Actividad
                    </h3>
                    {hayGeneralesSinLeer && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/50 transition-colors cursor-pointer"
                    aria-label="Cerrar panel de alertas"
                    title="Cerrar (Esc)"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* SECCIÓN NOTIFICACIONES GENERALES */}
                {notificacionesGenerales.length > 0 && (
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest">
                                Notificaciones
                            </p>
                            {hayGeneralesSinLeer && (
                                <button
                                    type="button"
                                    className="text-xs font-bold text-(--primary) hover:underline uppercase inline-flex items-center gap-1 cursor-pointer"
                                    onClick={marcarTodasLeidas}
                                >
                                    <CheckCheck size={12} />
                                    <span>Leídas</span>
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            {notificacionesGenerales.slice(0, 10).map((n) => {
                                const isVinculacion = n.tipo === 'solicitud_vinculacion';
                                const isTarea = n.tipo === 'tarea' && Boolean(n.tareaId);

                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => !isTarea && onMarkNotifyRead?.(n.id)}
                                        className={`p-3 rounded-2xl transition-all border cursor-pointer hover:shadow-2xs group ${
                                            !n.leida
                                                ? isVinculacion
                                                    ? 'bg-(--tag-amber-bg) border-(--border-soft) shadow-2xs'
                                                    : isTarea
                                                    ? 'bg-(--tag-indigo-bg) border-(--border-soft) shadow-2xs'
                                                    : 'bg-(--tag-emerald-bg) border-(--border-soft)'
                                                : 'bg-(--linen)/20 border-transparent text-(--ink-soft)'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    isVinculacion
                                                        ? 'bg-(--tag-amber-bg) text-(--tag-amber-text)'
                                                        : isTarea
                                                        ? 'bg-(--tag-indigo-bg) text-(--tag-indigo-text)'
                                                        : 'bg-(--tag-emerald-bg) text-(--tag-emerald-text)'
                                                }`}
                                            >
                                                {isVinculacion ? <Link size={14} /> : isTarea ? <SquareCheck size={14} /> : <Bell size={14} />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs font-black truncate ${!n.leida ? 'text-(--ink)' : 'text-(--ink-soft)'}`}>
                                                        {n.titulo}
                                                    </p>
                                                    {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-(--primary) shrink-0" />}
                                                </div>

                                                <p className={`text-xs leading-relaxed mt-0.5 ${!n.leida ? 'text-(--ink)' : 'text-(--ink-soft)'}`}>
                                                    {n.mensaje}
                                                </p>

                                                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                                    {new Date(n.createdAt).toLocaleDateString()}
                                                </p>

                                                {isTarea && onCompleteTarea && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCompleteTarea(n.tareaId!);
                                                        }}
                                                        className="mt-2 h-7 inline-flex items-center gap-1.5 px-3 rounded-full bg-(--primary) text-white text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                                                    >
                                                        <SquareCheck size={12} />
                                                        <span>Completar tarea</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SECCIÓN TAREAS INSTITUCIONALES */}
                <div className="space-y-2 pt-1 border-t border-(--border-soft)/50">
                    <p className="text-xs font-bold text-(--ink-soft) uppercase tracking-widest">
                        Tareas Institucionales
                    </p>

                    {tareasInstitucionales.length === 0 ? (
                        <p className="text-xs text-(--ink-soft) italic px-1 py-1">
                            No hay tareas pendientes.
                        </p>
                    ) : (
                        tareasInstitucionales.map((n) => {
                            const isCompleted = n.estado === 'resuelto';

                            return (
                                <div
                                    key={n.id}
                                    className="flex items-start gap-3 p-2 hover:bg-(--linen)/50 rounded-xl cursor-pointer transition-colors group"
                                    onClick={() => {
                                        if (!isCompleted && onCompleteTarea) {
                                            onCompleteTarea(n.tareaId!);
                                        }
                                    }}
                                >
                                    <div
                                        className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                            isCompleted ? 'bg-(--ink) border-(--ink)' : 'border-(--border-soft) group-hover:border-(--primary)'
                                        }`}
                                    >
                                        {isCompleted && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs ${isCompleted ? 'text-(--ink-soft)/70 line-through' : 'text-(--ink)'}`}>
                                            <span className="font-bold">{n.titulo}:</span> {n.mensaje}{' '}
                                            <span className="text-(--ink-soft) font-medium ml-1">
                                                {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}.
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </aside>
    );
};

export default NotificationDropdown;
