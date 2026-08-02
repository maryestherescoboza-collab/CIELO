
// We import it as default since SimCursoDetalle export default function SimCursoDetalle
import SimCursoDetalleComponent from './simulator/SimCursoDetalle';

export function InteractiveDemo() {
  
  
  

  

  return (
    <section className="py-24 relative overflow-hidden bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-[#2E3330] tracking-tighter mb-4">
            Vive la experiencia CIELO
          </h2>
          <p className="text-slate-500 font-medium text-base md:text-lg max-w-2xl mx-auto px-2">
            Interactúa con nuestro módulo de calificación simulado. Modifica notas, explora rúbricas y observa cómo todo reacciona al instante.
          </p>
        </div>

        {/* Demo App Container */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-[rgba(46,51,48,0.08)] overflow-hidden flex flex-col h-[500px] md:h-[600px] w-full max-w-5xl mx-auto">
          {/* Table Area / Simulator */}
          <div className="flex-1 overflow-hidden relative">
            <SimCursoDetalleComponent />
          </div>
        </div>
      </div>
    </section>
  );
}
