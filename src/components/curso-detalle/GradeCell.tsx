import React from 'react';
import { nextGradeScore } from '../../utils/gradeCycle';
import { formatGradeScore } from '../../utils/academic';

interface GradeCellProps {
    estId: number;
    actId: number;
    score: number | null;
    isRecoveryAct: boolean;
    evalMode: string;
    isDragging: boolean;
    isFocused: boolean;
    activePaintColor: number;
    animations: Array<{ id: number, emojis: string[] }>;
    onInteraction: (type: 'hover' | 'click' | 'focus' | 'drag') => void;
    onSetGrade: (val: number | null) => void;
    getGradeClass: (score: number | null) => string;
    hasLowBc: boolean;
    style?: React.CSSProperties;
    isProductoFinal?: boolean;
    maxPoints?: number;
}

const GradeCell: React.FC<GradeCellProps> = ({
    score,
    isRecoveryAct,
    evalMode,
    isDragging,
    isFocused,
    activePaintColor,
    animations,
    onInteraction,
    onSetGrade,
    getGradeClass,
    hasLowBc,
    style,
    isProductoFinal = false,
    maxPoints = 100
}) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.value = formatGradeScore(score);
        }
    }, [score]);

    const isInasistencia = score === 0;
    const selloLabel = isInasistencia ? 'Inasistencia' : score === 1 ? '⚠︎ Se negó a\nrealizar ⚠︎' : null;
    const cicloRef = React.useRef<{ seleccion: number; vacio: boolean }>({ seleccion: activePaintColor, vacio: false });

    const indicadorSello = selloLabel !== null && evalMode !== 'libre' ? (
        <div
            className="w-[75%] h-[75%] flex items-center justify-center rounded-xs"
            style={{
                border: `1px dashed ${isInasistencia ? '#537BAC' : '#EB8847'}`,
                backgroundColor: isInasistencia ? 'rgba(83, 123, 172, 0.05)' : 'rgba(235, 136, 71, 0.05)',
                color: isInasistencia ? '#537BAC' : '#EB8847'
            }}
        >
            <span
                className="font-mono font-bold text-center leading-none whitespace-pre-line flex items-center justify-center h-full w-full"
                style={{ fontSize: isInasistencia ? '12px' : '12px', letterSpacing: '-0.03em' }}
            >
                {selloLabel}
            </span>
        </div>
    ) : null;

    return (
        <div
            data-guide="celda-evaluacion"
            className={`p-0 border-r border-[rgba(46,51,48,0.08)] relative transition-all group ${isDragging ? 'cursor-none' : 'cursor-pointer'} ${isFocused ? 'ring-2 ring-primary ring-inset z-10' : ''} shrink-0`}
            style={style}
            onMouseEnter={() => {
                onInteraction('hover');
                if (isDragging && !isRecoveryAct && !isProductoFinal && (evalMode === 'pincel' || evalMode === 'numerico')) onSetGrade(activePaintColor);
            }}
            onMouseDown={() => {
                if (isRecoveryAct) return;
                onInteraction('click');
                if (isProductoFinal || evalMode === 'libre') return;
                const seleccionCambiada = cicloRef.current.seleccion !== activePaintColor;
                const nextScore = nextGradeScore(score, activePaintColor, cicloRef.current.vacio && !seleccionCambiada);
                cicloRef.current = { seleccion: activePaintColor, vacio: nextScore === null };
                onSetGrade(nextScore);
            }}
        >
            <div className="flex items-center justify-center min-h-12 h-full relative overflow-visible">
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
                    score !== null && score !== undefined ? (
                        <span className={`text-base font-semibold px-3 py-1 rounded transition-all ${getGradeClass(score)}`}>
                            {formatGradeScore(score)}
                        </span>
                    ) : hasLowBc ? (
                        <img 
                            src="https://img.icons8.com/stickers/100/error.png" 
                            alt="error" 
                            className="w-5 h-5 object-contain select-none transition-transform hover:scale-110" 
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 opacity-40">
                            <div className="w-3 h-3 rounded-full border-2 bg-[rgba(46,51,48,0.08)] border-transparent" />
                        </div>
                    )
                ) : (isProductoFinal || evalMode === 'libre') ? (
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        defaultValue={formatGradeScore(score)}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => {
                            const raw = e.target.value.trim();
                            if (raw === '') {
                                onSetGrade(null);
                                return;
                            }
                            const normalized = raw.replace(',', '.');
                            const num = Number(normalized);
                            if (isNaN(num)) {
                                e.target.value = score !== null ? formatGradeScore(score) : '';
                                return;
                            }

                            if (isProductoFinal) {
                                const limit = (maxPoints && maxPoints > 0) ? maxPoints : 100;
                                // Si coincide con la calificación ya convertida y formateada, no se reconvierte
                                if (score !== null && (raw === formatGradeScore(score) || Math.abs(num - score) < 0.01)) {
                                    e.target.value = formatGradeScore(score);
                                    return;
                                }

                                // Impide introducir valores inferiores a cero o superiores al máximo permitido
                                if (num < 0 || num > limit) {
                                    e.target.value = score !== null ? formatGradeScore(score) : '';
                                    return;
                                }

                                // Calificación sobre 100 = (Puntos obtenidos ÷ Puntos máximos) × 100
                                const convertedScore = (num / limit) * 100;
                                onSetGrade(convertedScore);
                                e.target.value = formatGradeScore(convertedScore);
                            } else {
                                if (num < 0 || num > 100) {
                                    e.target.value = score !== null ? formatGradeScore(score) : '';
                                    return;
                                }
                                onSetGrade(num);
                                e.target.value = formatGradeScore(num);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className={`w-full h-full text-center text-base font-semibold bg-transparent border-none outline-none rounded transition-all focus:ring-2 focus:ring-primary/30 ${getGradeClass(score)}`}
                        placeholder="-"
                    />
                ) : evalMode === 'pincel' ? (
                    selloLabel !== null ? indicadorSello : (
                        <div className={`rounded-full shadow-sm transition-transform hover:scale-110 ${score === null ? 'w-2 h-2 bg-[rgba(46,51,48,0.08)]' : score === 100 ? 'w-6 h-6 bg-primary' : score === 85 ? 'w-6 h-6 bg-attention' : score === 70 ? 'w-6 h-6 bg-danger' : score === 55 ? 'w-5 h-5 bg-[#2E3330]' : score >= 100 ? 'w-6 h-6 bg-primary' : score >= 85 ? 'w-6 h-6 bg-attention' : score >= 70 ? 'w-6 h-6 bg-danger' : 'w-5 h-5 bg-[#2E3330]'}`} />
                    )
                ) : (
                    selloLabel !== null ? indicadorSello : (
                        <span className={`text-base font-semibold px-3 py-1 rounded transition-all ${getGradeClass(score)} ${score === null ? 'opacity-0' : 'opacity-100'}`}>
                            {formatGradeScore(score)}
                        </span>
                    )
                )}
            </div>
        </div>
    );
};

export default React.memo(GradeCell);
