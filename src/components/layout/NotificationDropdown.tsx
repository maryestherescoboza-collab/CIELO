import React from 'react';
import { Bell, Link, SquareCheck } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
    showNotifs: boolean;
    notificaciones: Notification[];
    onMarkNotifyRead?: (id: number) => void;
    onCompleteTarea?: (tareaId: string) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    showNotifs, notificaciones, onMarkNotifyRead, onCompleteTarea
}) => {
    if (!showNotifs) return null;

    return (
        <div className="absolute top-16 right-4 md:right-16 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Centro de Actividad</h3>
            </div>
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                {notificaciones.filter(n => n.tipo !== 'tarea').length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notificaciones</p>
                            <button 
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase"
                                onClick={() => notificaciones.forEach(n => !n.leida && onMarkNotifyRead?.(n.id))}
                            >
                                Leídas
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {notificaciones.filter(n => n.tipo !== 'tarea').slice(0, 10).map(n => {
                                const isVinculacion = n.tipo === 'solicitud_vinculacion';
                                const isTarea = n.tipo === 'tarea' && !!n.tareaId;
                                return (
                                    <div 
                                        key={n.id} 
                                        onClick={() => !isTarea && onMarkNotifyRead?.(n.id)}
                                        className={`p-3 rounded-2xl transition-all border cursor-pointer hover:shadow-sm group ${
                                            !n.leida 
                                                ? (isVinculacion ? 'bg-amber-50 border-amber-100 shadow-sm' : isTarea ? 'bg-sky-50/60 border-sky-200 shadow-sm' : 'bg-emerald-50/50 border-emerald-100') 
                                                : 'bg-slate-50/30 border-transparent text-slate-400'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                isVinculacion ? 'bg-amber-100 text-amber-600' : isTarea ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-600'
                                            }`}>
                                                {isVinculacion ? <Link size={14} /> : isTarea ? <SquareCheck size={14} /> : <Bell size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs font-black truncate ${!n.leida ? 'text-slate-900' : 'text-slate-500'}`}>{n.titulo}</p>
                                                    {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>}
                                                </div>
                                                <p className={`text-xs leading-relaxed mt-0.5 ${!n.leida ? 'text-slate-600' : 'text-slate-400'}`}>{n.mensaje}</p>
                                                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tighter">{new Date(n.createdAt).toLocaleDateString()}</p>
                                                {isTarea && onCompleteTarea && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCompleteTarea(n.tareaId!);
                                                            onMarkNotifyRead?.(n.id);
                                                        }}
                                                        className="mt-2 h-8 inline-flex items-center gap-1.5 px-4 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-[#6C7E5C] transition-colors"
                                                    >
                                                        <SquareCheck size={12} /> Completar tarea
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

                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tareas Institucionales</p>
                    {notificaciones.filter(n => n.tipo === 'tarea' && n.tareaId).length === 0 ? (
                        <p className="text-xs text-slate-500 italic px-1">No hay tareas pendientes.</p>
                    ) : (
                        notificaciones.filter(n => n.tipo === 'tarea' && n.tareaId).map(n => {
                            const isCompleted = n.estado === 'resuelto';
                            return (
                                <div 
                                    key={n.id} 
                                    className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group" 
                                    onClick={() => {
                                        if (!isCompleted && onCompleteTarea) {
                                            onCompleteTarea(n.tareaId!);
                                            onMarkNotifyRead?.(n.id);
                                        }
                                    }}
                                >
                                    <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isCompleted ? 'bg-slate-800 border-slate-800' : 'border-slate-300 group-hover:border-slate-400'}`}>
                                        {isCompleted && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                            <span className="font-bold">{n.titulo}:</span> {n.mensaje} <span className="text-slate-400 font-medium ml-1">{new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}.</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationDropdown;
