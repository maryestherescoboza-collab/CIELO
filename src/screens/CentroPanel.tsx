import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, AlertTriangle, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useCentroActions } from '../hooks/useCentroActions';
import logo from '../assets/logo.png';
import type { Centro } from '../types';

import CentroTareas from '../components/centro/CentroTareas';
import CentroBoletines from '../components/centro/CentroBoletines';
import CentroIncidencias from '../components/centro/CentroIncidencias';
import CentroConfiguracion from '../components/centro/CentroConfiguracion';

import { CieloPill } from '../components/ui/CieloPill';

export type SeccionCentro = 'centro' | 'tareas' | 'boletines' | 'incidencias';

function CentroStructureItem({
    active, title, desc, tagLabel, tagColor, isLast = false, onClick
}: {
    active: boolean; title: string; desc: string; tagLabel: string; tagColor: string; isLast?: boolean; onClick: () => void;
}) {
    return (
        <div className="relative pl-6 py-1 group cursor-pointer" onClick={onClick}>
            {!isLast && <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#EAE4DA] transition-colors group-hover:bg-[#BFC9A6]" />}
            {isLast && <div className="absolute left-[11px] top-0 h-[50%] w-px bg-[#EAE4DA] transition-colors group-hover:bg-[#BFC9A6]" />}
            
            <div className="absolute left-[11px] top-[50%] w-4 h-px bg-[#EAE4DA] transition-colors group-hover:bg-[#BFC9A6]" />

            <div className={`relative z-10 transition-all duration-300 rounded-xl p-3 border ${active ? 'bg-white border-[#EAE4DA] shadow-[0_4px_20px_rgba(0,0,0,0.03)] translate-x-1' : 'border-transparent hover:bg-white/40'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                    <div>
                        <h3 className={`text-[12px] font-black tracking-[0.15em] uppercase transition-colors ${active ? 'text-[#3F3C36]' : 'text-[#3F3C36]/70 group-hover:text-[#3F3C36]'}`}>
                            {title}
                        </h3>
                        <p className="text-[10px] font-bold text-[#7A8D69] uppercase tracking-widest mt-0.5">{desc}</p>
                    </div>
                    {tagLabel && (
                        <span className={`self-start sm:self-auto text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[6px] border border-white/40 shadow-sm ${tagColor}`}>
                            {tagLabel}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

interface Props {
    onLogout: () => void;
}

export default function CentroPanel({ onLogout }: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const { loadCentro } = useCentroActions();

    const [activeSection, setActiveSection] = useState<SeccionCentro>('centro');

    const currentUserProfile = useMemo(
        () => state.perfiles.find(p => p.userId === session?.user?.id),
        [state.perfiles, session]
    );
    const centroId = state.centroRolActual?.centro_id || currentUserProfile?.centro_id;
    const [centroActual, setCentroActual] = useState<Centro | null>(currentUserProfile?.centro ?? null);
    const centro = centroActual;

    const [cargandoCentro, setCargandoCentro] = useState(true);
    const [errorCentro, setErrorCentro] = useState<string | null>(null);
    const [intentoCentro, setIntentoCentro] = useState(0);

    useEffect(() => {
        if (!centroId) return;
        let activo = true;
        loadCentro(centroId).then(centroDb => {
            if (!activo) return;
            if (centroDb) {
                setCentroActual(centroDb);
                setErrorCentro(null);
            } else {
                setErrorCentro('No se pudo cargar la información del centro desde la base de datos.');
            }
            setCargandoCentro(false);
        });
        return () => { activo = false; };
    }, [centroId, loadCentro, intentoCentro]);

    const onCentroActualizado = useCallback((nuevoCentro: Centro) => {
        setCentroActual(nuevoCentro);
    }, []);

    const hoy = new Date();
    const anioInicio = hoy.getMonth() >= 7 ? hoy.getFullYear() : hoy.getFullYear() - 1;
    const anioEscolar = `${anioInicio}–${anioInicio + 1}`;

    if (!centroId) {
        return (
            <div className="min-h-screen bg-[#F8F3ED] text-[#3F3C36] flex items-center justify-center p-6">
                <div className="bg-white border border-[#EAE4DA] rounded-3xl p-10 text-center max-w-md shadow-sm">
                    <Building2 size={32} className="mx-auto text-primary mb-4" />
                    <h2 className="text-[14px] font-black tracking-widest uppercase text-[#3F3C36] mb-2">Panel no disponible</h2>
                    <p className="text-[11px] font-bold text-[#7A8D69] uppercase tracking-widest mb-6">
                        No estás vinculado a un centro educativo. Contacta al administrador.
                    </p>
                    <CieloPill
                        as="button"
                        onClick={onLogout}
                        variant="primary"
                        className="mx-auto gap-2 px-6"
                    >
                        <LogOut size={14} /> CERRAR SESIÓN
                    </CieloPill>
                </div>
            </div>
        );
    }

    if (!centro) {
        if (cargandoCentro) {
            return (
                <div className="min-h-screen bg-[#F8F3ED] text-[#3F3C36] flex items-center justify-center p-6">
                    <div className="flex flex-col items-center gap-4 text-[#7A8D69]">
                        <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-[11px] font-black uppercase tracking-widest">Sincronizando arquitectura del centro…</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-[#F8F3ED] text-[#3F3C36] flex items-center justify-center p-6">
                <div className="bg-white border border-[#EAE4DA] rounded-3xl p-10 text-center max-w-md shadow-sm">
                    <AlertTriangle size={32} className="mx-auto text-attention mb-4" />
                    <h2 className="text-[14px] font-black tracking-widest uppercase text-[#3F3C36] mb-2">Error de Sincronización</h2>
                    <p className="text-[11px] font-bold text-[#7A8D69] uppercase tracking-widest mb-6">
                        {errorCentro || 'No hay información del centro disponible. Verifica tu vinculación e inténtalo de nuevo.'}
                    </p>
                    <CieloPill
                        as="button"
                        onClick={() => setIntentoCentro(n => n + 1)}
                        variant="primary"
                        className="mx-auto gap-2 px-6"
                    >
                        <Building2 size={14} /> REINTENTAR
                    </CieloPill>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F3ED] text-[#3F3C36] font-sans flex flex-col selection:bg-primary/20">
            {/* ── Encabezado Editorial ─────────────────────────────── */}
            <header className="px-6 py-4 border-b border-[#EAE4DA] flex flex-col md:flex-row md:items-center justify-between bg-[#F8F3ED] sticky top-0 z-40 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[10px] bg-white border border-[#EAE4DA] flex items-center justify-center shadow-sm shrink-0">
                        <img src={logo} alt="CIELO" className="w-6 h-6 object-contain opacity-90" />
                    </div>
                    <div className="h-8 w-px bg-[#EAE4DA] hidden sm:block" />
                    <div>
                        <h1 className="text-[13px] font-black tracking-[0.15em] text-[#3F3C36] uppercase leading-tight">
                            CIELO · {centro.nombre}
                        </h1>
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] font-bold text-[#7A8D69] uppercase tracking-[0.15em] mt-1">
                            <span>ID: {centro.id}</span>
                            <span className="hidden sm:inline text-[#EAE4DA] font-light">|</span>
                            <span>Panel de Dirección</span>
                            <span className="hidden sm:inline text-[#EAE4DA] font-light">|</span>
                            <span>Periodo {anioEscolar}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-white border border-[#EAE4DA] rounded-[8px] px-3 py-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#7A8D69] animate-pulse" />
                        <span className="text-[9px] font-black text-[#3F3C36] uppercase tracking-[0.15em]">Operativo</span>
                    </div>
                    <button onClick={onLogout} className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B87449] hover:text-[#3F3C36] transition-colors bg-white/50 px-3 py-1.5 rounded-[8px] border border-[#EAE4DA] hover:bg-white shadow-sm">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1800px] mx-auto">
                {/* ── Arquitectura / Mapa de Navegación ─────────────────────────────── */}
                <nav className="w-full lg:w-[380px] xl:w-[420px] p-6 lg:p-8 shrink-0 lg:border-r border-[#EAE4DA] lg:h-[calc(100vh-73px)] lg:sticky lg:top-[73px] overflow-y-auto scrollbar-hide">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-6 h-6 bg-[#3F3C36] rounded-[6px] flex items-center justify-center shadow-sm">
                                <Building2 size={12} className="text-[#F8F3ED]" />
                            </div>
                            <span className="text-[11px] font-black tracking-[0.2em] text-[#3F3C36] uppercase">Arquitectura del Centro</span>
                        </div>
                        
                        <div className="relative ml-3">
                            {/* Línea principal vertical (Tronco) */}
                            <div className="absolute left-0 top-3 bottom-[30px] w-px bg-[#EAE4DA]" />

                            <div className="relative ml-2">
                                <CentroStructureItem 
                                    active={activeSection === 'centro'}
                                    onClick={() => setActiveSection('centro')}
                                    title="CONFIGURACIÓN"
                                    desc="Información del centro"
                                    tagLabel="principal"
                                    tagColor="text-[#3F3C36] bg-[#3F3C36]/10"
                                />
                                <CentroStructureItem 
                                    active={activeSection === 'tareas'}
                                    onClick={() => setActiveSection('tareas')}
                                    title="TAREAS"
                                    desc="Seguimiento docente"
                                    tagLabel="activo"
                                    tagColor="text-[#F5BC5D] bg-[#F5BC5D]/15"
                                />
                                <CentroStructureItem 
                                    active={activeSection === 'boletines'}
                                    onClick={() => setActiveSection('boletines')}
                                    title="BOLETINES"
                                    desc="Generación y descarga"
                                    tagLabel="disponible"
                                    tagColor="text-[#6D8FB9] bg-[#6D8FB9]/10"
                                />
                                <CentroStructureItem 
                                    active={activeSection === 'incidencias'}
                                    onClick={() => setActiveSection('incidencias')}
                                    title="INCIDENCIAS"
                                    desc="Registro y reportes"
                                    tagLabel="activo"
                                    tagColor="text-[#B87449] bg-[#B87449]/10"
                                    isLast={true}
                                />
                            </div>
                        </div>
                    </div>
                </nav>

                {/* ── Contenido Principal ─────────────────────────────── */}
                <main className="flex-1 min-w-0 p-4 lg:p-10 bg-white lg:shadow-[-20px_0_60px_rgba(0,0,0,0.02)] lg:rounded-tl-[40px] relative z-10 lg:min-h-[calc(100vh-73px-32px)]">
                    <div className="max-w-5xl mx-auto h-full flex flex-col pb-16">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                            {activeSection === 'centro' && (
                                <CentroConfiguracion
                                    centroId={centroId}
                                    centro={centro}
                                    onCentroActualizado={onCentroActualizado}
                                />
                            )}
                            {activeSection === 'tareas' && <CentroTareas centroId={centroId} />}
                            {activeSection === 'boletines' && <CentroBoletines centroId={centroId} centroNombre={centro.nombre} />}
                            {activeSection === 'incidencias' && (
                                <CentroIncidencias
                                    centroId={centroId}
                                    centroNombre={centro.nombre}
                                    centroCodigo={centro.codigoCentro}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* ── Estado del Sistema (Footer) ─────────────────────────────── */}
            <footer className="fixed bottom-0 left-0 w-full bg-[#3F3C36] text-[#EAE4DA] py-2 px-6 flex flex-col sm:flex-row justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#BFC9A6] rounded-full"></div> Sincronizado</span>
                    <span className="hidden sm:inline text-[#EAE4DA]/30">|</span>
                    <span className="hidden sm:inline">4 Módulos operativos</span>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="opacity-70">Última actualización: {hoy.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="hidden sm:inline text-[#EAE4DA]/30">|</span>
                    <span className="text-[#BFC9A6]">CIELO · V3</span>
                </div>
            </footer>
        </div>
    );
}
