export interface FeatureChild {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface FeatureBranchType {
  id: string;
  label: string;
  x: number;
  y: number;
  children: FeatureChild[];
}

export const networkData = {
  center: { id: 'cielo', label: 'CIELO', x: 50, y: 50 },
  branches: [
    {
      id: 'evaluacion',
      label: 'Evaluación',
      x: 28,
      y: 32,
      children: [
        { id: 'ev-rubricas', label: 'Rúbricas', x: 15, y: 18 },
        { id: 'ev-cotejos', label: 'Cotejos', x: 25, y: 12 },
        { id: 'ev-calificaciones', label: 'Calificaciones', x: 12, y: 32 },
        { id: 'ev-indicadores', label: 'Indicadores', x: 18, y: 48 },
        { id: 'ev-evidencias', label: 'Evidencias', x: 38, y: 18 },
      ]
    },
    {
      id: 'organizacion',
      label: 'Organización',
      x: 72,
      y: 32,
      children: [
        { id: 'or-cursos', label: 'Cursos', x: 85, y: 18 },
        { id: 'or-estudiantes', label: 'Estudiantes', x: 75, y: 12 },
        { id: 'or-planificacion', label: 'Planificación', x: 88, y: 32 },
        { id: 'or-calendario', label: 'Calendario', x: 82, y: 48 },
        { id: 'or-incidencias', label: 'Incidencias', x: 62, y: 18 },
      ]
    },
    {
      id: 'seguimiento',
      label: 'Seguimiento',
      x: 28,
      y: 68,
      children: [
        { id: 'se-estadisticas', label: 'Estadísticas', x: 15, y: 82 },
        { id: 'se-historiales', label: 'Historiales', x: 25, y: 88 },
        { id: 'se-informes', label: 'Informes', x: 12, y: 68 },
        { id: 'se-boletines', label: 'Boletines', x: 18, y: 52 },
      ]
    },
    {
      id: 'comunidad',
      label: 'Comunidad',
      x: 72,
      y: 68,
      children: [
        { id: 'co-publicaciones', label: 'Publicaciones', x: 85, y: 82 },
        { id: 'co-comentarios', label: 'Comentarios', x: 75, y: 88 },
        { id: 'co-recursos', label: 'Recursos', x: 88, y: 68 },
        { id: 'co-perfiles', label: 'Perfiles', x: 82, y: 52 },
      ]
    }
  ] as FeatureBranchType[]
};
