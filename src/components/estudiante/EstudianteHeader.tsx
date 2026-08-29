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
        <>
            <div className="w-full flex justify-between items-center mb-6 px-6 mt-2 custom-estudiante-header">
                <style dangerouslySetInnerHTML={{ __html: `
                  .custom-estudiante-header {
                    --navy: #1c4e8a;
                    --navy-dark: #123761;
                  }
                ` }} />
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-[#5F665E] font-bold hover:text-[#2E3330] flex items-center gap-2 transition-all text-xs uppercase tracking-[0.08em] hover:bg-(--background) px-4.5 py-2 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        VOLVER AL REGISTRO
                    </button>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setPeriodo(p)} 
                            className={`px-5 py-2 min-h-9 leading-none rounded-lg text-xs font-extrabold tracking-[0.08em] transition-all ${
                                periodo === p 
                                ? 'bg-(--navy) text-white shadow-sm scale-102 font-black' 
                                : 'text-slate-600 hover:text-(--navy-dark) hover:bg-slate-200/60'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full flex items-end px-8 gap-2 transform translate-y-px">
                {(isTutor ? ['Perfil', 'Evaluación'] : ['Perfil']).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as 'Perfil' | 'Evaluación')}
                        className={`px-8 sm:px-10 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em] rounded-t-2xl border-x-2 border-t-2 transition-all duration-200 relative ${
                            activeTab === tab 
                            ? 'bg-white border-(--navy) border-b-transparent z-10 text-(--navy-dark) shadow-[0_-2px_6px_rgba(0,0,0,0.03)]' 
                            : 'bg-slate-100 border-slate-200 border-b-transparent z-0 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
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
