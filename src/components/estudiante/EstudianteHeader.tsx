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
        <div className="w-full max-w-280 mx-auto px-4 sm:px-8 pt-4 pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-[11.5px] text-[#767a76]">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-1.5 hover:text-[#1B1F2A] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Volver al registro
                </button>
                {isTutor && (
                    <div className="flex items-center gap-3 border-l border-[#E4E3EC] pl-4">
                        {(['Perfil', 'Evaluación'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`transition-colors ${
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
            <div className="flex items-center gap-2">
                {['P1', 'P2', 'P3', 'P4'].map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPeriodo(p)} 
                        className={`px-2 py-1 rounded transition-colors ${
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
