import type { BCKey } from '../types';

export const PRODUCTO_FINAL_NAME = 'Producto Final';

export interface SugerenciaProducto {
  id: string;
  titulo: string;
}

export const SUGERENCIAS_POR_COMPETENCIA: Record<BCKey, SugerenciaProducto[]> = {
  BC1: [
    { id: 'bc1-1', titulo: 'Exposición final o defensa de proyecto (individual o en equipo)' },
    { id: 'bc1-2', titulo: 'Ensayo argumentativo o informe final escrito' },
    { id: 'bc1-3', titulo: 'Grabación de un pódcast escolar o video explicativo' },
  ],
  BC2: [
    { id: 'bc2-1', titulo: 'Examen o quiz acumulativo de casos prácticos' },
    { id: 'bc2-2', titulo: 'Resolución de una guía de problemas complejos' },
    { id: 'bc2-3', titulo: 'Mapa conceptual de síntesis (que una todos los temas del período)' },
  ],
  BC3: [
    { id: 'bc3-1', titulo: 'Informe escrito de un proyecto científico o experimental' },
    { id: 'bc3-2', titulo: 'Maqueta o prototipo funcional (con materiales reciclados)' },
    { id: 'bc3-3', titulo: 'Presentación de una investigación digital o mural científico' },
  ],
  BC4: [
    { id: 'bc4-1', titulo: 'Portafolio final de evidencias con autovaloración' },
    { id: 'bc4-2', titulo: 'Diario reflexivo final (ensayo sobre su crecimiento y metas)' },
    { id: 'bc4-3', titulo: 'Ficha de coevaluación y desempeño actitudinal del período' },
  ],
};
