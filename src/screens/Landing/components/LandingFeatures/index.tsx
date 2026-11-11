import { motion } from 'framer-motion';
import { 
  FileCheck2, 
  TableProperties, 
  BarChart3, 
  FolderSync, 
  GraduationCap, 
  ShieldCheck 
} from 'lucide-react';

export function LandingFeatures() {
  const modulosReales = [
    {
      categoria: 'Instrumentos y Criterios',
      titulo: 'Rúbricas socioformativas y listas de cotejo',
      descripcion: 'Diseña y aplica instrumentos alineados a los indicadores de logro. Define descriptores por niveles de dominio (BC1–BC4) y evalúa directamente desde el aula sin recurrir a cálculos manuales.',
      icono: FileCheck2,
      detalles: ['Niveles de dominio taxonómicos', 'Exportación oficial a Word (.docx)', 'Duplicación y reutilización entre cursos']
    },
    {
      categoria: 'Calificaciones y Registro',
      titulo: 'Registro académico continuo y recuperaciones',
      descripcion: 'Matriz de calificaciones conectada en tiempo real. Calcula promedios ponderados por período (P1–P4) y genera automáticamente las actas de recuperación pedagógica para estudiantes que lo requieran.',
      icono: TableProperties,
      detalles: ['Ponderación transparente por competencias', 'Actas de recuperación pedagógica', 'Descarga oficial en formato Excel (.xlsx)']
    },
    {
      categoria: 'Analítica y Boletines',
      titulo: 'Boletines de calificaciones e informes curriculares',
      descripcion: 'Genera boletines de período listos para entrega familiar con un solo clic. Visualiza el nivel de logro global y por estudiante para coordinar reuniones pedagógicas con datos certeros.',
      icono: BarChart3,
      detalles: ['Boletines oficiales para impresión', 'Progreso individual y grupal', 'Historial curricular centralizado']
    },
    {
      categoria: 'Evidencias y Portafolios',
      titulo: 'Portal del estudiante y recepción de productos',
      descripcion: 'Tus estudiantes acceden a su propio portal para consultar tareas, subir evidencias y revisar retroalimentaciones cualitativas, manteniendo organizados los productos de cada actividad.',
      icono: FolderSync,
      detalles: ['Acceso seguro para estudiantes', 'Recepción de evidencias digitales', 'Retroalimentación formativa oportuna']
    },
    {
      categoria: 'Planificación de Aula',
      titulo: 'Secuencias didácticas y fichas de clase',
      descripcion: 'Estructura tus unidades de aprendizaje vinculando cada actividad a saberes, contenidos mediadores y competencias fundamentales del currículo nacional.',
      icono: GraduationCap,
      detalles: ['Articulación curricular directa', 'Banco de secuencias didácticas', 'Organización de tiempos y recursos']
    },
    {
      categoria: 'Gestión Institucional',
      titulo: 'Acompañamiento a coordinación y directivos',
      descripcion: 'Espacio unificado para directores y coordinadores pedagógicos. Revisa el estado de entrega de planificaciones, supervisa la cobertura curricular y valida registros de todo el cuerpo docente.',
      icono: ShieldCheck,
      detalles: ['Supervisión centralizada por centro', 'Acompañamiento docente constructivo', 'Seguridad y respaldo permanente']
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-[#F8F3ED] border-t border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Encabezado de la sección */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5F665E] block mb-3">
            Ecosistema del producto
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#2E3330] tracking-tight leading-tight mb-5">
            Herramientas reales para cada etapa de tu labor docente.
          </h2>
          <p className="text-base md:text-lg text-[#5F665E] leading-relaxed">
            Sin hojas de cálculo dispersas ni cálculos manuales repetitivos. Una suite educativa integral pensada para resolver el flujo diario de los centros educativos.
          </p>
        </div>

        {/* Cuadrícula de funcionalidades reales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modulosReales.map((modulo) => {
            const Icon = modulo.icono;
            return (
              <motion.div
                key={modulo.titulo}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl p-7 border border-[rgba(46,51,48,0.08)] shadow-[0_4px_16px_rgba(46,51,48,0.02)] flex flex-col justify-between hover:border-[rgba(46,51,48,0.18)] transition-all"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[rgba(46,51,48,0.08)] flex items-center justify-center text-[#2E3330] mb-5">
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-bold text-[#5F665E] uppercase tracking-wider block mb-2">
                    {modulo.categoria}
                  </span>
                  <h3 className="text-lg font-bold text-[#2E3330] leading-snug mb-3">
                    {modulo.titulo}
                  </h3>
                  <p className="text-sm text-[#5F665E] leading-relaxed mb-6">
                    {modulo.descripcion}
                  </p>
                </div>

                <ul className="pt-4 border-t border-[rgba(46,51,48,0.06)] space-y-2">
                  {modulo.detalles.map((detalle, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-[#2E3330]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DEAE4D] shrink-0" />
                      <span>{detalle}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
