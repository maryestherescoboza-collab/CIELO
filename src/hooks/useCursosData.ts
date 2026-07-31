import { useState, useMemo, useCallback } from 'react';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';
import type { AppState } from '../types';

export function useCursosData(state: AppState) {
    const [showModal, setShowModal] = useState(false);
    const [editingDiasId, setEditingDiasId] = useState<number | null>(null);
    const [linkingCourseId, setLinkingCourseId] = useState<number | null>(null);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        nombre: '',
        asignatura: ASIGNATURAS_CATALOGO[0].id,
        grado: '1ro',
        seccion: 'A',
        periodo: 'P1',
        color: '#0f172a',
        diasSemana: ['Lun'],
        isTutorOficial: false
    });

    const resetForm = useCallback(() => {
        setForm({
            nombre: '',
            asignatura: ASIGNATURAS_CATALOGO[0].id,
            grado: '1ro',
            seccion: 'A',
            periodo: 'P1',
            color: '#0f172a',
            diasSemana: ['Lun'],
            isTutorOficial: false
        });
    }, []);

    const cursosWithCounts = useMemo(() => {
        return state.cursos.map(c => ({
            ...c,
            count: state.estudiantes.filter(e => e.sharedCourseId === c.sharedCourseId).length,
            docentesVinculadosRel: state.cursoDocentes?.filter(cd => cd.cursoId === c.id) || []
        }));
    }, [state.cursos, state.estudiantes, state.cursoDocentes]);

    const filteredPerfiles = useMemo(() => {
        if (!state.perfiles) return [];
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchNormalized = normalize(teacherSearch.trim());
        const myProfile = state.perfiles.find(p => p.nombreDocente === state.nombreDocente);
        
        return state.perfiles.filter(p => {
            const nameNorm = normalize(p.nombreDocente || '');
            const subjectNorm = normalize(p.asignatura || '');
            const matchesSearch = nameNorm.includes(searchNormalized) || 
                                 subjectNorm.includes(searchNormalized);
            const isMe = p.userId === myProfile?.userId;
            return matchesSearch && !isMe;
        });
    }, [state.perfiles, state.nombreDocente, teacherSearch]);

    return {
        showModal,
        setShowModal,
        editingDiasId,
        setEditingDiasId,
        linkingCourseId,
        setLinkingCourseId,
        teacherSearch,
        setTeacherSearch,
        isSaving,
        setIsSaving,
        form,
        setForm,
        resetForm,
        cursosWithCounts,
        filteredPerfiles
    };
}
