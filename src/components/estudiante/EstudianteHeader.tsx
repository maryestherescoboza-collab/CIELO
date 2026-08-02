import React from 'react';

interface EstudianteHeaderProps {
    periodo: string;
    setPeriodo: (p: string) => void;
    activeTab: 'Perfil' | 'Evaluación';
    setActiveTab: (t: 'Perfil' | 'Evaluación') => void;
    onBack: () => void;
}

const EstudianteHeader: React.FC<EstudianteHeaderProps> = ({
    periodo,
    setPeriodo,
    activeTab,
    setActiveTab,
    onBack
}) => {
    return (
        <>
            <div className="w-[92%] max-w-7xl flex justify-between items-center mb-8 px-4 mt-2">
                <button onClick={onBack} className="text-[#5F665E] font-semibold hover:text-[#2E3330] flex items-center gap-2 transition-all text-[11px] uppercase tracking-[0.08em] hover:bg-[#F8F3ED] px-4 py-2 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    VOLVER AL REGISTRO
                </button>
                <div className="flex bg-[#F8F3ED] p-1.5 rounded-full border border-[rgba(46,51,48,0.04)]">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriodo(p)} 
                            className={`px-[18px] py-[8px] min-h-[36px] leading-none rounded-full text-xs font-semibold tracking-[0.08em] transition-all ${periodo === p ? 'bg-white text-[#2E3330] shadow-sm border border-[rgba(46,51,48,0.04)]' : 'text-[#5F665E] hover:text-[#2E3330]'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-[98%] max-w-310 flex items-end px-4 gap-2 transform translate-y-px">
                {(['Perfil', 'Evaluación'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 sm:px-12 py-3.5 text-xs font-semibold uppercase tracking-[0.08em] rounded-t-[16px] border-x border-t transition-all ${
                            activeTab === tab 
                            ? 'bg-[#FDFBF7] border-[rgba(46,51,48,0.08)] border-b-[#FDFBF7] z-10 text-[#2E3330] shadow-sm' 
                            : 'bg-[#F8F3ED] border-transparent border-b-transparent z-0 text-[#5F665E] hover:bg-[#F0EBE3] hover:text-[#2E3330]'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </>
    );
};

export default React.memo(EstudianteHeader);
