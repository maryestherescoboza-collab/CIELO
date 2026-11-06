import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle, 
  NotebookPen, 
  Users, 
  ClipboardList, 
  SquareCheck, 
  Stamp, 
  User, 
  X, 
  MoreHorizontal,
  FolderOpen,
  QrCode
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import type { Screen } from '../../types';
import { useAppStore } from '../../store/appStore';
import { generarDescargaQREstudiantesPdf } from '../../utils/qrEstudiantesPdf';
import { DescargarQrModal } from './DescargarQrModal';

const SUPPORT_URL = 'https://wa.link/lhvibv';

interface BottomNavProps {
    currentScreen: Screen;
    onNavigate: (s: Screen) => void;
}

const NAV_ITEMS: { label: string; screen: Screen; icon: React.ReactNode; isClose?: boolean }[] = [
    { label: 'Inicio', screen: 'inicio', icon: <Home size={18} /> },
    { label: 'Dashboard', screen: 'dashboard', icon: <TrendingUp size={18} /> },
    { label: 'Cursos', screen: 'cursos', icon: <BookOpen size={18} /> },
    { label: 'Incidencias', screen: 'incidencias', icon: <AlertTriangle size={18} /> },
    { label: 'Plan clases', screen: 'plan-de-clases', icon: <NotebookPen size={18} /> },
    { label: 'Comunidad', screen: 'comunidad', icon: <Users size={18} /> },
    { label: 'Rúbrica', screen: 'rubrica', icon: <ClipboardList size={18} /> },
    { label: 'Cotejo', screen: 'cotejo', icon: <SquareCheck size={18} /> },
    { label: 'Sellos', screen: 'sellos', icon: <Stamp size={18} /> },
    { label: 'Estudiantes', screen: 'estudiante', icon: <User size={18} /> },
    { label: 'Cerrar', screen: 'inicio', icon: <X size={18} />, isClose: true },
];

const MOBILE_PRIMARY = ['Inicio', 'Sellos', 'Rúbrica', 'Cotejo', 'Cursos', 'Estudiantes'];

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const cursos = useAppStore(s => s.state.cursos);

    const isEvidenciasActive = location.pathname.startsWith('/estudiante') && (location.search.includes('tab=evidencias') || location.search.includes('subseccion=evidencias'));
    const isEstudiantesFichaActive = location.pathname.startsWith('/estudiante') && !isEvidenciasActive;

    const [showMore, setShowMore] = useState(false);
    const [showEstudiantesMenu, setShowEstudiantesMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ bottom: number; left: number } | null>(null);
    const [showMobileEstudiantesSubmenu, setShowMobileEstudiantesSubmenu] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const moreMenuRef = useRef<HTMLDivElement>(null);
    const estudiantesBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMore(false);
                setShowMobileEstudiantesSubmenu(false);
            }
        };
        const handleResize = () => {
            setShowEstudiantesMenu(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleToggleEstudiantesMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (estudiantesBtnRef.current) {
            const rect = estudiantesBtnRef.current.getBoundingClientRect();
            setMenuPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2))
            });
        }
        setShowEstudiantesMenu(prev => !prev);
    };

    const handleGoEstudiantes = () => {
        setShowEstudiantesMenu(false);
        setShowMore(false);
        setShowMobileEstudiantesSubmenu(false);
        navigate('/estudiante');
    };

    const handleGoEvidencias = () => {
        setShowEstudiantesMenu(false);
        setShowMore(false);
        setShowMobileEstudiantesSubmenu(false);
        navigate('/estudiante?tab=evidencias');
    };

    const handleOpenDescargarQr = () => {
        setShowEstudiantesMenu(false);
        setShowMore(false);
        setShowMobileEstudiantesSubmenu(false);
        setShowQrModal(true);
    };

    const handleExecuteDescargarPdf = async (cursoId: number) => {
        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        try {
            const currentStore = useAppStore.getState();
            const currentState = currentStore.state;
            const currentSession = currentStore.session;
            const currentUserProfile = currentState.perfiles?.find(p => p.userId === currentSession?.user?.id);
            const docenteNombre = currentUserProfile?.nombreDocente || currentState.nombreDocente || '';
            const centroNombre = currentState.centros?.[0]?.nombre || '';

            const res = await generarDescargaQREstudiantesPdf({
                state: currentState,
                docenteNombre,
                centroNombre,
                cursoId
            });

            if (!res.success && res.error) {
                alert(res.error);
            } else if (res.success) {
                setShowQrModal(false);
            }
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <>
            <nav className="app-bottom-nav px-2 lg:px-4 justify-around lg:justify-center">
                {NAV_ITEMS.map(item => {
                    const isActive = currentScreen === item.screen && !item.isClose;
                    const isPrimary = MOBILE_PRIMARY.includes(item.label);
                    const isEstudiantes = item.screen === 'estudiante';
                    
                    let btnBg = 'bg-transparent text-(--ink)';
                    if (isActive || (isEstudiantes && showEstudiantesMenu)) {
                        btnBg = 'bg-(--primary) text-white shadow-sm';
                    } else if (item.label === 'Comunidad') {
                        btnBg = 'hover:bg-(--linen) text-(--ink)';
                    }

                    if (isEstudiantes) {
                        return (
                            <button 
                                key={item.label}
                                ref={estudiantesBtnRef}
                                type="button"
                                onClick={handleToggleEstudiantesMenu} 
                                aria-label="Menú Estudiantes"
                                aria-expanded={showEstudiantesMenu}
                                title={item.label}
                                className={`${isPrimary ? 'flex' : 'hidden lg:flex'} shrink-0 flex-col items-center justify-center gap-0.5 px-0 lg:px-3.5 py-1 rounded-full transition-all duration-200 ${btnBg} hover:bg-(--linen)/40 flex-1 lg:flex-none lg:min-w-18 h-10 cursor-pointer`}
                            >
                                <div className={isActive || showEstudiantesMenu ? 'text-white' : 'text-(--ink)'}>
                                    {item.icon}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.05em] ${isActive || showEstudiantesMenu ? 'text-white' : 'text-(--ink)'} hidden lg:block`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button 
                            key={item.label} 
                            id={item.screen === 'cursos' ? 'nav-cursos' : item.screen === 'plan-de-clases' ? 'nav-plan-clases' : undefined}
                            data-guide={item.screen === 'plan-de-clases' ? 'nav-plan-clases' : undefined}
                            onClick={() => { onNavigate(item.screen); setShowMore(false); setShowEstudiantesMenu(false); }} 
                            aria-label={item.label}
                            title={item.label}
                            className={`${isPrimary ? 'flex' : 'hidden lg:flex'} shrink-0 flex-col items-center justify-center gap-0.5 px-0 lg:px-3.5 py-1 rounded-full transition-all duration-200 ${btnBg} hover:bg-(--linen)/40 flex-1 lg:flex-none lg:min-w-18 h-10 cursor-pointer`}
                        >
                            <div className={isActive ? 'text-white' : 'text-(--ink)'}>
                                {item.icon}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.05em] ${isActive ? 'text-white' : 'text-(--ink)'} hidden lg:block`}>{item.label}</span>
                        </button>
                    );
                })}

                {/* Acceso global a Soporte (navegación externa, versión PC) */}
                <div className="mx-1 h-8 w-px bg-(--border-soft) shrink-0 hidden lg:block" aria-hidden="true" />
                <a
                    href={SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden lg:flex shrink-0 flex-col items-center justify-center gap-0.5 px-3.5 py-1 rounded-full transition-all duration-200 bg-transparent text-(--ink) hover:bg-(--linen)/40 lg:min-w-18 h-10 group"
                    aria-label="Soporte por WhatsApp de CIELO"
                    title="Soporte por WhatsApp"
                >
                    <div className="transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
                        <WhatsAppIcon size={19} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-(--ink) hidden lg:block">Soporte</span>
                </a>

                {/* Botón "Más" para Móvil/Tablet */}
                <div className="relative flex lg:hidden flex-1 items-center justify-center" ref={moreMenuRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setShowMore(!showMore);
                            setShowMobileEstudiantesSubmenu(false);
                        }}
                        className={`flex flex-col items-center justify-center gap-0.5 px-0 py-1 rounded-full transition-all duration-200 ${showMore ? 'bg-(--linen) text-(--ink)' : 'bg-transparent text-(--ink)'} hover:bg-(--linen)/40 w-full h-10 cursor-pointer`}
                        aria-label="Más opciones"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    
                    {/* Menú desplegable "Más" */}
                    {showMore && (
                        <div className="absolute bottom-12 right-2 bg-white border border-(--border-soft) rounded-2xl shadow-lg p-2 flex flex-col gap-1 z-50 min-w-52 animate-in fade-in slide-in-from-bottom-2">
                            {NAV_ITEMS.filter(item => !MOBILE_PRIMARY.includes(item.label)).map(item => {
                                const isEstudiantes = item.screen === 'estudiante';
                                const isActive = currentScreen === item.screen && !item.isClose;
                                let btnBg = 'bg-transparent text-(--ink)';
                                if (isActive) btnBg = 'bg-(--primary) text-white shadow-sm';
                                
                                if (isEstudiantes) {
                                    return (
                                        <div key={`more-${item.label}`} className="flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowMobileEstudiantesSubmenu(!showMobileEstudiantesSubmenu)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${btnBg} hover:bg-(--linen)/40 w-full cursor-pointer`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={isActive ? 'text-white' : 'text-(--ink-soft)'}>
                                                        {item.icon}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                                </div>
                                                <span className="text-[10px] text-(--ink-soft)">
                                                    {showMobileEstudiantesSubmenu ? '▲' : '▼'}
                                                </span>
                                            </button>

                                            {showMobileEstudiantesSubmenu && (
                                                <div className="pl-4 pr-2 py-1 flex flex-col gap-1 border-l-2 border-(--border-soft) ml-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleGoEstudiantes}
                                                        className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-bold transition-colors text-left cursor-pointer ${
                                                            isEstudiantesFichaActive
                                                                ? 'bg-(--linen) text-(--ink)'
                                                                : 'text-(--ink) hover:bg-(--linen)/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <User size={14} className={isEstudiantesFichaActive ? 'text-(--primary)' : 'text-(--ink-soft)'} />
                                                            <span>Estudiantes</span>
                                                        </div>
                                                        {isEstudiantesFichaActive && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-(--primary)" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleGoEvidencias}
                                                        className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-bold transition-colors text-left cursor-pointer ${
                                                            isEvidenciasActive
                                                                ? 'bg-(--linen) text-(--ink)'
                                                                : 'text-(--ink) hover:bg-(--linen)/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <FolderOpen size={14} className="text-[#537BAC]" />
                                                            <span>Evidencias</span>
                                                        </div>
                                                        {isEvidenciasActive && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-(--primary)" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenDescargarQr}
                                                        className="flex items-center gap-2.5 py-2 px-2 rounded-lg text-xs font-bold text-(--ink) hover:bg-(--linen)/40 transition-colors text-left cursor-pointer"
                                                    >
                                                        <QrCode size={14} className="text-[#DEAE4D]" />
                                                        <span>Descargar QR</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={`more-${item.label}`}
                                        type="button"
                                        onClick={() => { onNavigate(item.screen); setShowMore(false); }}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${btnBg} hover:bg-(--linen)/40 cursor-pointer`}
                                    >
                                        <div className={isActive ? 'text-white' : 'text-(--ink-soft)'}>
                                            {item.icon}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                    </button>
                                );
                            })}
                            <div className="h-px bg-(--border-soft) my-1" />
                            <a
                                href={SUPPORT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-transparent text-(--ink) hover:bg-(--linen)/40 group cursor-pointer"
                                title="Soporte por WhatsApp"
                            >
                                <div className="shrink-0 transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
                                    <WhatsAppIcon size={20} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">Soporte</span>
                            </a>
                        </div>
                    )}
                </div>
            </nav>

            {/* Menú flotante de Estudiantes (Portal en document.body para evitar cualquier recorte de overflow) */}
            {showEstudiantesMenu && menuPosition && createPortal(
                <div className="fixed inset-0 z-9990 pointer-events-none">
                    {/* Backdrop invisible para cerrar al hacer clic fuera */}
                    <div 
                        className="fixed inset-0 pointer-events-auto" 
                        onClick={() => setShowEstudiantesMenu(false)} 
                    />
                    
                    {/* Tarjeta de opciones */}
                    <div
                        style={{
                            position: 'fixed',
                            bottom: `${menuPosition.bottom}px`,
                            left: `${menuPosition.left}px`,
                            transform: 'translateX(-50%)',
                        }}
                        className="pointer-events-auto bg-white border border-(--border-soft) rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-44 z-9999 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                        <button
                            type="button"
                            onClick={handleGoEstudiantes}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full group ${
                                isEstudiantesFichaActive 
                                    ? 'bg-(--linen) text-(--ink)' 
                                    : 'text-(--ink) hover:bg-(--linen)/40'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <User size={15} className={isEstudiantesFichaActive ? 'text-(--primary)' : 'text-(--ink-soft) group-hover:text-(--ink)'} />
                                <span>Estudiantes</span>
                            </div>
                            {isEstudiantesFichaActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-(--primary)" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleGoEvidencias}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full group ${
                                isEvidenciasActive 
                                    ? 'bg-(--linen) text-(--ink)' 
                                    : 'text-(--ink) hover:bg-(--linen)/40'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <FolderOpen size={15} className="text-[#537BAC]" />
                                <span>Evidencias</span>
                            </div>
                            {isEvidenciasActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-(--primary)" />
                            )}
                        </button>
                        <div className="h-px bg-(--border-soft) my-0.5" />
                        <button
                            type="button"
                            onClick={handleOpenDescargarQr}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-(--ink) hover:bg-(--linen)/40 transition-colors cursor-pointer text-left w-full group"
                        >
                            <QrCode size={15} className="text-[#DEAE4D]" />
                            <span>Descargar QR</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal para seleccionar curso antes de descargar el PDF de códigos QR */}
            <DescargarQrModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                cursos={cursos || []}
                onDescargar={handleExecuteDescargarPdf}
                isGenerating={isGeneratingPdf}
            />
        </>
    );
};

export default BottomNav;
