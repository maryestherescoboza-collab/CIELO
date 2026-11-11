
// We import it as default since SimCursoDetalle export default function SimCursoDetalle
import SimCursoDetalleComponent from './simulator/SimCursoDetalle';

export function InteractiveDemo() {
  
  
  

  

  return (
    <section id="descubrir" className="py-20 md:py-28 relative overflow-hidden bg-[#F8F3ED] border-t border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8 md:mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5F665E] block mb-2">
            Demostración interactiva
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#2E3330] tracking-tight mb-3">
            Vive la experiencia CIELO
          </h2>
          <p className="text-[#5F665E] font-medium text-sm md:text-base max-w-2xl mx-auto px-2">
            Prueba directamente el registro académico real: asigna puntajes, cambia de modo de evaluación y observa el cálculo ponderado en vivo.
          </p>
        </div>

        {/* Demo App Container */}
        <div 
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-[rgba(46,51,48,0.08)] overflow-hidden flex flex-col w-full max-w-450 mx-auto"
          style={{ transform: 'scale(0.92)', transformOrigin: 'top center' }}
        >
          {/* Table Area / Simulator */}
          <div className="flex-1 overflow-hidden relative">
            <SimCursoDetalleComponent />
          </div>
        </div>
      </div>
    </section>
  );
}
