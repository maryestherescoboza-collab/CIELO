import React, { useState, useEffect } from 'react';
import type { Post, ComunidadUIState, ResourceData } from '../../types';
import { CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
import Rubrica from '../../screens/Rubrica';
import Cotejo from '../../screens/Cotejo';
import Planificacion from '../../screens/Planificacion';
import { supabase } from '../../lib/supabase';
import { COMPETENCIAS } from '../RubricaRow';

interface Props {
    uiState: ComunidadUIState;
    setUiState: React.Dispatch<React.SetStateAction<ComunidadUIState>>;
    posts: Post[];
    onImportResource: (tipo: Post['tipo'], resourceData: ResourceData, recursoId?: number) => void;
    onReportPost: (postId: number, razon: string, comentario?: string) => Promise<void>;
    showSuccessToast: boolean;
    setShowSuccessToast: (show: boolean) => void;
}

const getTipoLabel = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'Rúbrica';
        case 'cotejo': return 'Cotejo';
        case 'secuencia': return 'Planificación';
        default: return 'General';
    }
};

const getTagStyles = (tipo: Post['tipo']) => {
    switch (tipo) {
        case 'rubrica': return 'bg-[#FDF2F2] text-[#E02424] border-transparent';
        case 'cotejo': return 'bg-[#FFFBEB] text-[#D97706] border-transparent';
        case 'secuencia': return 'bg-[#ECFDF5] text-[#059669] border-transparent';
        default: return 'bg-slate-100 text-slate-600 border-transparent';
    }
};

export default function ModalsManager({ 
    uiState, setUiState, posts, onImportResource, 
    onReportPost, showSuccessToast, setShowSuccessToast 
}: Props) {
    const selectedPost = posts.find(p => p.id === uiState.selectedPostId);
    
    // Internal states for Report Modal and Preview Modal
    const [reportReason, setReportReason] = useState<string>('');
    const [reportComment, setReportComment] = useState<string>('');
    const [isReporting, setIsReporting] = useState(false);

    // Live data fetching for preview
    // Flujo: POST -> post.recurso_id -> recurso real -> datos reales ->
    //        componente original (Rubrica/Cotejo/Planificacion) en readOnly.
    const [liveData, setLiveData] = useState<any>(null);
    const [isLoadingLive, setIsLoadingLive] = useState(false);

    // Desempaqueta el snapshot de recurso_datos (puede venir como JSON string,
    // como objeto plano del snapshot publicado, o como fila completa de plantillas
    // con su columna 'datos').
    const parseSnapshot = (raw: any): any => {
        if (!raw) return {};
        let datos = raw;
        if (typeof raw === 'string') {
            try { datos = JSON.parse(raw); } catch { return {}; }
        }
        if (datos && typeof datos === 'object' && !Array.isArray(datos)
            && datos.datos && typeof datos.datos === 'object' && !Array.isArray(datos.datos)) {
            datos = datos.datos;
        }
        return datos || {};
    };

    // Rubrica.tsx (readOnly) ejecuta normalizeDescriptors(descriptors, selectedPlantillaId)
    // con selectedPlantillaId = null, por lo que SOLO empareja descriptores con
    // plantillaId falsy. Normalizamos aquí la estructura real del recurso publicado:
    // 4 competencias (BC1..BC4) con sus textos y plantillaId = null.
    const normalizeRubricaDescriptors = (descriptors: any[]): any[] => {
        if (!Array.isArray(descriptors) || descriptors.length === 0) return [];
        return COMPETENCIAS.map(({ bc }) => {
            const d = descriptors.find(x => String(x?.bc).toUpperCase() === String(bc).toUpperCase());
            return {
                id: d?.id ?? `competencia-${bc}`,
                bc,
                indicador: d?.indicador || bc,
                estrategico: d?.estrategico ?? '',
                autonomo: d?.autonomo ?? '',
                resolutivo: d?.resolutivo ?? '',
                receptivo: d?.receptivo ?? '',
                plantillaId: null
            };
        });
    };

    // Cotejo.tsx (readOnly) lee crit.descripcion. Normalizamos { id, titulo, descripcion }.
    const normalizeCotejoCriterios = (criterios: any[]): any[] => {
        if (!Array.isArray(criterios)) return [];
        return criterios.map((c, i) => ({
            id: typeof c?.id === 'number' ? c.id : i + 1,
            titulo: c?.titulo ?? '',
            descripcion: c?.descripcion ?? c?.titulo ?? ''
        }));
    };

    useEffect(() => {
        let isMounted = true;
        const fetchLiveData = async () => {
            if (!selectedPost || uiState.activeModal !== 'preview') return;
            setIsLoadingLive(true);
            try {
                const tipo = selectedPost.tipo;
                const recursoId = selectedPost.recursoId;
                const snapshot = parseSnapshot(selectedPost.recursoDatos);

                let fetched: any = null;

                if (tipo === 'rubrica') {
                    let descriptors: any[] | null = Array.isArray(snapshot?.descriptores) ? snapshot.descriptores : null;
                    let niveles = snapshot?.niveles;

                    if ((!descriptors || descriptors.length === 0) && recursoId) {
                        const [descRes, plantRes] = await Promise.all([
                            supabase.from('descriptores_rubrica').select('*').eq('plantilla_id', recursoId),
                            supabase.from('plantillas').select('*').eq('id', recursoId).maybeSingle()
                        ]);
                        if (descRes.error) console.error('[Comunidad] Error al obtener descriptores_rubrica:', descRes.error);
                        if (plantRes.error) console.error('[Comunidad] Error al obtener plantilla:', plantRes.error);
                        if (descRes.data) descriptors = descRes.data as any[];
                        const plDatos = (plantRes.data as any)?.datos;
                        if (!niveles && plDatos?.niveles) niveles = plDatos.niveles;
                    }

                    fetched = {
                        nombre: snapshot?.nombre || snapshot?.titulo || '',
                        descriptores: normalizeRubricaDescriptors(descriptors || []),
                        ...(niveles ? { niveles } : {})
                    };
                } else if (tipo === 'cotejo') {
                    let criterios: any[] | null = Array.isArray(snapshot?.criterios) ? snapshot.criterios : null;
                    let niveles = snapshot?.niveles;

                    if ((!criterios || criterios.length === 0) && recursoId) {
                        const plantRes = await supabase.from('plantillas').select('*').eq('id', recursoId).maybeSingle();
                        if (plantRes.error) console.error('[Comunidad] Error al obtener plantilla cotejo:', plantRes.error);
                        const plDatos = (plantRes.data as any)?.datos;
                        const critIds = Array.isArray(plDatos?.criterios) ? plDatos.criterios.map((c: any) => c?.id) : [];
                        if (critIds.length > 0) {
                            const critRes = await supabase.from('criterios_cotejo').select('*').in('id', critIds);
                            if (critRes.error) console.error('[Comunidad] Error al obtener criterios_cotejo:', critRes.error);
                            if (critRes.data) criterios = critRes.data as any[];
                        }
                        if (!niveles && plDatos?.niveles) niveles = plDatos.niveles;
                    }

                    fetched = {
                        nombre: snapshot?.nombre || snapshot?.titulo || '',
                        criterios: normalizeCotejoCriterios(criterios || []),
                        ...(niveles ? { niveles } : {})
                    };
                } else if (tipo === 'secuencia') {
                    let datos = snapshot?.contenidoHtml ? snapshot : null;
                    if (!datos && recursoId) {
                        const seqRes = await supabase.from('secuencias').select('*').eq('id', recursoId).maybeSingle();
                        if (seqRes.error) console.error('[Comunidad] Error al obtener secuencia:', seqRes.error);
                        const s = seqRes.data as any;
                        if (s) datos = { titulo: s.titulo, fechaInicio: s.fecha_inicio, contenidoHtml: s.contenido_html };
                    }
                    fetched = datos || snapshot || {};
                }

                if (isMounted) setLiveData(fetched);
            } catch (error) {
                console.error('Error fetching live resource data:', error);
            } finally {
                if (isMounted) setIsLoadingLive(false);
            }
        };

        setLiveData(null);
        fetchLiveData();

        return () => { isMounted = false; };
    }, [selectedPost, uiState.activeModal]);

    if (!uiState.activeModal || !selectedPost) return (
        <>
            {showSuccessToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-top-10">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                        <span className="font-bold text-[11px] uppercase tracking-widest">Recurso añadido a tu biblioteca</span>
                    </div>
                </div>
            )}
        </>
    );

    const handleClose = () => {
        setUiState({ activeModal: null, selectedPostId: null });
    };

    const handleConfirmReport = async () => {
        if (!uiState.selectedPostId || reportReason === '' || isReporting) return;
        setIsReporting(true);
        try {
            await onReportPost(uiState.selectedPostId, reportReason, reportComment);
            setUiState({ activeModal: null, selectedPostId: null });
            setReportReason('');
            setReportComment('');
        } catch (error) {
            console.error('Error al reportar el post:', error);
        } finally {
            setIsReporting(false);
        }
    };

    const handleUseResource = () => {
        if (!selectedPost.recursoDatos && !selectedPost.recursoId) return;
        onImportResource(selectedPost.tipo, selectedPost.recursoDatos as ResourceData, selectedPost.recursoId);
        setUiState({ activeModal: null, selectedPostId: null });
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };



    return (
        <>
            {uiState.activeModal === 'preview' && selectedPost && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-none w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center border shadow-sm ${getTagStyles(selectedPost.tipo)}`}>
                                    <span className="material-symbols-outlined text-2xl">
                                        {selectedPost.tipo === 'rubrica' ? 'table_chart' : selectedPost.tipo === 'cotejo' ? 'fact_check' : 'list_alt'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 leading-snug">
                                        {(liveData as any)?.nombre || (liveData as any)?.titulo || selectedPost.recursoDatos?.nombre || selectedPost.recursoDatos?.titulo || 'Recurso Pedagógico'}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{getTipoLabel(selectedPost.tipo)}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-slate-50/30 relative">
                            {isLoadingLive && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-turf-green-base border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando recurso real...</span>
                                    </div>
                                </div>
                            )}
                            {selectedPost.tipo === 'rubrica' && !isLoadingLive && liveData && (
                                <Rubrica
                                    readOnly={true}
                                    initialDatos={liveData}
                                />
                            )}
                            {selectedPost.tipo === 'cotejo' && !isLoadingLive && liveData && (
                                <Cotejo
                                    readOnly={true}
                                    initialDatos={liveData}
                                />
                            )}
                            {selectedPost.tipo === 'secuencia' && !isLoadingLive && liveData && (
                                <Planificacion
                                    readOnly={true}
                                    initialDatos={liveData}
                                />
                            )}
                        </div>

                        <div className="px-10 py-6.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all outline-none"
                            >
                                Cerrar
                            </button>

                            <button
                                onClick={() => setUiState({ activeModal: 'import', selectedPostId: selectedPost.id })}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 outline-none"
                            >
                                <span className="material-symbols-outlined text-[16px]">cloud_download</span>
                                <span>Incorporar a mis recursos</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Confirmation Modal */}
            {uiState.activeModal === 'import' && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <div className="bg-white rounded-none w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl text-emerald-500">cloud_download</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">¿Añadir recurso?</h3>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                Se guardará <span className="text-slate-900 font-bold">"{selectedPost.recursoDatos?.nombre || selectedPost.recursoDatos?.titulo || 'este recurso'}"</span> en tu biblioteca personal para usar en tus cursos.
                            </p>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col gap-3">
                            <button
                                onClick={handleUseResource}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all"
                            >
                                Confirmar y guardar
                            </button>
                            <button
                                onClick={() => setUiState({ activeModal: null, selectedPostId: null })}
                                className="w-full py-4 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {uiState.activeModal === 'report' && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-none w-full max-w-md overflow-hidden shadow-2xl animate-scale-up border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-rose-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                                <ShieldAlert size={40} className="text-rose-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Reportar contenido</h3>
                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                                ¿Deseas reportar este instrumento pedagógico por contenido inapropiado o plagio? Nuestro equipo lo revisará en breve.
                            </p>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col gap-4">
                            <div className="space-y-4">
                                <select 
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                                >
                                    <option value="">Selecciona una razón...</option>
                                    <option value="plagio">Plagio / Contenido copiado</option>
                                    <option value="inapropiado">Contenido inapropiado</option>
                                    <option value="error">Error técnico en recurso</option>
                                    <option value="otro">Otro</option>
                                </select>
                                <textarea
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Comentarios adicionales (opcional)..."
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none min-h-25 resize-none shadow-sm transition-all"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    disabled={!reportReason || isReporting}
                                    onClick={handleConfirmReport}
                                    className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isReporting && <Activity size={16} className="animate-spin" />}
                                    {isReporting ? 'ENVIANDO REPORTE...' : 'CONFIRMAR REPORTE'}
                                </button>
                                <button
                                    onClick={() => setUiState({ activeModal: null, selectedPostId: null })}
                                    className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-top-10">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                        <span className="font-bold text-[11px] uppercase tracking-widest">Recurso añadido a tu biblioteca</span>
                    </div>
                </div>
            )}
        </>
    );
}
