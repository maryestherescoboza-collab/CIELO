import type { AppState, BCKey } from '../../types';

export interface BoletinTemplateProps {
    curso: any;
    estudiantes: any[];
    docenteNombre: string;
    studentGrades: Record<number, Record<string, {
        P1: Record<BCKey, number | null>;
        P2: Record<BCKey, number | null>;
        P3: Record<BCKey, number | null>;
        P4: Record<BCKey, number | null>;
        PC: Record<BCKey, number | null>;
        finalGrade: number | null;
    }>>;
    state: AppState;
}
