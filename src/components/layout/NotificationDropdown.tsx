import React from 'react';
import { Bell, Link, SquareCheck } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
    showNotifs: boolean;
    notificaciones: Notification[];
    tasks: { id: number; text: string; done: boolean }[];
    toggleTask: (id: number) => void;
    onMarkNotifyRead?: (id: number) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    showNotifs, notificaciones, tasks, toggleTask, onMarkNotifyRead
}) => {
    if (!showNotifs) return null;

    return (
        <div className="absolute top-16 right-4 md:right-16 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Centro de Actividad</h3>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {notificaciones.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notificaciones</p>
                            <button 
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase"
                                onClick={() => notificaciones.forEach(n => !n.leida && onMarkNotifyRead?.(n.id))}
                            >
                                Leídas
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {notificaciones.slice(0, 10).map(n => {
                                const isVinculacion = n.tipo === 'solicitud_vinculacion';
                                return (
                                    <div 
                                        key={n.id} 
                                        onClick={() => onMarkNotifyRead?.(n.id)}
                                        className={`p-3 rounded-xl transition-all border cursor-pointer hover:shadow-sm group ${
                                            !n.leida 
                                                ? (isVinculacion ? 'bg-amber-50 border-amber-100 shadow-sm' : 'bg-emerald-50/50 border-emerald-100') 
                                                : 'bg-slate-50/30 border-transparent text-slate-400'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                isVinculacion ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                            }`}>
                                                {isVinculacion ? <Link size={14} /> : <Bell size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs font-black truncate ${!n.leida ? 'text-slate-900' : 'text-slate-500'}`}>{n.titulo}</p>
                                                    {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>}
                                                </div>
                                                <p className={`text-[11px] leading-relaxed mt-0.5 ${!n.leida ? 'text-slate-600' : 'text-slate-400'}`}>{n.mensaje}</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">{new Date(n.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendientes de aula</p>
                    {tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleTask(t.id)}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                {t.done && <SquareCheck size={12} />}
                            </div>
                            <span className={`text-sm font-medium ${t.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotificationDropdown;
