export interface GuideStep {
  selector: string;
  texto: string;
  evento: 'click' | 'change';
}

export interface Guide {
  id: string;
  titulo: string;
  steps: GuideStep[];
}

export const CATALOGO_GUIAS: Guide[] = [
  {
    id: 'crear-curso',
    titulo: 'Crear un curso',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Haz clic en «Cursos» para acceder a tus cursos.',
        evento: 'click'
      },
      {
        selector: '#btn-nuevo-curso',
        texto: 'Haz clic en «Nuevo curso» para crear tu primer curso.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-actividades-alumnos',
    titulo: 'Crear actividades y agregar alumnos',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Haz clic en «Cursos».',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Haz clic en «Abrir registro académico».',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Haz clic en «+» para agregar un estudiante.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-estudiante"]',
        texto: 'Haz clic en la celda del estudiante y escribe su nombre con el formato: Nombre, Apellido.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Haz clic en «Agregar actividad» para crear una nueva actividad.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-actividad"]',
        texto: 'Haz clic sobre «Activ. #» para cambiar el nombre de la actividad.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'evaluar-actividad',
    titulo: 'Evaluar una actividad',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Haz clic en «Cursos».',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Haz clic en «Abrir registro académico».',
        evento: 'click'
      },
      {
        selector: '[data-guide="bloque-competencia"]',
        texto: 'Selecciona uno o varios de los cuatro bloques de competencias que aparecen juntos dentro de la actividad.',
        evento: 'click'
      },
      {
        selector: '[data-guide="puntuacion"]',
        texto: 'Selecciona una de las cuatro puntuaciones: 100, 85, 70 o 55. Debes seleccionar una.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Haz clic sobre las celdas vacías de la actividad para registrar la evaluación.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'evaluar-rubrica',
    titulo: 'Cómo evaluar con rúbrica',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(7)',
        texto: 'Haz clic en «Rúbrica».',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso que deseas evaluar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-actividad"]',
        texto: 'Haz clic en la actividad que deseas evaluar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Haz clic en la plantilla que deseas utilizar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="celda-rubrica"]',
        texto: 'Selecciona una celda de la rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="seleccionar-estudiantes"]',
        texto: 'Selecciona uno o más estudiantes.',
        evento: 'click'
      },
      {
        selector: '#btn-evaluar-alumnos',
        texto: 'Haz clic en «Evaluar alumnos» para aplicar la evaluación.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'evaluar-cotejo',
    titulo: 'Cómo evaluar con cotejo',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(8)',
        texto: 'Haz clic en «Cotejo».',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso que deseas evaluar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-actividad"]',
        texto: 'Haz clic en la actividad que deseas evaluar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Haz clic en la plantilla que deseas utilizar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="celda-cotejo"]',
        texto: 'Selecciona una celda de «No cumple» o «Logrado».',
        evento: 'click'
      },
      {
        selector: '[data-guide="seleccionar-estudiantes"]',
        texto: 'Selecciona uno o más estudiantes.',
        evento: 'click'
      },
      {
        selector: '#btn-evaluar-alumnos',
        texto: 'Haz clic en «Evaluar alumnos» para aplicar la evaluación.',
        evento: 'click'
      }
    ]
  }
];
