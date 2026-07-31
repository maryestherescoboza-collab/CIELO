import React from 'react';

interface GradeCellProps {
    estId: number;
    actId: number;
    score: number | null;
    isRecoveryAct: boolean;
    isPointMode: boolean;
    isDragging: boolean;
    isFocused: boolean;
    activePaintColor: number;
    animations: Array<{ id: number, emojis: string[] }>;
    onInteraction: (type: 'hover' | 'click' | 'focus' | 'drag') => void;
    onSetGrade: (val: number | null) => void;
    getGradeClass: (score: number | null) => string;
    hasLowBc: boolean;
    style?: React.CSSProperties;
}

const GradeCell: React.FC<GradeCellProps> = ({
    score,
    isRecoveryAct,
    isPointMode,
    isDragging,
    isFocused,
    activePaintColor,
    animations,
    onInteraction,
    onSetGrade,
    getGradeClass,
    hasLowBc,
    style
}) => {
    return (
        <div
            className={`p-0 border-r border-slate-200/60 relative transition-all group ${isDragging ? 'cursor-none' : 'cursor-pointer'} ${isFocused ? 'ring-2 ring-slate-900 ring-inset z-10' : ''} shrink-0`}
            style={style}
            onMouseEnter={() => {
                onInteraction('hover');
                if (isDragging && !isRecoveryAct) onSetGrade(activePaintColor);
            }}
            onMouseDown={() => {
                if (isRecoveryAct) return;
                onInteraction('click');
                onSetGrade(score === activePaintColor ? null : activePaintColor);
            }}
        >
            <div className="flex items-center justify-center min-h-14 h-full relative overflow-visible">
                {animations.map(anim => (
                    <div key={anim.id} className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-30">
                        {anim.emojis.map((emoji, idx) => {
                            const randomSeed1 = Math.sin(anim.id * 10 + idx) * 10;
                            const randomSeed2 = Math.cos(anim.id * 5 + idx * 2) * 10;
                            const randomSeed3 = Math.sin(anim.id + idx * 7) * 10;

                            const trajectories = ['-18px', '0px', '18px'];
                            const drift = trajectories[Math.abs(anim.id + idx) % 3];

                            const initRot = `${(randomSeed1).toFixed(1)}deg`;
                            const midRot = `${(randomSeed2).toFixed(1)}deg`;
                            const endRot = `${(randomSeed3).toFixed(1)}deg`;

                            const duration = `${(1.5 + Math.abs(randomSeed1 % 1)).toFixed(2)}s`;
                            const delay = `${(idx * 120 + Math.abs(randomSeed2 % 1) * 80).toFixed(0)}ms`;

                            const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
                            const sizeClass = sizes[Math.abs(Math.floor(randomSeed3)) % 4];

                            return (
                                <span
                                    key={idx}
                                    className={`absolute animate-bubble-emoji select-none ${sizeClass}`}
                                    style={{
                                        left: `${35 + (idx * 15) + (randomSeed1 * 0.4)}%`,
                                        bottom: '10%',
                                        '--bubble-init-rot': initRot,
                                        '--bubble-mid-rot': midRot,
                                        '--bubble-end-rot': endRot,
                                        '--bubble-drift': drift,
                                        '--bubble-duration': duration,
                                        animationDelay: delay,
                                    } as React.CSSProperties}
                                >
                                    {emoji}
                                </span>
                            );
                        })}
                    </div>
                ))}

                {isRecoveryAct ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full border-2 ${hasLowBc ? 'bg-amber-500 border-amber-200 animate-pulse' : 'bg-slate-200 border-slate-300'}`} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">RUBRICA</span>
                    </div>
                ) : isPointMode ? (
                    <div className={`rounded-xl shadow-lg transition-transform hover:scale-110 ${score === 100 ? 'w-6 h-6 bg-[#7C9672]' : score === 85 ? 'w-6 h-6 bg-[#D8B55A]' : score === 70 ? 'w-6 h-6 bg-[#CB4834]' : score === 55 ? 'w-5 h-5 bg-[#3F3C36] shadow-[#3F3C36]/30' : 'w-2 h-2 bg-slate-200'}`} />
                ) : (
                    <span className={`text-base font-semibold px-3 py-1 rounded transition-all ${getGradeClass(score)}`}>
                        {score ?? '-'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default React.memo(GradeCell);
