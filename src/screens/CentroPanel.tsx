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

                    <button onClick={onLogout} className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B87449] hover:text-[#3F3C36] transition-colors bg-white/50 px-3 py-1.5 rounded-[8px] border border-[#EAE4DA] hover:bg-white shadow-sm">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto">
                {/* ── Navegación Horizontal ─────────────────────────────── */}
                <nav className="w-full px-6 py-4 flex gap-8 border-b border-[#EAE4DA] bg-white sticky top-0 z-30 overflow-x-auto scrollbar-hide">
                    {['centro', 'tareas', 'boletines', 'incidencias'].map((seccion) => (
                        <button 
                            key={seccion}
                            onClick={() => setActiveSection(seccion as SeccionCentro)}
                            className={`text-[12px] font-black uppercase tracking-widest pb-1 border-b-2 transition-colors whitespace-nowrap ${
                                activeSection === seccion 
                                    ? 'text-[#3F3C36] border-[#3F3C36]' 
                                    : 'text-[#7A8D69] border-transparent hover:text-[#3F3C36]'
                            }`}
                        >
                            {seccion === 'centro' ? 'Configuración' : seccion}
                        </button>
                    ))}
                </nav>

                {/* ── Contenido Principal ─────────────────────────────── */}
                <main className="flex-1 min-w-0 p-4 lg:p-10 bg-[#F8F3ED] relative z-10">
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


        </div>
    );
}
