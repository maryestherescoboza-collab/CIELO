import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Screen } from '../types';
import { useAppStore } from '../store/appStore';

import Header from './layout/Header';
import BottomNav from './layout/BottomNav';
import ProfileSidebar from './layout/ProfileSidebar';
import NotificationDropdown from './layout/NotificationDropdown';
import ResetModal from './layout/ResetModal';

interface Props {
    onResetSchoolYear: () => void;
    onLogout?: () => void;
    onUpdateBio: (bio: string) => Promise<void>;
    onUploadAvatar: (file: File) => Promise<string | null>;
    onOpenSettings?: () => void;
    onMarkNotifyRead?: (id: number) => Promise<void> | void;
    onCompleteTarea?: (tareaId: string) => void;
    onSelectSearchResult: (type: 'estudiante' | 'curso' | 'actividad', id: number) => void;
}

export default function Layout({
    onResetSchoolYear, onLogout,
    onUpdateBio, onUploadAvatar,
    onOpenSettings, onSelectSearchResult,
    onMarkNotifyRead, onCompleteTarea,
    children
}: Props & { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const { 
        searchQuery, setSearchQuery, 
        darkMode, setDarkMode,
        state, session
    } = useAppStore();

    const normalizeStr = (str: string) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const searchResults = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return null;

        const normalizedQuery = normalizeStr(query);

        const filteredEstudiantes = (state.estudiantes || []).filter(e => {
            const fullName = `${e.nombre || ''} ${e.apellido || ''}`;
            return normalizeStr(fullName).includes(normalizedQuery) ||
                   normalizeStr(e.nombre || '').includes(normalizedQuery) ||
                   normalizeStr(e.apellido || '').includes(normalizedQuery);
        });

        const filteredCursos = (state.cursos || []).filter(c => {
            return normalizeStr(c.nombre || '').includes(normalizedQuery) ||
                   normalizeStr(c.asignatura || '').includes(normalizedQuery) ||
                   normalizeStr(c.grado || '').includes(normalizedQuery) ||
                   normalizeStr(c.seccion || '').includes(normalizedQuery);
        });

        const filteredActividades = (state.actividades || []).filter(a => {
            return normalizeStr(a.nombre || '').includes(normalizedQuery) ||
                   normalizeStr(a.asignatura || '').includes(normalizedQuery);
        });

        return {
            estudiantes: filteredEstudiantes,
            cursos: filteredCursos,
            actividades: filteredActividades
        };
    }, [searchQuery, state.estudiantes, state.cursos, state.actividades]);

    const currentScreen = (location.pathname === '/' ? 'inicio' : location.pathname.substring(1)) as Screen;
    const onNavigate = useCallback((s: Screen) => navigate(s === 'inicio' ? '/' : `/${s}`), [navigate]);

    const currentUserProfile = useMemo(() => state.perfiles.find(p => p.userId === session?.user?.id), [state.perfiles, session]);
    const docenteNombre = useMemo(() => state.nombreDocente || currentUserProfile?.nombreDocente || session?.user?.email?.split('@')[0] || 'Docente', [state.nombreDocente, currentUserProfile, session]);
    const perfilBio = state.perfilBio || currentUserProfile?.bio || '';
    const perfilAvatarUrl = state.perfilAvatarUrl || currentUserProfile?.avatarUrl || '';
    
    const [showNotifs, setShowNotifs] = useState(false);

    const [showProfile, setShowProfile] = useState(false);
    const [localBio, setLocalBio] = useState(perfilBio);
    const [editingProfile, setEditingProfile] = useState(false);
    const [activeProfile, setActiveProfile] = useState<{ userId?: string; nombre: string; avatar?: string; materias?: string; descripcion?: string; stats?: { cursos?: string }; isOwn?: boolean } | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [bioSaving, setBioSaving] = useState(false);
    const [localAvatarUrl, setLocalAvatarUrl] = useState(perfilAvatarUrl);
    const [showResetModal, setShowResetModal] = useState(false);
    const [confirmKeyword, setConfirmKeyword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setLocalBio(perfilBio); }, [perfilBio]);
    useEffect(() => { setLocalAvatarUrl(perfilAvatarUrl); }, [perfilAvatarUrl]);

    useEffect(() => {
        const handleShowProfile = (e: CustomEvent) => {
            const d = (e as CustomEvent).detail as { userId?: string; nombre?: string; avatar?: string; materias?: string; descripcion?: string; stats?: { cursos?: string } };
            const clickedUserId = d?.userId;
            
            if (clickedUserId && clickedUserId !== session?.user?.id) {
                const userProfile = state.perfiles.find(p => p.userId === clickedUserId);
                if (userProfile) {
                    setActiveProfile({
                        userId: clickedUserId,
                        nombre: userProfile.nombreDocente || '',
                        avatar: userProfile.avatarUrl || undefined,
                        materias: userProfile.asignatura || 'Docente',
                        descripcion: userProfile.bio || 'Docente innovador comprometido con el desarrollo pedagógico.',
                        isOwn: false
                    });
                }
            } else if (d && d.nombre) {
                setActiveProfile({
                    userId: d.userId,
                    nombre: d.nombre,
                    avatar: d.avatar,
                    materias: d.materias,
                    descripcion: d.descripcion,
                    stats: d.stats,
                    isOwn: false
                });
            } else {
                setActiveProfile({
                    userId: session?.user?.id,
                    nombre: docenteNombre,
                    avatar: localAvatarUrl || undefined,
                    materias: 'Docente Titular',
                    descripcion: localBio || 'Docente innovador comprometido con el desarrollo de competencias transversales.',
                    isOwn: true,
                });
            }
            setShowProfile(true);
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowProfile(false);
                setShowResetModal(false);
            }
        };

        window.addEventListener('keydown', handleEsc);
        window.addEventListener('show-profile', handleShowProfile as EventListener);
        return () => {
            window.removeEventListener('keydown', handleEsc);
            window.removeEventListener('show-profile', handleShowProfile as EventListener);
        };
    }, [docenteNombre, localBio, localAvatarUrl]);



    const saveBio = async () => {
        setBioSaving(true);
        await onUpdateBio(localBio);
        setBioSaving(false);
        setEditingProfile(false);
        if (activeProfile?.isOwn) {
            setActiveProfile(prev => prev ? { ...prev, descripcion: localBio } : null);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        const url = await onUploadAvatar(file);
        if (url) {
            setLocalAvatarUrl(url);
            if (activeProfile?.isOwn) {
                setActiveProfile(prev => prev ? { ...prev, avatar: url } : null);
            }
        }
        setUploadingAvatar(false);
    };

    const getAvatarSrc = (isOwn: boolean) => {
        if (isOwn && localAvatarUrl) return localAvatarUrl;
        return activeProfile?.avatar || null;
    };

    const hasUnread = useMemo(() => state.notificaciones.some(n => !n.leida), [state.notificaciones]);

    const logrosPedagogicos = useMemo(() => {
        const result = {
            estudiantesEvaluados: 0,
            actividadesAplicadas: 0,
            actividadesRubricas: 0,
            actividadesCotejo: 0,
            actividadesIndicadores: 0
        };

        if (activeProfile?.userId) {
            const targetUserId = activeProfile.userId;
            const myCourseIds = new Set(state.cursos.filter(c => c.userId === targetUserId).map(c => c.id));
            
            // 1. Estudiantes evaluados
            const evaluatedStudentIds = new Set();
            state.calificaciones.forEach(c => {
                if (c.userId === targetUserId && c.puntaje !== null) {
                    evaluatedStudentIds.add(c.estudianteId);
                }
            });
            state.cursoDetalle.forEach(cd => {
                if (myCourseIds.has(cd.cursoId)) {
                    const hasRubrica = cd.rubricaData && Object.keys(cd.rubricaData).length > 0;
                    const hasCotejo = cd.cotejoData && Object.keys(cd.cotejoData).length > 0;
                    if (hasRubrica || hasCotejo) {
                        evaluatedStudentIds.add(cd.estudianteId);
                    }
                }
            });
            result.estudiantesEvaluados = evaluatedStudentIds.size;

            // 2. Actividades aplicadas
            result.actividadesAplicadas = state.actividades.filter(a => a.userId === targetUserId || myCourseIds.has(a.cursoId)).length;

            // 3. Actividades evaluadas con rúbricas
            const activitiesWithRubric = new Set();
            state.cursoDetalle.forEach(cd => {
                if (myCourseIds.has(cd.cursoId) && cd.rubricaData && Object.keys(cd.rubricaData).length > 0) {
                    activitiesWithRubric.add(cd.actividadId);
                }
            });
            result.actividadesRubricas = activitiesWithRubric.size;

            // 4. Actividades evaluadas con lista de cotejo
            const activitiesWithCotejo = new Set();
            state.cursoDetalle.forEach(cd => {
                if (myCourseIds.has(cd.cursoId) && cd.cotejoData && Object.keys(cd.cotejoData).length > 0) {
                    activitiesWithCotejo.add(cd.actividadId);
                }
            });
            result.actividadesCotejo = activitiesWithCotejo.size;

            // 5. Actividades evaluadas por indicadores de logro
            const activitiesWithIndicators = new Set();
            state.calificaciones.forEach(c => {
                if (c.userId === targetUserId && c.puntaje !== null) {
                    activitiesWithIndicators.add(c.actividadId);
                }
            });
            result.actividadesIndicadores = activitiesWithIndicators.size;
        }
        return result;
    }, [state.cursos, state.calificaciones, state.cursoDetalle, state.actividades, activeProfile?.userId]);

    return (
        <div className="app-shell">
            <Header 
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                onSelectSearchResult={onSelectSearchResult}
                setShowNotifs={setShowNotifs}
                hasUnread={hasUnread}
                docenteNombre={docenteNombre}
                avatarUrl={localAvatarUrl}
                onOpenSettings={onOpenSettings}
            />

            <NotificationDropdown 
                showNotifs={showNotifs}
                notificaciones={state.notificaciones}

                onMarkNotifyRead={onMarkNotifyRead}
                onCompleteTarea={onCompleteTarea}
            />

            <main className="app-main">
                {children}
                <footer className="w-full text-center py-3 border-t border-(--border-soft) bg-white text-[9px] font-black text-(--ink-soft) uppercase tracking-widest select-none shrink-0">
                    CIELO está en Beta · Tu experiencia nos ayuda a mejorar
                </footer>
            </main>

            <BottomNav 
                currentScreen={currentScreen}
                onNavigate={onNavigate}
            />

            <ProfileSidebar 
                showProfile={showProfile}
                setShowProfile={setShowProfile}
                activeProfile={activeProfile}
                isOwnProfile={activeProfile?.isOwn === true}
                getAvatarSrc={getAvatarSrc}
                uploadingAvatar={uploadingAvatar}
                fileInputRef={fileInputRef}
                handleAvatarChange={handleAvatarChange}
                editingProfile={editingProfile}
                setEditingProfile={setEditingProfile}
                localBio={localBio}
                setLocalBio={setLocalBio}
                saveBio={saveBio}
                bioSaving={bioSaving}
                onOpenSettings={onOpenSettings}
                onOpenSuscripcion={() => navigate('/suscripcion')}
                setShowResetModal={setShowResetModal}
                onLogout={onLogout}
                logros={logrosPedagogicos}
            />

            <ResetModal 
                showResetModal={showResetModal}
                setShowResetModal={setShowResetModal}
                confirmKeyword={confirmKeyword}
                setConfirmKeyword={setConfirmKeyword}
                onResetSchoolYear={onResetSchoolYear}
                setShowProfile={setShowProfile}
            />
        </div>
    );
}
