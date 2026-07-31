interface DashboardStatsProps {
    totalEstudiantes: number;
    actividadesEvaluadas: number;
    avgGeneral: number;
    totalCursos: number;
}

export function DashboardStats({ totalEstudiantes, actividadesEvaluadas, avgGeneral, totalCursos }: DashboardStatsProps) {
    const stats = [
        { label: 'Estudiantes', value: totalEstudiantes, bgImage: 'estudiantes.png', bg: 'bg-[#D8846C]', text: 'text-[#FDFBF7]', labelColor: 'text-[#FDFBF7]/80', lineBg: 'bg-[#FDFBF7]', accent: 'border-[#CB4834]/20' },
        { label: 'Actividades', value: actividadesEvaluadas, bgImage: 'actividades.png', bg: 'bg-[#D8B55A]', text: 'text-[#FDFBF7]', labelColor: 'text-[#FDFBF7]/80', lineBg: 'bg-[#1E293B]', accent: 'border-[#D8B55A]/20' },
        { label: 'Promedio G.', value: `${avgGeneral}%`, bgImage: 'promedio.png', bg: 'bg-[#7C9672]', text: 'text-[#FDFBF7]', labelColor: 'text-[#FDFBF7]/80', lineBg: 'bg-[#FDFBF7]', accent: 'border-[#7C9672]/20' },
        { label: 'Cursos Act.', value: totalCursos, bgImage: 'libro.png', bg: 'bg-[#6F94AF]', text: 'text-[#FDFBF7]', labelColor: 'text-[#FDFBF7]/80', lineBg: 'bg-[#FDFBF7]', accent: 'border-[#3F3C36]/20' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((s, i) => (
                <div key={i}
                    className={`card-saas min-h-35 relative overflow-hidden group hover:scale-[1.03] transition-all duration-500 border ${s.accent} ${s.bg} shadow-xl shadow-slate-900/20`}
                >
                    <div
                        className="absolute inset-0 z-0 opacity-25 pointer-events-none group-hover:opacity-40 transition-opacity duration-700"
                        style={{
                            backgroundImage: `url(${s.bgImage})`,
                            backgroundSize: '120px',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: '110% 110%',
                            filter: 'grayscale(100%) brightness(150%)',
                        }}
                    />

                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div>
                            <p className={`text-[13px] font-bold uppercase tracking-[0.15em] ${s.labelColor} mb-1`}>{s.label}</p>
                            <div className={`h-0.5 w-6 ${s.lineBg} opacity-25 group-hover:w-10 transition-all duration-500`}></div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-5xl font-semibold font-notion-title tracking-tight ${s.text} leading-none`}>{s.value}</p>
                            {s.label === 'Promedio G.' && <span className="text-[11px] font-black tracking-tighter text-[#1E293B] bg-white/50 px-2 py-1 rounded-full border border-black/10 animate-pulse">↑ 1.5%</span>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
