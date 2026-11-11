import { useEffect, useRef, useState } from 'react';

// Instrumentos y documentos reales del ecosistema CIELO
const CIELO_DOCS = [
  {
    id: 'plan',
    title: 'Planificación y Fichas de Clase',
    desc: 'Secuencias didácticas y rutas de aprendizaje',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
    )
  },
  {
    id: 'spec',
    title: 'Especificaciones Curriculares',
    desc: 'Mapeo MINERD con competencias y saberes',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
        <path d="M9 9h6M9 13h4" />
      </svg>
    )
  },
  {
    id: 'rub',
    title: 'Rúbricas Socioformativas',
    desc: 'Niveles de dominio taxonómicos BC1–BC4',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16M4 15h16M10 4v16" />
      </svg>
    )
  },
  {
    id: 'cot',
    title: 'Listas de Cotejo y Escalas',
    desc: 'Verificación directa de criterios de logro',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6" />
      </svg>
    )
  },
  {
    id: 'evi',
    title: 'Portafolio y Evidencias',
    desc: 'Productos entregados desde el portal estudiantil',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h16M4 16h16" />
        <circle cx="9" cy="8" r="2" />
        <circle cx="15" cy="16" r="2" />
      </svg>
    )
  },
  {
    id: 'bol',
    title: 'Boletines de Período Oficiales',
    desc: 'Reportes P1–P4 listos para entrega familiar',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    )
  },
  {
    id: 'cal',
    title: 'Registro y Calificaciones Finales',
    desc: 'Cálculo ponderado transparente sin hojas de cálculo',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" />
      </svg>
    )
  }
];

export function EnvioCoordinacionSection() {
  const [sentCount, setSentCount] = useState(0);
  const [stampActive, setStampActive] = useState(false);
  const [completedItems, setCompletedItems] = useState<boolean[]>(new Array(7).fill(false));
  const [flyingDoc, setFlyingDoc] = useState<{ id: string; x0: number; y0: number; x1: number; y1: number } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const folderRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef(0);

  const total = CIELO_DOCS.length;

  const playSequence = async () => {
    const currentId = ++animationIdRef.current;

    // Reset
    setSentCount(0);
    setStampActive(false);
    setCompletedItems(new Array(total).fill(false));
    setFlyingDoc(null);

    await new Promise((r) => setTimeout(r, 600));
    if (currentId !== animationIdRef.current) return;

    for (let i = 0; i < total; i++) {
      if (currentId !== animationIdRef.current) return;

      // Calcular posiciones de vuelo relativas al contenedor
      const stage = stageRef.current;
      const itemEl = itemsRef.current[i];
      const folderEl = folderRef.current;

      if (stage && itemEl && folderEl) {
        const stageRect = stage.getBoundingClientRect();
        const iconRect = itemEl.querySelector('.doc-icon-box')?.getBoundingClientRect() || itemEl.getBoundingClientRect();
        const folderRect = folderEl.getBoundingClientRect();

        const x0 = iconRect.left - stageRect.left;
        const y0 = iconRect.top - stageRect.top;
        const x1 = folderRect.left - stageRect.left + folderRect.width * 0.45;
        const y1 = folderRect.top - stageRect.top + folderRect.height * 0.4;

        setFlyingDoc({ id: CIELO_DOCS[i].id, x0, y0, x1, y1 });
        await new Promise((r) => setTimeout(r, 600));
        setFlyingDoc(null);
      }

      if (currentId !== animationIdRef.current) return;

      // Marcar item como enviado
      setCompletedItems((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
      setSentCount(i + 1);

      // Efecto haptic visual de recepción en la carpeta
      if (folderEl) {
        folderEl.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.03) rotate(-0.5deg)' },
            { transform: 'scale(1)' }
          ],
          { duration: 240, easing: 'ease-out' }
        );
      }

      await new Promise((r) => setTimeout(r, 260));
    }

    if (currentId !== animationIdRef.current) return;
    setStampActive(true);

    // Esperar y repetir en bucle continuo
    await new Promise((r) => setTimeout(r, 3400));
    if (currentId === animationIdRef.current) {
      playSequence();
    }
  };

  useEffect(() => {
    playSequence();
    return () => {
      animationIdRef.current++;
    };
  }, []);

  return (
    <section className="py-20 md:py-32 bg-[#F8F3ED] border-y border-[rgba(46,51,48,0.08)] relative overflow-hidden">
      {/* Luz ambiental con tokens de CIELO */}
      <div className="absolute top-1/2 -left-20 w-120 h-120 bg-[#BFC9A6] rounded-full blur-[140px] opacity-25 pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-120 h-120 bg-[#DEAE4D] rounded-full blur-[140px] opacity-15 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#EAE4DA]/60 px-4 py-2 rounded-full border border-black/5 mb-4 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#689C63] animate-pulse" />
            <span className="text-xs font-bold text-[#5F665E] uppercase tracking-widest">
              Flujo Académico Unificado
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2E3330] tracking-tight leading-tight">
            Envío a coordinación pedagógica <br />
            <span className="text-[#689C63] italic font-serif font-light">en un solo clic.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5F665E] font-medium leading-relaxed">
            Se acabaron los correos dispersos y las carpetas compartidas desordenadas. En CIELO, tus 7 instrumentos oficiales viajan sincronizados a la carpeta digital del centro.
          </p>
        </div>

        {/* Escenario Interactivo con Grid artesanal y Relación 16:9 Adaptable */}
        <div className="max-w-5xl mx-auto">
          <div
            ref={stageRef}
            onClick={() => playSequence()}
            className="relative w-full rounded-3xl border-2 border-[#2E3330] shadow-[0_20px_50px_rgba(46,51,48,0.12)] bg-[#FCFCFA] p-5 sm:p-8 md:p-10 overflow-hidden cursor-pointer select-none transition-transform hover:shadow-[0_25px_60px_rgba(46,51,48,0.16)]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(46,51,48,0.08) 1.5px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
            title="Toca para reiniciar la animación"
          >
            {/* Tag interactivo */}
            <div className="absolute top-3 right-4 sm:top-4 sm:right-6 text-[10px] sm:text-xs font-bold text-[#5F665E] tracking-wider uppercase bg-[#EAE4DA]/50 px-2.5 py-1 rounded-full border border-[#2E3330]/10">
              Toca para repetir
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              {/* Columna Izquierda: Los 7 Documentos */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
                <ol className="space-y-2.5">
                  {CIELO_DOCS.map((doc, idx) => {
                    const isSent = completedItems[idx];
                    return (
                      <li
                        key={doc.id}
                        ref={(el) => {
                          itemsRef.current[idx] = el;
                        }}
                        className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-300 ${
                          isSent
                            ? 'bg-[#689C63]/12 border-[#689C63] shadow-xs'
                            : 'bg-white border-[#2E3330]/15 hover:border-[#2E3330]/35'
                        }`}
                      >
                        <div
                          className={`doc-icon-box flex-none w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-[#2E3330] flex items-center justify-center p-2 transition-colors ${
                            isSent ? 'bg-[#689C63] text-white' : 'bg-[#DEAE4D] text-[#2E3330]'
                          }`}
                        >
                          {doc.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate leading-tight ${isSent ? 'text-[#21412A]' : 'text-[#2E3330]'}`}>
                            {doc.title}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-[#5F665E] truncate">
                            {doc.desc}
                          </p>
                        </div>

                        <div
                          className={`flex-none w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSent
                              ? 'border-[#689C63] bg-[#689C63] text-white scale-100'
                              : 'border-[#2E3330]/20 bg-transparent text-transparent scale-90'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 stroke-current stroke-3 fill-none" viewBox="0 0 16 16">
                            <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Columna Derecha: Carpeta Institucional de Período */}
              <div className="md:col-span-5 flex flex-col justify-between pt-4 md:pt-0">
                <div className="mb-4">
                  <h3 className="text-xl sm:text-2xl font-black text-[#2E3330] tracking-tight leading-snug">
                    Carpeta Docente CIELO
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5F665E] font-medium mt-1">
                    Conformidad académica del período lectivo
                  </p>
                </div>

                {/* Carpeta física artesanal */}
                <div
                  ref={folderRef}
                  className="relative mt-auto w-full h-56 sm:h-64 rounded-2xl rounded-tl-none border-3 border-[#2E3330] bg-[#DEAE4D] shadow-[6px_6px_0px_#2E3330] p-5 sm:p-6 flex flex-col justify-between overflow-hidden"
                >
                  {/* Pestaña superior de la carpeta */}
                  <div className="absolute -top-[2px] -left-[3px] -translate-y-full w-28 sm:w-36 h-7 sm:h-8 rounded-t-xl border-t-3 border-x-3 border-[#2E3330] bg-[#DEAE4D] flex items-center px-3">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#2E3330]">
                      MINERD · P1–P4
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#2E3330]/70">
                      Documentos Verificados
                    </span>
                    <div className="text-5xl sm:text-6xl font-black text-[#2E3330] tracking-tighter mt-1">
                      {sentCount}/{total}
                    </div>
                  </div>

                  {/* Sello de Recepción Coordinación */}
                  <div
                    className={`absolute right-4 top-14 sm:top-16 px-4 py-1.5 sm:px-5 sm:py-2 border-4 border-[#DB5B48] text-[#DB5B48] font-black uppercase tracking-widest text-lg sm:text-2xl rounded-xl transform -rotate-12 transition-all duration-300 pointer-events-none ${
                      stampActive
                        ? 'opacity-95 scale-100 shadow-[2px_2px_0px_rgba(219,91,72,0.4)]'
                        : 'opacity-0 scale-150'
                    }`}
                  >
                    RECIBIDO
                  </div>

                  {/* Barra de progreso con Verde Éxito CIELO */}
                  <div>
                    <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-[#2E3330] mb-1.5">
                      <span>Progreso de entrega</span>
                      <span>{Math.round((sentCount / total) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 sm:h-3.5 rounded-full border-2 border-[#2E3330] bg-white overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-[#689C63] transition-all duration-400 ease-out"
                        style={{ width: `${(sentCount / total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Elemento Volador Animado */}
            {flyingDoc && (
              <div
                className="absolute w-12 h-14 sm:w-14 sm:h-16 rounded-xl border-2 border-[#2E3330] bg-white shadow-[4px_4px_0px_#2E3330] flex items-center justify-center p-2.5 z-30 pointer-events-none transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translate(${flyingDoc.x0}px, ${flyingDoc.y0}px) scale(0.9)`,
                  animation: 'cieloFly 0.58s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                  // Variables CSS pasadas directamente para la interpolación en curva
                  ['--fly-x0' as any]: `${flyingDoc.x0}px`,
                  ['--fly-y0' as any]: `${flyingDoc.y0}px`,
                  ['--fly-x1' as any]: `${flyingDoc.x1}px`,
                  ['--fly-y1' as any]: `${flyingDoc.y1}px`,
                }}
              >
                <div className="w-full h-full text-[#689C63]">
                  {CIELO_DOCS.find((d) => d.id === flyingDoc.id)?.icon}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyframe dinámico para la trayectoria parabólica */}
      <style>{`
        @keyframes cieloFly {
          0% {
            transform: translate(var(--fly-x0), var(--fly-y0)) rotate(0deg) scale(0.9);
            opacity: 1;
          }
          50% {
            transform: translate(calc((var(--fly-x0) + var(--fly-x1)) / 2), calc(min(var(--fly-y0), var(--fly-y1)) - 40px)) rotate(-10deg) scale(1.18);
            opacity: 1;
          }
          100% {
            transform: translate(var(--fly-x1), var(--fly-y1)) rotate(6deg) scale(0.45);
            opacity: 0.15;
          }
        }
      `}</style>
    </section>
  );
}

