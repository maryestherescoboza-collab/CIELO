import React from 'react';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';

interface AnnualGradesTableProps {
    allSubjects: any[];
    renderGradesCellsForSubject: (sub: any) => React.ReactNode;
}

const AnnualGradesTable: React.FC<AnnualGradesTableProps> = ({
    allSubjects,
    renderGradesCellsForSubject
}) => {
    const subjectsMap = React.useMemo(() => {
        const map = new Map<string, any>();
        allSubjects.forEach(s => {
            const nameStr = typeof s === 'string' ? s : (s?.name || '');
            const key = nameStr.replace(/_/g, ' ').toLowerCase().replace('matemáticas', 'matematica').replace('matemática', 'matematica').normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            map.set(key, s);
        });
        return map;
    }, [allSubjects]);

    return (
        <div className="overflow-x-auto no-scrollbar border border-[rgba(46,51,48,0.08)] rounded-[16px] bg-white overflow-hidden">
            <table className="w-full text-center border-collapse min-w-375">
                <thead>
                    <tr className="bg-(--background) text-[#2E3330] font-black uppercase text-xs tracking-wider">
                        <th rowSpan={3} className="w-70 px-6 text-left border-b-2 border-[rgba(46,51,48,0.08)]">ASIGNATURAS</th>
                        <th colSpan={16} className="py-3 border-b-2 border-r border-[rgba(46,51,48,0.08)]">COMPETENCIAS FUNDAMENTALES</th>
                        <th rowSpan={3} className="bg-(--linen)/40 border-x-2 border-[rgba(46,51,48,0.08)] px-2">PROMEDIO GRUPO DE<br/>COMPETENCIAS ESPECÍFICAS</th>
                        <th rowSpan={3} className="border-r border-[rgba(46,51,48,0.08)] px-2">CALIFICACIÓN<br/>COMPLETIVA</th>
                        <th rowSpan={3} className="border-r border-[rgba(46,51,48,0.08)] px-2">CALIFICACIÓN<br/>EXTRAORDINARIA</th>
                        <th rowSpan={3} className="border-r border-[rgba(46,51,48,0.08)] px-2">EVALUACIÓN<br/>ESPECIAL</th>
                        <th colSpan={2} className="bg-[#2E3330] text-white border-[rgba(46,51,48,0.08)]">SITUACIÓN FINAL</th>
                    </tr>
                    <tr className="bg-(--background) text-[#2E3330] font-black uppercase text-xs tracking-wider">
                        <th colSpan={4} className="border-x border-[rgba(46,51,48,0.08)] py-2 normal-case" title="BC1">Comunicativa</th>
                        <th colSpan={4} className="border-x border-[rgba(46,51,48,0.08)] py-2 normal-case" title="BC2">Pensamiento lógico, creativo y crítico; resolución de problemas</th>
                        <th colSpan={4} className="border-x border-[rgba(46,51,48,0.08)] py-2 normal-case" title="BC3">Científica y tecnológica; ambiental y de la salud</th>
                        <th colSpan={4} className="border-x border-[rgba(46,51,48,0.08)] py-2 normal-case" title="BC4">Desarrollo personal y espiritual; ética y ciudadana</th>
                        <th rowSpan={2} className="bg-white text-primary border-x border-[rgba(46,51,48,0.08)]">A</th>
                        <th rowSpan={2} className="bg-white text-danger border-r border-[rgba(46,51,48,0.08)]">R</th>
                    </tr>
                    <tr className="bg-(--background) text-[#2E3330] font-black uppercase text-xs tracking-wider">
                        {[1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4].map((p, i) => (
                            <th key={i} className="w-10 py-2 border-[rgba(46,51,48,0.04)]">P{p}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ASIGNATURAS_CATALOGO.map((subject) => {
                        const normalizedCatalogName = subject.nombre.replace(/_/g, ' ').toLowerCase().replace('matemáticas', 'matematica').replace('matemática', 'matematica').normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                        const matchingSub = subjectsMap.get(normalizedCatalogName);
                        const displaySub = matchingSub || { 
                            name: subject.nombre, 
                            isTutor: false, 
                            cursoId: undefined,
                            userId: undefined
                        };

                        const subName = typeof displaySub === 'string' ? displaySub : displaySub.name;

                        return (
                            <tr key={subject.id} className="hover:bg-(--background) transition-colors border-b border-[rgba(46,51,48,0.08)]">
                                <td className="text-left px-6 font-bold text-[14px] text-[#2E3330] border-r border-[rgba(46,51,48,0.08)] bg-white py-4">
                                    {subject.nombre}
                                </td>
                                {renderGradesCellsForSubject(subName)}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default React.memo(AnnualGradesTable);
