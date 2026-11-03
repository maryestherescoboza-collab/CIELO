import React from 'react';

interface EstudianteHeaderProps {
    periodo: string;
    setPeriodo: (p: string) => void;
    activeTab: 'Perfil' | 'Evaluación';
    setActiveTab: (t: 'Perfil' | 'Evaluación') => void;
    onBack: () => void;
    isTutor?: boolean;
}

const EstudianteHeader: React.FC<EstudianteHeaderProps> = ({
    periodo,
    setPeriodo,
    activeTab,
    setActiveTab,
    onBack,
    isTutor = false,
}) => {
    return (
        <div className="w-full max-w-280 mx-auto px-4 sm:px-8 pt-3 sm:pt-4 pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 text-xs sm:text-[11.5px] text-[#767a76]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button onClick={onBack} className="flex min-h-10 items-center gap-1.5 hover:text-[#1B1F2A] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 sm:w-2.5 sm:h-2.5">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Volver al registro
                </button>
                {isTutor && (
                    <div className="flex items-center gap-1 sm:gap-3 border-l border-[#E4E3EC] pl-3 sm:pl-4">
                        {(['Perfil', 'Evaluación'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`min-h-10 px-1.5 rounded transition-colors ${
                                    activeTab === tab 
                                    ? 'text-[#1B1F2A] font-bold' 
                                    : 'hover:text-[#1B1F2A]'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
                {['P1', 'P2', 'P3', 'P4'].map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPeriodo(p)} 
                        aria-pressed={periodo === p}
                        className={`min-h-10 min-w-11 px-2.5 sm:px-2 rounded-lg transition-colors ${
                            periodo === p 
                            ? 'bg-[#1B1F2A] text-white font-bold' 
                            : 'hover:bg-[#E4E3EC] text-[#1B1F2A]'
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default React.memo(EstudianteHeader);
