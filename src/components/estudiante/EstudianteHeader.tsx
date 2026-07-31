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
            <div className="w-[92%] max-w-7xl flex justify-between items-center mb-10 px-4 mt-2">
                <button onClick={onBack} className="text-slate-400 font-bold hover:text-golden-orange-base flex items-center gap-2 transition-all text-[13px] uppercase tracking-[0.2em]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al Registro
                </button>
                <div className="flex bg-[#e8e4db] p-1 rounded-xl border border-slate-200/50">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriodo(p)} 
                            className={`px-5 py-2 rounded-lg text-[14px] font-black tracking-widest transition-all ${periodo === p ? 'bg-white text-golden-orange-base shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-[92%] max-w-7xl flex items-end px-4 gap-1 transform translate-y-px">
                {(['Perfil', 'Evaluación'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 sm:px-12 py-3.5 text-[14px] font-black uppercase tracking-[0.2em] rounded-t-2xl border-x border-t border-slate-200/60 transition-all ${
                            activeTab === tab 
                            ? 'bg-[#fdfcf9] border-bottom-color-[#fdfcf9] z-10 font-800 text-golden-orange-base shadow-[-5px_-5px_10px_rgba(0,0,0,0.01)]' 
                            : 'bg-[#e8e4db] border-bottom-color-transparent z-0 color-[#8a8475] hover:bg-[#ece8df] hover:color-[#5d584e]'
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
