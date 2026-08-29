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
  },
  {
    id: 'crear-plantilla-rubrica',
    titulo: 'Crear una plantilla de rúbrica',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(7)',
        texto: 'Haz clic en «Rúbrica».',
        evento: 'click'
      },
      {
        selector: '[data-guide="editor-descriptor"]',
        texto: 'Completa los niveles y descriptores: haz clic dentro de una celda de la rúbrica y escribe el descriptor.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Tu plantilla quedó guardada. Haz clic aquí y selecciona su nombre en la lista para comprobarlo.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'crear-plantilla-cotejo',
    titulo: 'Crear una plantilla de lista de cotejo',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(8)',
        texto: 'Haz clic en «Cotejo».',
        evento: 'click'
      },
      {
        selector: '[data-guide="criterio-cotejo"]',
        texto: 'Completa los criterios: haz clic en una fila, escribe la descripción del indicador y haz clic fuera para continuar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Tu plantilla quedó guardada. Haz clic aquí y selecciona su nombre en la lista para comprobarlo.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'crear-actividades-ia',
    titulo: 'Crear actividades con IA',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(1)',
        texto: 'Haz clic en «Inicio» para ir al panel principal.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-nueva-actividad"]',
        texto: 'Haz clic en «Nueva Actividad».',
        evento: 'click'
      },
      {
        selector: '[data-guide="opcion-importar-ia"]',
        texto: 'Selecciona «Importar Inteligente desde PDF» para crear tus actividades con la IA.',
        evento: 'click'
      },
      {
        selector: '[data-guide="sel-curso-ia"]',
        texto: 'Selecciona el curso en el que se programarán las actividades.',
        evento: 'change'
      },
      {
        selector: '[data-guide="sel-periodo-ia"]',
        texto: 'Selecciona el período: P1, P2, P3 o P4.',
        evento: 'change'
      },
      {
        selector: '[data-guide="archivo-pdf"]',
        texto: 'Haz clic en el cuadro punteado y selecciona el documento PDF que contiene tus actividades.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-procesar-pdf"]',
        texto: 'Haz clic en «Procesar PDF». La IA analizará el documento. Si se pide tu API Key de Gemini, ingrésala, haz clic en «Guardar API Key» y el procesamiento continuará automáticamente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-actividad-ia"]',
        texto: 'Revisa las actividades detectadas. Marca o desmarca sus casillas para elegir cuáles programar y, si lo deseas, edita los campos directamente en la tabla. Deja al menos una marcada.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-guardar-actividades-ia"]',
        texto: 'Haz clic en «Guardar (N) Actividades» para programar las actividades seleccionadas en el curso.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-rubrica-ia',
    titulo: 'Crear rúbrica con IA',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(7)',
        texto: 'Haz clic en «Rúbrica».',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso para el que quieres crear la rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia"]',
        texto: 'Haz clic en «Generar con IA» para abrir el asistente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia-modal"]',
        texto: 'Haz clic en «Generar». La IA creará los descriptores de las cuatro competencias. Puedes elegir una actividad o escribir indicaciones adicionales si lo deseas. Si se pide tu API Key de Gemini, ingrésala, haz clic en «Guardar API Key» y presiona «Generar» nuevamente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-rubrica"]',
        texto: 'Revisa los descriptores generados por la IA. Haz clic en una celda de la rúbrica para editar el descriptor si lo necesitas.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de tu rúbrica y confírmalo.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-cotejo-ia',
    titulo: 'Crear lista de cotejo con IA',
    steps: [
      {
        selector: '.app-bottom-nav button:nth-child(8)',
        texto: 'Haz clic en «Cotejo».',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso para el que quieres crear la lista de cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia"]',
        texto: 'Haz clic en «Generar con IA» para abrir el asistente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia-modal"]',
        texto: 'Haz clic en «Generar». La IA creará los criterios de la lista de cotejo. Si se pide tu API Key de Gemini, ingrésala, haz clic en «Guardar API Key» y presiona «Generar» nuevamente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="criterio-cotejo"]',
        texto: 'Revisa los criterios generados por la IA. Haz clic sobre un criterio para verlo y, si lo necesitas, edita su descripción.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de tu lista de cotejo y confírmalo.',
        evento: 'click'
      }
    ]
  }
];
