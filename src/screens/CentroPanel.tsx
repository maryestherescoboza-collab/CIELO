import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, AlertTriangle, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useCentroActions } from '../hooks/useCentroActions';
import logo from '../assets/logo.png';
import type { Centro } from '../types';
import { ESTADO_CENTRO_COLORS, ESTADO_CENTRO_LABELS } from '../components/centro/centroUi';
import CentroSidebar, { type SeccionCentro } from '../components/centro/CentroSidebar';
import CentroInicio from '../components/centro/CentroInicio';
import CentroTareas from '../components/centro/CentroTareas';
import CentroBoletines from '../components/centro/CentroBoletines';
import CentroIncidencias from '../components/centro/CentroIncidencias';
import CentroConfiguracion from '../components/centro/CentroConfiguracion';
import CentroCodigos from '../components/centro/CentroCodigos';

interface Props {
    onLogout: () => void;
}

export default function CentroPanel({ onLogout }: Props) {
    const state = useAppStore(s => s.state);
    const session = useAppStore(s => s.session);
    const { loadCentro } = useCentroActions();

    const [activeSection, setActiveSection] = useState<SeccionCentro>('inicio');

    const currentUserProfile = useMemo(
        () => state.perfiles.find(p => p.userId === session?.user?.id),
        [state.perfiles, session]
    );
    // El centro del usuario autenticado se resuelve primero desde su rol
    // (centro_roles) y, como respaldo, desde perfiles.centro_id.
    const centroId = state.centroRolActual?.centro_id || currentUserProfile?.centro_id;
    // Fuente de verdad para el objeto Centro: se prefiere la fila cargada de
    // public.centros (loadCentro) y, si aún no está, el join del perfil.
    const [centroActual, setCentroActual] = useState<Centro | null>(currentUserProfile?.centro ?? null);
    const centro = centroActual;

    const [cargandoCentro, setCargandoCentro] = useState(true);
    const [errorCentro, setErrorCentro] = useState<string | null>(null);
    const [intentoCentro, setIntentoCentro] = useState(0);

    // Carga la fila del centro directamente desde public.centros
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

    // Año escolar para la barra superior (visual, derivado de la fecha actual)
    const hoy = new Date();
    const anioInicio = hoy.getMonth() >= 7 ? hoy.getFullYear() : hoy.getFullYear() - 1;
    const anioEscolar = `${anioInicio}–${anioInicio + 1}`;

    if (!centroId) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] text-[#3F3C36] flex items-center justify-center p-6">
                <div className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl p-10 text-center max-w-md shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                    <Building2 size={32} className="mx-auto text-cielo-blue mb-4" />
                    <h2 className="text-lg font-semibold text-[#3F3C36] mb-1">Panel no disponible</h2>
                    <p className="text-sm text-[#6B7280]">
                        No estás vinculado a un centro educativo. Contacta al administrador.
                    </p>
                    <button
                        onClick={onLogout}
                        className="mt-6 inline-flex items-center gap-2 bg-cielo-blue text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#5F839E] transition-colors"
                    >
                        <LogOut size={14} /> Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    if (!centro) {
        if (cargandoCentro) {
            return (
                <div className="min-h-screen bg-[#F8F9FA] text-[#3F3C36] flex items-center justify-center p-6">
                    <div className="flex items-center gap-3 text-[#6B7280]">
                        <span className="h-5 w-5 rounded-full border-2 border-cielo-blue border-t-transparent animate-spin" />
                        <p className="text-sm font-medium">Cargando la información del centro…</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-[#F8F9FA] text-[#3F3C36] flex items-center justify-center p-6">
                <div className="bg-[#F9F8F6] border border-[#E6E1D8] rounded-2xl p-10 text-center max-w-md shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
                    <AlertTriangle size={32} className="mx-auto text-[#EB8847] mb-4" />
                    <h2 className="text-lg font-semibold text-[#3F3C36] mb-1">No se pudo cargar el centro</h2>
                    <p className="text-sm text-[#6B7280]">
                        {errorCentro || 'No hay información del centro disponible. Verifica tu vinculación e inténtalo de nuevo.'}
                    </p>
                    <button
                        onClick={() => setIntentoCentro(n => n + 1)}
                        className="mt-6 inline-flex items-center gap-2 bg-cielo-blue text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#5F839E] transition-colors"
                    >
                        <Building2 size={14} /> Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const estadoCentroVisual = (centro?.estado as string) || 'activo';

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] text-[#3F3C36]">
            {/* ── Navegación lateral fija ─────────────────────────────── */}
            <CentroSidebar active={activeSection} onSelect={setActiveSection} onLogout={onLogout} />

            <div className="flex-1 min-w-0 flex flex-col">
                {/* ── Barra superior fija ─────────────────────────────── */}
                <header className="sticky top-0 z-40 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-[#E6E1D8]">
                    <div className="max-w-400 mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D8] flex items-center justify-center shadow-sm shrink-0">
                                <img src={logo} alt="CIELO" className="w-5 h-5 object-contain" />
                            </div>
                            <div className="min-w-0 leading-tight">
                                <h1 className="text-[15px] font-semibold text-[#3F3C36] truncate">{centro.nombre}</h1>
                                <p className="text-[11px] text-[#6B7280] truncate">
                                    ID del centro: <span className="font-mono">{centro.id}</span>
                                </p>
                                <p className="text-[11px] text-[#6B7280] truncate">Panel de dirección · Año escolar {anioEscolar}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${ESTADO_CENTRO_COLORS[estadoCentroVisual] || ESTADO_CENTRO_COLORS.activo}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {ESTADO_CENTRO_LABELS[estadoCentroVisual] || '—'}
                            </span>
                            <button
                                onClick={onLogout}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E1D8] bg-white text-[12px] font-medium text-[#3F3C36] hover:bg-[#F9F8F6] transition-colors"
                            >
                                <LogOut size={14} /> <span className="hidden sm:inline">Cerrar sesión</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Contenido dinámico según la sección activa ──────── */}
                <main className="flex-1 w-full max-w-400 mx-auto px-4 lg:px-6 py-4">
                    {activeSection === 'inicio' && <CentroInicio centroId={centroId} centro={centro} />}
                    {activeSection === 'tareas' && <CentroTareas centroId={centroId} />}
                    {activeSection === 'boletines' && <CentroBoletines centroId={centroId} centroNombre={centro.nombre} />}
                    {activeSection === 'incidencias' && (
                        <CentroIncidencias
                            centroId={centroId}
                            centroNombre={centro.nombre}
                            centroCodigo={centro.codigoCentro}
                        />
                    )}
                    {activeSection === 'centro' && (
                        <CentroConfiguracion
                            centroId={centroId}
                            centro={centro}
                            onCentroActualizado={onCentroActualizado}
                        />
                    )}
                    {activeSection === 'codigos' && <CentroCodigos centroId={centroId} />}

                    <p className="mt-2 text-center text-[11px] font-medium text-[#6B7280]/70 py-1">
                        CIELO · Panel de Dirección · {new Date().getFullYear()}
                    </p>
                </main>
            </div>
        </div>
    );
}
