interface DashboardStatsProps {
    totalEstudiantes: number;
    actividadesEvaluadas: number;
    avgGeneral: number;
    totalCursos: number;
}

export function DashboardStats({ totalEstudiantes, actividadesEvaluadas, avgGeneral, totalCursos }: DashboardStatsProps) {
    const stats = [
        { label: 'Estudiantes', value: totalEstudiantes, bgImage: 'estudiantes.png', bg: 'bg-[#EB8847]', text: 'text-[#2E3330]', labelColor: 'text-[#2E3330]/80', lineBg: 'bg-[#2E3330]', accent: 'border-[#EB8847]/20' },
        { label: 'Actividades', value: actividadesEvaluadas, bgImage: 'actividades.png', bg: 'bg-[#F5BC5D]', text: 'text-[#2E3330]', labelColor: 'text-[#2E3330]/80', lineBg: 'bg-[#2E3330]', accent: 'border-[#F5BC5D]/20' },
        { label: 'Promedio G.', value: `${avgGeneral}%`, bgImage: 'promedio.png', bg: 'bg-[#ADC762]', text: 'text-[#F8F3ED]', labelColor: 'text-[#F8F3ED]/80', lineBg: 'bg-[#F8F3ED]', accent: 'border-[#ADC762]/20' },
        { label: 'Cursos Act.', value: totalCursos, bgImage: 'libro.png', bg: 'bg-[#6D8FB9]', text: 'text-[#F8F3ED]', labelColor: 'text-[#F8F3ED]/80', lineBg: 'bg-[#F8F3ED]', accent: 'border-[#6D8FB9]/20' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
                <div key={i}
                    className={`card-saas min-h-35 relative overflow-hidden group paper-card-interactive border ${s.accent} ${s.bg} shadow-sm`}
                >
                    <div
                        className="absolute inset-0 z-0 opacity-15 pointer-events-none group-hover:opacity-25 transition-opacity duration-700"
                        style={{
                            backgroundImage: `url(${s.bgImage})`,
                            backgroundSize: '100px',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: '110% 110%',
                            filter: 'grayscale(100%)',
                        }}
                    />

                    <div className="flex flex-col h-full justify-between relative z-10">
                        <div>
                            <p className={`text-[13px] font-bold uppercase tracking-[0.15em] ${s.labelColor} mb-1`}>{s.label}</p>
                            <div className={`h-0.5 w-6 ${s.lineBg} opacity-25 group-hover:w-10 transition-all duration-500`}></div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-4xl font-semibold font-notion-title tracking-tight ${s.text} leading-none`}>{s.value}</p>
                            {s.label === 'Promedio G.' && <span className="text-[10px] font-black tracking-tighter text-[#2E3330] bg-[#EAE4DA] px-2 py-0.5 rounded-full border border-black/5 animate-pulse">↑ 1.5%</span>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
