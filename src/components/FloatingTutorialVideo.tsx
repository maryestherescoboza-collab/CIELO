
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, Maximize2, Minimize2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import {
    isNewUserAccount,
    loadIniciacionProgress,
    type IniciacionProgress,
} from '../guides/iniciacionState';

interface FloatingTutorialVideoProps {
    session: Session | null;
    currentUserProfile?: UserProfile | null;
}

const STORAGE_KEY_PREFIX = 'cielo_tutorial_secuencia_descartado_';
const YOUTUBE_VIDEO_ID = 'GWi57nAoBgE';
// Note: enablejsapi=1 allows advanced control if needed, rel=0 avoids outside video suggestions
const YOUTUBE_EMBED_URL = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&enablejsapi=1`;
const YOUTUBE_THUMBNAIL_URL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`;

export const FloatingTutorialVideo: React.FC<FloatingTutorialVideoProps> = ({
    session,
    currentUserProfile,
}) => {
    const userId = session?.user?.id;
    const [isDismissed, setIsDismissed] = useState<boolean>(true);
    const [isAllowedByIniciacion, setIsAllowedByIniciacion] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Ref para el iframe del reproductor
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // 1. Evaluar si el usuario tiene permitido ver el video según su estado de iniciación y descarte
    const evaluateVisibility = useCallback(() => {
        if (!userId) {
            setIsDismissed(true);
            setIsAllowedByIniciacion(false);
            return;
        }

        // A. Verificar si el usuario ya descartó el tutorial permanentemente (BD o localStorage)
        const localDismissed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) === 'true';
        const metaDismissed = Boolean(session?.user?.user_metadata?.tutorial_secuencia_descartado);
        const profileDismissed = Boolean(currentUserProfile?.tutorial_secuencia_descartado);

        if (localDismissed || metaDismissed || profileDismissed) {
            setIsDismissed(true);
            return;
        }

        // B. CONDICIÓN PRIORITARIA PARA USUARIOS NUEVOS:
        // Si la cuenta fue creada a partir de la fecha de corte oficial de CIELO y
        // todavía no ha completado la guía de iniciación oficial, NO se debe mostrar el video.
        const isNew = isNewUserAccount(session?.user);
        if (isNew) {
            const iniciacionProgress = loadIniciacionProgress(userId, session?.user?.user_metadata);
            if (!iniciacionProgress.completed) {
                // Bloqueado hasta que termine la guía de iniciación oficial
                setIsAllowedByIniciacion(false);
                setIsDismissed(false);
                return;
            }
        }

        // Cuentas existentes o cuentas nuevas con guía completada
        setIsAllowedByIniciacion(true);
        setIsDismissed(false);
    }, [userId, session?.user, currentUserProfile?.tutorial_secuencia_descartado]);

    // Ejecutar evaluación al montar o al cambiar la sesión / perfil
    useEffect(() => {
        evaluateVisibility();
    }, [evaluateVisibility]);

    // 2. Escuchar en tiempo real los eventos de finalización de la guía de iniciación
    useEffect(() => {
        const handleIniciacionUpdated = (e: Event) => {
            const detail = (e as CustomEvent<IniciacionProgress>).detail;
            if (detail?.completed) {
                evaluateVisibility();
            }
        };

        const handleIniciacionCelebration = () => {
            evaluateVisibility();
        };

        window.addEventListener('cielo-iniciacion-updated', handleIniciacionUpdated);
        window.addEventListener('cielo-iniciacion-celebration', handleIniciacionCelebration);

        return () => {
            window.removeEventListener('cielo-iniciacion-updated', handleIniciacionUpdated);
            window.removeEventListener('cielo-iniciacion-celebration', handleIniciacionCelebration);
        };
    }, [evaluateVisibility]);

    // 3. Guardar permanentemente la decisión "No volver a mostrar" en Supabase
    const handleDismissPermanently = useCallback(async () => {
        if (!userId) return;

        // Ocultar de inmediato sin latencia percibida
        setIsDismissed(true);
        setIsPlaying(false);
        setIsExpanded(false);
        setIsSaving(true);

        try {
            // Guardar en localStorage
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, 'true');

            // Actualizar Zustand
            useAppStore.setState((s) => ({
                ...s,
                state: {
                    ...s.state,
                    perfiles: s.state.perfiles.map((p) =>
                        p.userId === userId ? { ...p, tutorial_secuencia_descartado: true } : p
                    ),
                },
            }));

            // Persistir en paralelo en Supabase Auth y tabla perfiles
            await Promise.allSettled([
                supabase.auth.updateUser({
                    data: { tutorial_secuencia_descartado: true },
                }),
                supabase
                    .from('perfiles')
                    .update({ tutorial_secuencia_descartado: true })
                    .eq('user_id', userId),
            ]);
        } catch (err) {
            console.warn('[FloatingTutorialVideo] Error guardando preferencia de tutorial:', err);
        } finally {
            setIsSaving(false);
        }
    }, [userId]);

    // 4. Iniciar reproducción (abre por defecto en modal grande para comenzar)
    const handleStartPlayback = useCallback(() => {
        setIsPlaying(true);
        setIsExpanded(true);
    }, []);

    // 5. Cerrar el modal grande: el video minimiza a la derecha y SIGUE reproduciéndose
    const handleMinimizeFromModal = useCallback(() => {
        setIsExpanded(false);
    }, []);

    // 6. Detener por completo la reproducción del video
    const handleStopPlayback = useCallback(() => {
        setIsPlaying(false);
        setIsExpanded(false);
    }, []);

    // 7. Manejo de teclado Escape (minimiza en vez de destruir el video si está reproduciendo)
    useEffect(() => {
        if (!isExpanded) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleMinimizeFromModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, handleMinimizeFromModal]);

    // Regla de salida: no renderizar si no hay usuario, si fue descartado, o si es nuevo y no ha completado la guía
    if (!userId || isDismissed || !isAllowedByIniciacion) {
        return null;
    }

    return (
        <>
            <style>{`
                @keyframes cieloFloatingAnimation {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-6px);
                    }
                }
            `}</style>

            {/* Backdrop sutil cuando está en modo modal expandido (z-60 detrás del modal z-70) */}
            {isExpanded &&
                createPortal(
                    <div
                        className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
                        onClick={handleMinimizeFromModal}
                        aria-hidden="true"
                    />,
                    document.body
                )}

            {/* Contenedor principal único: mantiene el iframe vivo sin reiniciarlo al alternar modos */}
            {createPortal(
                <aside
                    aria-label="Tutorial de secuencias didácticas de bienvenida"
                    className={`transition-all duration-300 select-none ${isExpanded
                            ? 'fixed z-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-3xl'
                            : 'fixed right-3.5 bottom-20 sm:right-6 sm:bottom-8 z-40 w-[calc(100vw-1.75rem)] max-w-71.25 sm:max-w-77.5'
                        }`}
                    style={!isExpanded ? { animation: 'cieloFloatingAnimation 4s ease-in-out infinite' } : undefined}
                >
                    <div
                        className={`bg-[#FCFCFA] rounded-2xl border border-black/10 transition-all duration-300 flex flex-col overflow-hidden ${isExpanded
                                ? 'shadow-2xl'
                                : 'shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.08)] p-3 sm:p-3.5 hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.18)] hover:[animation-play-state:paused]'
                            }`}
                    >
                        {/* ────────────────────────────────────────────────────────── */}
                        {/* CASO A: MODO EXPANDIDO (MODAL GRANDE CON REPRODUCTOR)      */}
                        {/* ────────────────────────────────────────────────────────── */}
                        {isExpanded ? (
                            <>
                                {/* Cabecera del modal expandido */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-[#F7F5F0]">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#C63D3D] text-white shrink-0">
                                            TUTORIAL CIELO
                                        </span>
                                        <h3 className="text-xs sm:text-sm font-bold text-[#1F2421] truncate">
                                            ¿Cómo subir toda tu secuencia para evaluar sus actividades?
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Botón Minimizar: vuelve a flotar a la derecha sin detener el video */}
                                        <button
                                            type="button"
                                            onClick={handleMinimizeFromModal}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#5F665E] hover:text-[#1F2421] hover:bg-black/5 transition-colors cursor-pointer"
                                            title="Minimizar y continuar trabajando en CIELO"
                                            aria-label="Minimizar video y continuar trabajando"
                                        >
                                            <Minimize2 size={14} />
                                            <span className="hidden sm:inline">Minimizar</span>
                                        </button>
                                        {/* Botón Cerrar: detiene la reproducción y vuelve a la tarjeta flotante */}
                                        <button
                                            type="button"
                                            onClick={handleStopPlayback}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                                            title="Cerrar video"
                                            aria-label="Cerrar video"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Contenedor de Video (Iframe activo, proporción 16:9 clara y sin capas oscuras) */}
                                <div className="relative z-10 aspect-video w-full bg-black">
                                    <iframe
                                        ref={iframeRef}
                                        src={YOUTUBE_EMBED_URL}
                                        title="Tutorial: Cómo subir toda tu secuencia para evaluar sus actividades en CIELO"
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>

                                {/* Pie del modal expandido */}
                                <div className="px-4 py-2.5 bg-[#F7F5F0] border-t border-black/10 flex items-center justify-between gap-3 text-xs">
                                    <button
                                        type="button"
                                        onClick={handleDismissPermanently}
                                        disabled={isSaving}
                                        className="text-[11px] font-semibold text-[#5F665E] hover:text-[#1F2421] transition-colors cursor-pointer hover:underline disabled:opacity-50"
                                    >
                                        {isSaving ? 'Guardando...' : 'No volver a mostrar este tutorial'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleMinimizeFromModal}
                                        className="px-3.5 py-1.5 bg-[#1F2421] hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                        <Minimize2 size={13} />
                                        <span>Seguir trabajando</span>
                                    </button>
                                </div>
                            </>
                        ) : isPlaying ? (
                            /* ────────────────────────────────────────────────────────── */
                            /* CASO B: MODO MINI-REPRODUCTOR FLOTANTE EN VIVO             */
                            /* El video continúa reproduciéndose mientras el usuario navega */
                            /* ────────────────────────────────────────────────────────── */
                            <>
                                {/* Cabecera compacta del mini reproductor */}
                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-[#C63D3D] text-white shrink-0">
                                            EN VIVO
                                        </span>
                                        <span className="text-[11px] font-bold text-[#1F2421] truncate">
                                            Subir secuencia didáctica
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsExpanded(true)}
                                            className="p-1 rounded-md text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                                            title="Ampliar video"
                                            aria-label="Ampliar video"
                                        >
                                            <Maximize2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStopPlayback}
                                            className="p-1 rounded-md text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                                            title="Detener video"
                                            aria-label="Detener video"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Iframe en tamaño compacto (continúa sin recarga ni interrupción) */}
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-black/10 shadow-inner">
                                    <iframe
                                        ref={iframeRef}
                                        src={YOUTUBE_EMBED_URL}
                                        title="Tutorial: Cómo subir toda tu secuencia para evaluar sus actividades en CIELO"
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </div>

                                {/* Acciones en modo compacto */}
                                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(true)}
                                        className="font-bold text-[#C63D3D] hover:text-[#B33232] transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        <Maximize2 size={12} />
                                        <span>Ampliar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDismissPermanently}
                                        disabled={isSaving}
                                        className="text-[#5F665E] hover:text-[#1F2421] transition-colors cursor-pointer hover:underline disabled:opacity-50 text-[10.5px]"
                                    >
                                        No volver a mostrar
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* ────────────────────────────────────────────────────────── */
                            /* CASO C: TARJETA FLOTANTE INICIAL (CON MINIATURA)           */
                            /* ────────────────────────────────────────────────────────── */
                            <>
                                {/* Encabezado con etiqueta y botón de descartar */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-[#C63D3D] text-white shadow-2xs">
                                        IMPORTANTE
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleDismissPermanently}
                                        disabled={isSaving}
                                        title="No volver a mostrar"
                                        aria-label="No volver a mostrar tutorial"
                                        className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Pregunta principal */}
                                <h3 className="text-[12.5px] font-bold text-[#1F2421] leading-snug tracking-tight mb-2.5">
                                    ¿Cómo subir toda tu secuencia para evaluar sus actividades?
                                </h3>

                                {/* Miniatura interactiva con botón de reproducción */}
                                <div
                                    onClick={handleStartPlayback}
                                    className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group bg-neutral-900 border border-black/10 shadow-inner"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleStartPlayback();
                                        }
                                    }}
                                    aria-label="Reproducir video tutorial"
                                >
                                    <img
                                        src={YOUTUBE_THUMBNAIL_URL}
                                        alt="Miniatura tutorial secuencias didácticas"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-white/95 text-[#1F2421] shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-[#C63D3D] group-hover:text-white transition-all duration-200">
                                            <Play size={17} className="fill-current ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="mt-2.5 flex flex-col gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleStartPlayback}
                                        className="w-full py-2 px-3 bg-[#C63D3D] hover:bg-[#B33232] active:bg-[#962828] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Play size={13} className="fill-white" />
                                        <span>Ver tutorial</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDismissPermanently}
                                        disabled={isSaving}
                                        className="w-full py-1.5 px-2 text-center text-[11px] font-semibold text-[#5F665E] hover:text-[#1F2421] transition-colors cursor-pointer hover:underline disabled:opacity-50"
                                    >
                                        {isSaving ? 'Guardando...' : 'No volver a mostrar'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </aside>,
                document.body
            )}
        </>
    );
};
export default FloatingTutorialVideo;
