import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Calendar,
  Send,
  RotateCcw,
  X,
  UserCheck,
  Sparkles,
  Smartphone,
  Wifi,
  Battery,
  ShieldAlert,
} from 'lucide-react';
import fichaImg from '../assets/features/ficha-orientacion.png';

interface AnimatedIncidenciasShowcaseProps {
  isActive?: boolean;
}

export function AnimatedIncidenciasShowcase({ isActive = true }: AnimatedIncidenciasShowcaseProps) {
  // Estados de la simulación interactiva paso a paso
  const [step, setStep] = useState<number>(0);
  const [typedSearch, setTypedSearch] = useState('');
  const [isStudentSelected, setIsStudentSelected] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [selectedGravedad, setSelectedGravedad] = useState<string | null>(null);
  const [typedDescripcion, setTypedDescripcion] = useState('');
  const [typedAcuerdos, setTypedAcuerdos] = useState('');
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);
  const [isGuardarPressed, setIsGuardarPressed] = useState(false);
  const [isFichaVisible, setIsFichaVisible] = useState(false);
  const [isReportSent, setIsReportSent] = useState(false);

  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const addTimer = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
      if (isMountedRef.current) fn();
    }, delay);
    timersRef.current.push(t);
    return t;
  };

  const handleToggleFicha = () => {
    clearAllTimers();
    setIsFichaVisible((prev) => !prev);
  };

  const handleCloseFicha = () => {
    clearAllTimers();
    setIsFichaVisible(false);
  };

  const runSimulation = () => {
    clearAllTimers();
    if (!isMountedRef.current) return;

    // Reset de estados
    setStep(0);
    setTypedSearch('');
    setIsStudentSelected(false);
    setSelectedCategoria(null);
    setSelectedGravedad(null);
    setTypedDescripcion('');
    setTypedAcuerdos('');
    setSelectedAcciones([]);
    setIsGuardarPressed(false);
    setIsFichaVisible(false);
    setIsReportSent(false);

    const studentName = 'Héctor Manuel Santana';
    const descText = 'Dificultades en comportamiento y aprendizaje en aula.';
    const acuerdosText = 'Entrevista realizada. Se activa derivación a Orientación.';

    // 1. Digitar en el buscador móvil de estudiante
    addTimer(() => {
      setStep(1);
      let curr = '';
      studentName.split('').forEach((char, idx) => {
        addTimer(() => {
          curr += char;
          setTypedSearch(curr);
        }, idx * 50);
      });
    }, 350);

    // 2. Seleccionar estudiante Héctor Manuel Santana
    const selectStudentDelay = 350 + studentName.length * 50 + 150;
    addTimer(() => {
      setStep(2);
      setIsStudentSelected(true);
    }, selectStudentDelay);

    // 3. Seleccionar Categoría y Gravedad
    const catDelay = selectStudentDelay + 550;
    addTimer(() => {
      setStep(3);
      setSelectedCategoria('conducta');
    }, catDelay);

    const gravDelay = catDelay + 400;
    addTimer(() => {
      setSelectedGravedad('primera_vez');
    }, gravDelay);

    // 4. Redactar Detalles
    const detailsDelay = gravDelay + 500;
    addTimer(() => {
      setStep(4);
      let currD = '';
      descText.split('').forEach((char, idx) => {
        addTimer(() => {
          currD += char;
          setTypedDescripcion(currD);
        }, idx * 20);
      });
    }, detailsDelay);

    const acuerdosDelay = detailsDelay + descText.length * 20 + 200;
    addTimer(() => {
      let currA = '';
      acuerdosText.split('').forEach((char, idx) => {
        addTimer(() => {
          currA += char;
          setTypedAcuerdos(currA);
        }, idx * 20);
      });
    }, acuerdosDelay);

    // 5. Seleccionar Acciones (Llamado verbal y Orientación)
    const actionsDelay = acuerdosDelay + acuerdosText.length * 20 + 350;
    addTimer(() => {
      setStep(5);
      setSelectedAcciones(['llamado_verbal']);
    }, actionsDelay);

    const orientacionDelay = actionsDelay + 450;
    addTimer(() => {
      setSelectedAcciones(['llamado_verbal', 'orientacion']);
    }, orientacionDelay);

    // 6. Tocar botón Guardar Registro
    const saveDelay = orientacionDelay + 550;
    addTimer(() => {
      setStep(6);
      setIsGuardarPressed(true);
    }, saveDelay);

    const saveReleaseDelay = saveDelay + 250;
    addTimer(() => {
      setIsGuardarPressed(false);
    }, saveReleaseDelay);

    // 7. La Ficha de Referencia a Orientación se superpone en el teléfono
    const overlayDelay = saveReleaseDelay + 500;
    addTimer(() => {
      setStep(7);
      setIsFichaVisible(true);
    }, overlayDelay);

    // 8. Clic automático en "ENVIAR REPORTE A ORIENTACIÓN"
    const sendReportDelay = overlayDelay + 1500;
    addTimer(() => {
      setIsReportSent(true);
    }, sendReportDelay);

    // 9. Reiniciar en bucle
    const loopDelay = sendReportDelay + 4200;
    addTimer(() => {
      runSimulation();
    }, loopDelay);
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (!isActive) {
      clearAllTimers();
      return;
    }

    const startTimer = setTimeout(() => {
      runSimulation();
    }, 250);

    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimer);
      clearAllTimers();
    };
  }, [isActive]);

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Barra superior con distintivo "VISTA PARA TELÉFONO" y controles */}
      <div className="w-full max-w-sm mb-1.5 sm:mb-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 landing-slide-micro font-bold text-[#537BAC]">
          <Smartphone size={13} className="text-[#DEAE4D]" />
          <span>Vista para teléfono · Bitácora Móvil</span>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleFicha}
            className="px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider border border-[#2E3330]/20 bg-white text-[#2E3330] hover:bg-[#FAF8F5] cursor-pointer"
          >
            {isFichaVisible ? 'Ver formulario' : 'Ver Ficha'}
          </button>
          <button
            type="button"
            onClick={runSimulation}
            title="Reiniciar simulación"
            className="p-1 text-[#5F665E] hover:text-[#2E3330] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA PARA TELÉFONO (SMARTPHONE CHASSIS & NATIVE MOBILE INTERFACE)        */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-72.5 xs:max-w-[320px] sm:max-w-85 md:max-w-90 mx-auto rounded-4xl sm:rounded-[2.4rem] border-4 sm:border-[6px] border-[#2E3330] bg-[#2E3330] p-1 shadow-[0_16px_40px_rgba(46,51,48,0.22)]">
        {/* Notch / Dynamic Island del teléfono */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
          <div className="h-3.5 sm:h-4 w-20 sm:w-24 bg-[#1E2220] rounded-full flex items-center justify-end px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3B433E]" />
          </div>
        </div>

        {/* Pantalla del teléfono */}
        <div className="relative w-full rounded-[1.6rem] sm:rounded-4xl bg-[#FCFAF6] overflow-hidden flex flex-col h-100 xs:h-[430px] sm:h-115 md:h-122.5 max-h-[58vh]">
          {/* Barra de estado móvil (Status Bar) */}
          <div className="h-7 w-full bg-[#FCFAF6] px-4 flex items-center justify-between text-[10px] font-semibold text-[#2E3330] shrink-0 pt-1 border-b border-[#2E3330]/5">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-[#2E3330]">
              <Wifi size={11} />
              <Battery size={13} />
            </div>
          </div>

          {/* Encabezado interno de la App Móvil CIELO Bitácora */}
          <div className="bg-[#FAF8F5] px-3 py-1.5 border-b border-[#2E3330]/10 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[8px] font-black uppercase tracking-wider text-[#DEAE4D] block leading-tight">
                Bitácora Escolar
              </span>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#2E3330] leading-tight">
                1ro A · Lengua Española
              </p>
            </div>
            <span className="flex items-center gap-1 text-[8px] font-mono text-[#689C63] font-bold bg-[#689C63]/10 px-1.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[#689C63] animate-pulse" />
              EN VIVO
            </span>
          </div>

          {/* Contenido scrolleable táctil de la aplicación móvil */}
          <div className="flex-1 overflow-y-auto landing-scroll-y p-2 sm:p-2.5 space-y-2 text-[#2E3330]">
            {/* 1. BUSCADOR TÁCTIL DE ESTUDIANTE */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-[#2E3330] block mb-1">
                1. Estudiante
              </label>
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-2 text-[#5F665E]" />
                <input
                  type="text"
                  readOnly
                  value={typedSearch}
                  placeholder="Buscar estudiante..."
                  className={`w-full rounded-full border py-1 pl-7 pr-2.5 text-[10px] font-semibold outline-none transition-all ${step === 1 ? 'border-[#537BAC] bg-blue-50/50 ring-1 ring-[#537BAC]' : 'border-[#2E3330]/20 bg-white'
                    }`}
                />
              </div>

              {/* Tarjeta de resultado táctil */}
              {typedSearch.length > 2 && (
                <div
                  className={`mt-1 border border-[#2E3330]/20 bg-white p-1.5 transition-all rounded-md shadow-2xs ${isStudentSelected ? 'border-[#689C63] bg-emerald-50/60' : 'bg-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10.5px] font-bold text-[#2E3330] leading-tight">Héctor Manuel Santana</p>
                      <p className="text-[8px] text-[#5F665E] font-mono">EXP. #0873 · 1ro A</p>
                    </div>
                    {isStudentSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#689C63] text-white">
                        <UserCheck size={9} />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. CATEGORÍA Y GRAVEDAD MÓVIL */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-[#2E3330] block mb-1">
                2. Categoría y Gravedad
              </label>
              <div className="flex flex-wrap gap-1 mb-1">
                <span
                  className={`px-2 py-0.5 text-[8.5px] font-bold rounded-full transition-all flex items-center gap-1 ${selectedCategoria === 'conducta'
                    ? 'bg-[#8F9E87] text-white ring-1 ring-[#8F9E87] shadow-2xs'
                    : 'bg-white text-[#5F665E] border border-[#2E3330]/20'
                    }`}
                >
                  <ShieldAlert size={9} /> Conducta
                </span>
                <span className="px-2 py-0.5 text-[8.5px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15">
                  Académico
                </span>
                <span className="px-2 py-0.5 text-[8.5px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15">
                  Bienestar
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`px-2 py-0.5 text-[8px] font-bold rounded-full transition-all ${selectedGravedad === 'primera_vez'
                    ? 'bg-[#DCE1CE] text-[#2E3330] font-black border border-[#2E3330]/25'
                    : 'bg-white text-[#5F665E]/60 border border-[#2E3330]/15'
                    }`}
                >
                  Primera vez
                </span>
                <span className="px-2 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15">
                  Recurrente
                </span>
                <span className="px-2 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15">
                  Persistente
                </span>
              </div>
            </div>

            {/* 3. DETALLES Y ACUERDOS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#2E3330]">
                  3. Hechos y Acuerdos
                </label>
                <span className="flex items-center gap-1 text-[7.5px] font-mono text-[#5F665E] bg-white px-1.5 py-0.2 rounded-full border border-[#2E3330]/10">
                  <Calendar size={8} /> 12 nov
                </span>
              </div>
              <div className="border border-[#2E3330]/15 p-1.5 min-h-6 text-[9px] rounded-md bg-white mb-1">
                {typedDescripcion ? (
                  <span className="text-[#2E3330] leading-tight block">{typedDescripcion}</span>
                ) : (
                  <span className="text-[#5F665E]/40">Descripción de los hechos...</span>
                )}
              </div>
              <div className="border border-[#2E3330]/15 p-1.5 min-h-6 text-[9px] rounded-md bg-white">
                {typedAcuerdos ? (
                  <span className="text-[#2E3330] leading-tight block">{typedAcuerdos}</span>
                ) : (
                  <span className="text-[#5F665E]/40">Acuerdos y compromisos...</span>
                )}
              </div>
            </div>

            {/* 4. ACCIONES PEDAGÓGICAS */}
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-[#2E3330] block mb-1">
                4. Acciones
              </label>
              <div className="flex flex-wrap gap-1">
                <span
                  className={`px-2 py-0.5 text-[8px] font-bold rounded-full transition-all ${selectedAcciones.includes('llamado_verbal')
                    ? 'bg-[#CBE4F9] text-[#1E3A5F] border border-[#537BAC]/40 font-black'
                    : 'bg-white text-[#5F665E]/70 border border-[#2E3330]/15'
                    }`}
                >
                  Llamado verbal
                </span>
                <span
                  className={`px-2 py-0.5 text-[8px] font-bold rounded-full transition-all ${selectedAcciones.includes('orientacion')
                    ? 'bg-[#537BAC] text-white shadow-2xs ring-1 ring-[#537BAC]/40 font-black'
                    : 'bg-white text-[#5F665E]/70 border border-[#2E3330]/15'
                    }`}
                >
                  Orientación
                </span>
                <span className="px-2 py-0.5 text-[8px] font-semibold rounded-full bg-white text-[#5F665E]/60 border border-[#2E3330]/15">
                  Compromiso
                </span>
              </div>
            </div>

            {/* 5. BOTÓN GUARDAR TÁCTIL */}
            <div>
              <button
                type="button"
                className={`w-full py-2 px-3 rounded-full text-center font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs ${isGuardarPressed
                  ? 'bg-[#556947] text-white scale-98 ring-2 ring-[#556947]'
                  : 'bg-[#DEAE4D] hover:bg-[#D4A33F] text-[#2E3330]'
                  }`}
              >
                Guardar Registro en Bitácora
              </button>
            </div>

            {/* 6. HISTORIAL DE BITÁCORA EN TARJETAS MÓVILES (FORMATO NATIVO DE TELÉFONO) */}
            <div className="border-t border-[#2E3330]/10 pt-2">
              <span className="text-[8.5px] font-black uppercase tracking-wider text-[#5F665E] block mb-1.5">
                Historial Reciente (Bitácora)
              </span>

              {/* Tarjeta 1: Héctor Manuel Santana (se activa en la simulación) */}
              <div
                className={`p-2 rounded-lg border transition-all mb-1.5 ${step >= 6
                  ? 'border-[#689C63] bg-emerald-50/70 shadow-2xs ring-1 ring-[#689C63]/30'
                  : 'border-[#2E3330]/15 bg-white'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[10px] font-bold text-[#2E3330] leading-tight">Héctor Manuel Santana</p>
                    <p className="text-[7.5px] font-mono text-[#5F665E]">Exp. #0873 · 12 nov 2026</p>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FCE8DB] text-[#C25B1F] text-[7.5px] font-bold uppercase">
                    Conducta
                  </span>
                </div>
                <p className="text-[8.5px] text-[#5F665E] line-clamp-2 leading-snug">
                  {typedDescripcion || 'Dificultades en su comportamiento observadas en aula.'}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[7.5px]">
                  <span className="px-1 py-0.2 bg-[#D2E7F9] text-[#1E3A5F] rounded-xs font-bold">Llamado verbal</span>
                  {selectedAcciones.includes('orientacion') && (
                    <span className="px-1 py-0.2 bg-[#537BAC] text-white rounded-xs font-black animate-pulse">
                      Orientación
                    </span>
                  )}
                </div>
              </div>

              {/* Tarjeta 2 previa en el historial */}
              <div className="p-2 rounded-lg border border-[#2E3330]/10 bg-white/70">
                <div className="flex items-center justify-between mb-0.5">
                  <div>
                    <p className="text-[9.5px] font-bold text-[#2E3330]">Ana Valentina Reyes</p>
                    <p className="text-[7.5px] font-mono text-[#5F665E]">Exp. #0730 · 04 nov 2026</p>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#EAEBD9] text-[#5E684C] text-[7.5px] font-bold uppercase">
                    Académico
                  </span>
                </div>
                <p className="text-[8px] text-[#5F665E] line-clamp-1">
                  Seguimiento a lectura y comprensión completado satisfactoriamente.
                </p>
              </div>
            </div>
          </div>

          {/* Barra inferior de inicio del smartphone (Home Indicator) */}
          <div className="h-5 w-full bg-[#FAF8F5] flex items-center justify-center shrink-0 border-t border-[#2E3330]/5">
            <div className="h-1 w-20 bg-[#2E3330]/30 rounded-full" />
          </div>

          {/* ========================================================================= */}
          {/* MODAL SUPERPUESTA EN LA PANTALLA DEL TELÉFONO: FICHA DE ORIENTACIÓN       */}
          {/* ========================================================================= */}
          {isFichaVisible && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-between p-2.5 animate-in fade-in zoom-in-95 duration-250">
              <div className="flex items-center justify-between text-white pb-1 border-b border-white/20">
                <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1 text-[#DEAE4D]">
                  <Sparkles size={10} /> Ficha Generada
                </span>
                <button
                  type="button"
                  onClick={handleCloseFicha}
                  className="p-1 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Imagen de la Ficha enmarcada en el teléfono */}
              <div className="relative my-auto bg-white p-1 rounded-sm shadow-xl border border-white/20 overflow-hidden">
                <img
                  src={fichaImg}
                  alt="Ficha de Orientación y Psicología generada en el teléfono"
                  className="max-h-[30vh] w-auto mx-auto object-contain block"
                />
              </div>

              {/* Botón prominente de acción dentro del teléfono */}
              <button
                type="button"
                onClick={() => setIsReportSent(true)}
                className={`w-full py-2 px-3 rounded-full text-center font-black text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg ${isReportSent
                  ? 'bg-[#689C63] text-white'
                  : 'bg-[#537BAC] hover:bg-[#43648E] text-white ring-2 ring-white/60 animate-pulse'
                  }`}
              >
                <Send size={10} />
                <span>{isReportSent ? 'REPORTE ENVIADO A ORIENTACIÓN ✓' : 'ENVIAR REPORTE A ORIENTACIÓN'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
