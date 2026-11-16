import type { GuideOperationType } from './guideConfirmation';

export interface GuideStep {
  selector: string;
  texto: string;
  voz?: string;
  etapa?: number;
  tituloEtapa?: string;
  evento: 'click' | 'change' | 'dblclick';
  targetActionSelector?: string;
  esperarOperacion?: GuideOperationType;
  mensajeExito?: string;
}

export interface Guide {
  id: string;
  titulo: string;
  steps: GuideStep[];
}

export const CATALOGO_GUIAS: Guide[] = [
  {
    id: 'iniciacion',
    titulo: 'Guía de iniciación de CIELO',
    steps: [
      // ETAPA 1: CREAR UN CURSO
      {
        selector: '#nav-cursos, [data-guide="nav-cursos"]',
        texto: 'Vamos a crear tu primer curso. Aquí organizarás a tus estudiantes y asignaturas. Pulsa en «Cursos».',
        voz: 'Vamos a crear tu primer curso. Aquí organizarás a tus estudiantes y asignaturas. Pulsa en Cursos.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-nuevo-curso"], #btn-nuevo-curso',
        texto: 'Pulsa aquí para comenzar a configurar tu curso.',
        voz: 'Pulsa aquí para comenzar.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'click'
      },
      {
        selector: '[data-guide="modal-curso-formulario"], .cielo-modal-card',
        texto: 'Selecciona el grado escolar que vas a impartir, escribe la sección y elige la asignatura. Cuando termines, pulsa en «Confirmar Curso».',
        voz: 'Selecciona el grado escolar que vas a impartir, escribe la sección y elige la asignatura. Cuando termines, pulsa en Confirmar Curso.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'click',
        targetActionSelector: '[data-guide="modal-curso-confirmar"]',
        esperarOperacion: 'curso_guardar',
        mensajeExito: '¡Excelente! Tu curso ya está creado.'
      },

      // ETAPA 2: AGREGAR ALUMNOS
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Ahora vamos a agregar tus estudiantes. Haz clic en «Abrir registro académico» para entrar al curso.',
        voz: 'Ahora vamos a agregar tus estudiantes. Haz clic en Abrir registro académico para entrar a tu curso.',
        etapa: 2,
        tituloEtapa: 'Etapa 2: Agregar estudiantes',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Aquí puedes incorporarlos a tu curso. Pulsa en «Agregar estudiante».',
        voz: 'Aquí puedes incorporarlos a tu curso. Pulsa en Agregar estudiante.',
        etapa: 2,
        tituloEtapa: 'Etapa 2: Agregar estudiantes',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-estudiante"]',
        texto: 'Escribe el nombre del estudiante con el formato: Apellidos, Nombres y pulsa Enter.',
        voz: 'Escribe el nombre del estudiante con el formato Apellidos, Nombres.',
        etapa: 2,
        tituloEtapa: 'Etapa 2: Agregar estudiantes',
        evento: 'change',
        esperarOperacion: 'estudiante_guardar',
        mensajeExito: '¡Muy bien! Ya tienes estudiantes para trabajar.'
      },

      // ETAPA 3: CREAR UNA ACTIVIDAD
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Ahora vamos a crear una actividad. Pulsa en «+ AGREGAR ACTIVIDAD».',
        voz: 'Ahora vamos a crear una actividad. Pulsa en Agregar actividad.',
        etapa: 3,
        tituloEtapa: 'Etapa 3: Crear una actividad',
        evento: 'click'
      },
      {
        selector: '[data-guide="modal-actividad-formulario"], .cielo-modal-card',
        texto: 'Selecciona el indicador de logro que vas a evaluar y escribe el producto o evidencia. Luego pulsa en «Agregar actividad».',
        voz: 'Selecciona el indicador de logro que vas a evaluar y escribe el producto o evidencia. Luego pulsa en Agregar actividad.',
        etapa: 3,
        tituloEtapa: 'Etapa 3: Crear una actividad',
        evento: 'click',
        targetActionSelector: '[data-guide="modal-actividad-guardar"]',
        esperarOperacion: 'actividad_guardar',
        mensajeExito: '¡Perfecto! Tu actividad está lista.'
      },

      // ETAPA 4: APRENDER A EVALUAR (Pincel, Libre, Numérico)
      // 4.A Modo Pincel
      {
        selector: '[data-guide="modo-eval-pincel"]',
        texto: 'Con el modo pincel puedes evaluar rápidamente a tus estudiantes. Pulsa para activarlo.',
        voz: 'Con el modo pincel puedes evaluar rápidamente a tus estudiantes. Pulsa para activarlo.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Pincel)',
        evento: 'click'
      },
      {
        selector: '[data-guide="nivel-pincel-100"]',
        texto: 'Selecciona un nivel (por ejemplo, 100 Dominio completo) para cargarlo en el pincel.',
        voz: 'Selecciona un nivel y aplícalo a los indicadores correspondientes.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Pincel)',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Haz clic sobre una celda vacía para pintar la evaluación con el nivel seleccionado.',
        voz: 'Haz clic sobre una celda vacía para registrar la evaluación con el pincel.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Pincel)',
        evento: 'click',
        esperarOperacion: 'evaluacion_guardar',
        mensajeExito: '¡Evaluación con pincel registrada!'
      },
      // 4.B Modo Libre
      {
        selector: '[data-guide="modo-eval-libre"]',
        texto: 'Con el modo libre puedes elegir el nivel de cada indicador por separado. Pulsa para activarlo.',
        voz: 'Con el modo libre puedes elegir el nivel de cada indicador por separado. Pulsa para activarlo.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Libre)',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-evaluacion-input"]',
        texto: 'Observa el desempeño del estudiante y escribe su puntuación o nivel directamente en la casilla.',
        voz: 'Observa el desempeño del estudiante y selecciona el nivel que corresponda.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Libre)',
        evento: 'change',
        esperarOperacion: 'evaluacion_guardar',
        mensajeExito: '¡Calificación registrada correctamente!'
      },
      // 4.C Modo Numérico
      {
        selector: '[data-guide="modo-eval-numerico"]',
        texto: 'Con el modo numérico puedes registrar una puntuación predefinida. Pulsa para activarlo.',
        voz: 'Con el modo numérico puedes registrar una puntuación. Pulsa para activarlo.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Numérico)',
        evento: 'click'
      },
      {
        selector: '[data-guide="nivel-num-85"]',
        texto: 'Selecciona una puntuación numérica (por ejemplo, 85).',
        voz: 'Selecciona la puntuación que obtuvo el estudiante.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Numérico)',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Haz clic en la celda del estudiante para asignarle la puntuación numérica.',
        voz: 'Haz clic en la celda del estudiante para asignarle la puntuación numérica.',
        etapa: 4,
        tituloEtapa: 'Etapa 4: Aprender a evaluar (Modo Numérico)',
        evento: 'click',
        esperarOperacion: 'evaluacion_guardar',
        mensajeExito: '¡Puntuación numérica guardada!'
      },

      // ETAPA 5: EXPLICAR INDICADORES Y NIVELES DE LOGRO
      {
        selector: '[data-guide="barra-niveles-dominio"]',
        texto: 'Un indicador de logro describe lo que esperamos que el estudiante pueda demostrar. Al evaluar, debes observar su desempeño y seleccionar el nivel que mejor lo represente.',
        voz: 'Un indicador de logro describe lo que esperamos que el estudiante pueda demostrar. Al evaluar, debes observar su desempeño y seleccionar el nivel que mejor lo represente.',
        etapa: 5,
        tituloEtapa: 'Etapa 5: Indicadores y niveles de logro',
        evento: 'click'
      },
      {
        selector: '[data-guide="barra-niveles-dominio"]',
        texto: 'Los 4 niveles en CIELO son: 100 Dominio completo (autonomía), 85 Logro esperado (con pocas dificultades), 70 Logro parcial (desempeño parcial) y 55 Inicio (necesita apoyo). Pulsa aquí para finalizar.',
        voz: 'Los cuatro niveles oficiales en CIELO son: cien Dominio completo, ochenta y cinco Logro esperado, setenta Logro parcial y cincuenta y cinco Inicio. Pulsa aquí para finalizar tu iniciación.',
        etapa: 5,
        tituloEtapa: 'Etapa 5: Indicadores y niveles de logro',
        evento: 'click'
      }
    ]
  },
  {
    id: 'plan-recuperacion-p1',
    titulo: 'Plan de recuperación P1',
    steps: [
      {
        selector: '#btn-alertas-header',
        texto: 'Haz clic en «Alertas» para abrir las notificaciones y avisos del P1.',
        voz: 'Haz clic en Alertas para abrir las notificaciones y avisos del P1.',
        evento: 'click'
      },
      {
        selector: '[data-guide="alerta-recuperacion-p1"]',
        texto: 'Haz clic en el aviso «¡Plan de recuperación del P1 listo!» para ir a tu módulo de planificación.',
        voz: 'Haz clic en el aviso del Plan de recuperación para ir a tu módulo de planificación.',
        evento: 'click'
      },
      {
        selector: '[data-guide="tarjeta-plan-recuperacion-p1"]',
        texto: 'Haz clic en «Plan de recuperación pedagógica P1» para abrir y consultar el documento oficial.',
        voz: 'Haz clic en Plan de recuperación pedagógica P1 para abrir el documento oficial.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-curso',
    titulo: 'Crear un curso',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Vamos al módulo de cursos. Pulsa en «Cursos» para ver tus secciones.',
        voz: 'Vamos al módulo de cursos. Pulsa en Cursos para ver tus secciones.',
        evento: 'click'
      },
      {
        selector: '#btn-nuevo-curso, [data-guide="btn-nuevo-curso"]',
        texto: 'Ahora, pulsa en «Nuevo curso» para empezar a configurarlo.',
        voz: 'Ahora, pulsa en Nuevo curso para empezar a configurarlo.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-actividades-alumnos',
    titulo: 'Agregar actividades y alumnos',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Primero abramos la sección de cursos. Pulsa en «Cursos».',
        voz: 'Primero abramos la sección de cursos. Pulsa en Cursos.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Entra a tu curso pulsando en «Abrir registro académico».',
        voz: 'Entra a tu curso pulsando en Abrir registro académico.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Para añadir un estudiante a tu lista, pulsa en el botón «+».',
        voz: 'Para añadir un estudiante a tu lista, pulsa en el botón más.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-estudiante"]',
        texto: 'Escribe aquí los apellidos y nombres de tu estudiante.',
        voz: 'Escribe aquí los apellidos y nombres de tu estudiante.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Ahora, pulsa en «Agregar actividad» para planificar una nueva evaluación.',
        voz: 'Ahora, pulsa en Agregar actividad para planificar una nueva evaluación.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-actividad"]',
        texto: 'Puedes renombrar la actividad haciendo clic sobre su título.',
        voz: 'Puedes renombrar la actividad haciendo clic sobre su título.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'pase-de-lista',
    titulo: 'Cómo hacer el pase de lista',
    steps: [
      {
        selector: '#nav-inicio',
        texto: 'Vamos al panel principal. Pulsa en «Inicio».',
        voz: 'Vamos al panel principal. Pulsa en Inicio.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Abre el calendario escolar pulsando en «Organizar calendario».',
        voz: 'Abre el calendario escolar pulsando en Organizar calendario.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-pase-de-lista"]',
        texto: 'Inicia el registro del día pulsando en «Pase de lista».',
        voz: 'Inicia el registro del día pulsando en Pase de lista.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-curso-asistencia"]',
        texto: 'Selecciona el curso o asignatura donde tomarás la asistencia.',
        voz: 'Selecciona el curso o asignatura donde tomarás la asistencia.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-continuar-asistencia"]',
        texto: 'Pulsa en «Continuar» para ver la lista de tus estudiantes.',
        voz: 'Pulsa en Continuar para ver la lista de tus estudiantes.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-estado-estudiante"]',
        texto: 'Toca el círculo del estudiante para cambiar su estado a Ausente.',
        voz: 'Toca el círculo del estudiante para cambiar su estado a Ausente.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-estado-estudiante"]',
        texto: 'Haz otro clic para cambiar a Tardanza.',
        voz: 'Haz otro clic para cambiar a Tardanza.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-estado-estudiante"]',
        texto: 'Haz un clic más para cambiar a Excusa (un clic adicional vuelve a Presente).',
        voz: 'Haz un clic más para cambiar a Excusa.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-continuar-asistencia"]',
        texto: 'Haz clic en «Continuar» para revisar el resumen de asistencia.',
        voz: 'Haz clic en Continuar para revisar el resumen de asistencia.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-asistencia"]',
        texto: 'Haz clic en «Guardar asistencia» para confirmar y registrar el pase de lista.',
        voz: 'Haz clic en Guardar asistencia para confirmar y registrar el pase de lista.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'evaluar-actividad',
    titulo: 'Evaluar una actividad por indicador',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Haz clic en «Cursos».',
        voz: 'Haz clic en Cursos.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Haz clic en «Abrir registro académico».',
        voz: 'Haz clic en Abrir registro académico.',
        evento: 'click'
      },
      {
        selector: '[data-guide="bloque-competencia"]',
        texto: 'Selecciona uno o varios de los cuatro bloques de competencias que aparecen juntos dentro de la actividad.',
        voz: 'Selecciona los bloques de competencias dentro de la actividad.',
        evento: 'click'
      },
      {
        selector: '[data-guide="puntuacion"]',
        texto: 'Selecciona una de las cuatro puntuaciones: 100, 85, 70 o 55. Debes seleccionar una.',
        voz: 'Selecciona una de las cuatro puntuaciones: cien, ochenta y cinco, setenta o cincuenta y cinco.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Haz clic sobre las celdas vacías de la actividad para registrar la evaluación.',
        voz: 'Haz clic sobre las celdas vacías de la actividad para registrar la evaluación.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'como-crear-plantilla-rubrica',
    titulo: 'Cómo crear una plantilla de rúbrica',
    steps: [
      {
        selector: '#nav-rubrica',
        texto: 'Haz clic en «Rúbrica».',
        voz: 'Haz clic en Rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="editor-descriptor"]',
        texto: 'Completa los niveles y descriptores: haz clic dentro de una celda de la rúbrica y escribe el descriptor.',
        voz: 'Completa los niveles y descriptores haciendo clic en una celda de la rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma el nombre.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Tu plantilla quedó guardada. Haz clic aquí y selecciona su nombre en la lista para comprobarlo.',
        voz: 'Tu plantilla quedó guardada. Compruébalo seleccionándola en la lista.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'como-crear-plantilla-cotejo',
    titulo: 'Cómo crear una plantilla de lista de cotejo',
    steps: [
      {
        selector: '#nav-cotejo',
        texto: 'Haz clic en «Cotejo».',
        voz: 'Haz clic en Cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="criterio-cotejo"]',
        texto: 'Completa los criterios: haz clic en una fila, escribe la descripción del indicador y haz clic fuera para continuar.',
        voz: 'Completa los criterios escribiendo la descripción del indicador.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma el nombre.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Tu plantilla quedó guardada. Haz clic aquí y selecciona su nombre en la lista para comprobarlo.',
        voz: 'Tu plantilla quedó guardada. Compruébalo seleccionándola en la lista.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'evaluar-rubrica',
    titulo: 'Cómo evaluar con rúbrica',
    steps: [
      {
        selector: '#nav-rubrica',
        texto: 'Haz clic en «Rúbrica».',
        voz: 'Haz clic en Rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso que deseas evaluar.',
        voz: 'Haz clic en el curso que deseas evaluar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-actividad"]',
        texto: 'Haz clic en la actividad que deseas evaluar.',
        voz: 'Haz clic en la actividad que deseas evaluar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Haz clic en la plantilla que deseas utilizar.',
        voz: 'Haz clic en la plantilla que deseas utilizar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="celda-rubrica"]',
        texto: 'Selecciona una celda de la rúbrica.',
        voz: 'Selecciona una celda de la rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="seleccionar-estudiantes"]',
        texto: 'Selecciona uno o más estudiantes.',
        voz: 'Selecciona uno o más estudiantes.',
        evento: 'click'
      },
      {
        selector: '#btn-evaluar-alumnos',
        texto: 'Haz clic en «Evaluar alumnos» para aplicar la evaluación.',
        voz: 'Haz clic en Evaluar alumnos para aplicar la evaluación.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'evaluar-cotejo',
    titulo: 'Cómo evaluar con cotejo',
    steps: [
      {
        selector: '#nav-cotejo',
        texto: 'Haz clic en «Cotejo».',
        voz: 'Haz clic en Cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso que deseas evaluar.',
        voz: 'Haz clic en el curso que deseas evaluar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-actividad"]',
        texto: 'Haz clic en la actividad que deseas evaluar.',
        voz: 'Haz clic en la actividad que deseas evaluar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Haz clic en la plantilla que deseas utilizar.',
        voz: 'Haz clic en la plantilla que deseas utilizar.',
        evento: 'change'
      },
      {
        selector: '[data-guide="celda-cotejo"]',
        texto: 'Selecciona una celda de «No cumple» o «Logrado».',
        voz: 'Selecciona una celda de No cumple o Logrado.',
        evento: 'click'
      },
      {
        selector: '[data-guide="seleccionar-estudiantes"]',
        texto: 'Selecciona uno o más estudiantes.',
        voz: 'Selecciona uno o más estudiantes.',
        evento: 'click'
      },
      {
        selector: '#btn-evaluar-alumnos',
        texto: 'Haz clic en «Evaluar alumnos» para aplicar la evaluación.',
        voz: 'Haz clic en Evaluar alumnos para aplicar la evaluación.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-plantilla-rubrica',
    titulo: 'Crear una plantilla de rúbrica',
    steps: [
      {
        selector: '#nav-rubrica',
        texto: 'Haz clic en «Rúbrica».',
        voz: 'Haz clic en Rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="editor-descriptor"]',
        texto: 'Completa los niveles y descriptores: haz doble clic dentro de una celda de la rúbrica para comenzar a escribir el descriptor.',
        voz: 'Completa los niveles y descriptores haciendo doble clic en una celda.',
        evento: 'dblclick'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma el nombre.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-plantilla"]',
        texto: 'Tu plantilla quedó guardada. Haz clic aquí y selecciona su nombre en la lista para comprobarlo.',
        voz: 'Tu plantilla quedó guardada.',
        evento: 'change'
      }
    ]
  },
  {
    id: 'crear-plantilla-cotejo',
    titulo: 'Crear una plantilla de lista de cotejo',
    steps: [
      {
        selector: '#nav-cotejo',
        texto: 'Haz clic en «Cotejo».',
        voz: 'Haz clic en Cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-agregar-criterio"]',
        texto: 'Haz clic en «+» dentro de la tabla para agregar un nuevo indicador.',
        voz: 'Haz clic en más dentro de la tabla para agregar un nuevo indicador.',
        evento: 'click'
      },
      {
        selector: '[data-guide="criterio-cotejo"]',
        texto: 'Escribe aquí la descripción del indicador.',
        voz: 'Escribe aquí la descripción del indicador.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de la plantilla en la ventana que aparece y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma el nombre.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-actividades-ia',
    titulo: 'Agregar actividades con IA',
    steps: [
      {
        selector: '#nav-inicio',
        texto: 'Haz clic en «Inicio» para ir al panel principal.',
        voz: 'Haz clic en Inicio para ir al panel principal.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-nueva-actividad"]',
        texto: 'Haz clic en «Nueva Actividad».',
        voz: 'Haz clic en Nueva Actividad.',
        evento: 'click'
      },
      {
        selector: '[data-guide="opcion-importar-ia"]',
        texto: 'Selecciona «Importar Inteligente desde Texto» para crear tus actividades con la IA.',
        voz: 'Selecciona Importar Inteligente desde Texto.',
        evento: 'click'
      },
      {
        selector: '[data-guide="sel-curso-ia"]',
        texto: 'Selecciona el curso en el que se programarán las actividades.',
        voz: 'Selecciona el curso en el que se programarán las actividades.',
        evento: 'change'
      },
      {
        selector: '[data-guide="sel-periodo-ia"]',
        texto: 'Selecciona el período: P1, P2, P3 o P4.',
        voz: 'Selecciona el período pedagógico.',
        evento: 'change'
      },
      {
        selector: '[data-guide="texto-actividad"]',
        texto: 'Pega aquí el texto de la actividad. Puedes copiarlo desde un PDF u otro documento.',
        voz: 'Pega aquí el texto de la actividad.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-analizar-texto"]',
        texto: 'Haz clic en «Analizar». La IA analizará el texto. Si se pide tu API Key de Gemini, ingrésala, haz clic en «Guardar API Key» y el análisis continuará automáticamente.',
        voz: 'Haz clic en Analizar para procesar el texto.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-actividad-ia"]',
        texto: 'Revisa las actividades detectadas. Marca o desmarca sus casillas para elegir cuáles programar y, si lo deseas, edita los campos directamente en la tabla. Deja al menos una marcada.',
        voz: 'Revisa las actividades detectadas.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-guardar-actividades-ia"]',
        texto: 'Haz clic en «Guardar (N) Actividades» para programar las actividades seleccionadas en el curso.',
        voz: 'Haz clic en Guardar Actividades para programarlas en tu curso.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-rubrica-ia',
    titulo: 'Crear rúbrica con IA',
    steps: [
      {
        selector: '#nav-rubrica',
        texto: 'Haz clic en «Rúbrica».',
        voz: 'Haz clic en Rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso para el que quieres crear la rúbrica.',
        voz: 'Haz clic en el curso para el que quieres crear la rúbrica.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia"]',
        texto: 'Haz clic en «Generar con IA» para abrir el asistente.',
        voz: 'Haz clic en Generar con IA.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia-modal"]',
        texto: 'Haz clic en «Generar». La IA creará los descriptores de las cuatro competencias.',
        voz: 'Haz clic en Generar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-rubrica"]',
        texto: 'Revisa los descriptores generados por la IA. Haz clic en una celda de la rúbrica para editar el descriptor si lo necesitas.',
        voz: 'Revisa los descriptores generados.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de tu rúbrica y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma.',
        evento: 'click'
      }
    ]
  },
  {
    id: 'crear-cotejo-ia',
    titulo: 'Crear lista de cotejo con IA',
    steps: [
      {
        selector: '#nav-cotejo',
        texto: 'Haz clic en «Cotejo».',
        voz: 'Haz clic en Cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="selector-curso"]',
        texto: 'Haz clic en el curso para el que quieres crear la lista de cotejo.',
        voz: 'Haz clic en el curso para el que quieres crear la lista de cotejo.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia"]',
        texto: 'Haz clic en «Generar con IA» para abrir el asistente.',
        voz: 'Haz clic en Generar con IA.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-generar-ia-modal"]',
        texto: 'Haz clic en «Generar». La IA creará los criterios de la lista de cotejo.',
        voz: 'Haz clic en Generar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="criterio-cotejo"]',
        texto: 'Revisa los criterios generados por la IA. Haz clic sobre un criterio para verlo y, si lo necesitas, edita su descripción.',
        voz: 'Revisa los criterios generados.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Haz clic en «Guardar como Plantilla», escribe el nombre de tu lista de cotejo y confírmalo.',
        voz: 'Haz clic en Guardar como Plantilla y confirma.',
        evento: 'click'
      }
    ]
  },

  // ── LAS 23 GUÍAS OFICIALES DE CIELO ──
  // Cursos (01 a 03)
  {
    id: 'guia-01',
    titulo: '01 Crear un curso',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Vamos al módulo de cursos. Pulsa en «Cursos» para ver tus secciones.',
        voz: 'Vamos al módulo de cursos. Pulsa en Cursos para ver tus secciones.',
        evento: 'click',
        tituloEtapa: 'Cursos: 01 Crear un curso'
      },
      {
        selector: '[data-guide="btn-nuevo-curso"], #btn-nuevo-curso',
        texto: 'Ahora, pulsa en «Nuevo curso» para abrir la ventana de configuración.',
        voz: 'Ahora, pulsa en Nuevo curso para empezar a configurarlo.',
        evento: 'click',
        tituloEtapa: 'Cursos: 01 Crear un curso'
      },
      {
        selector: '[data-guide="modal-curso-formulario"], .cielo-modal-card',
        texto: 'Selecciona el grado escolar, la sección y la asignatura. Luego pulsa en «Confirmar Curso».',
        voz: 'Selecciona el grado escolar, la sección y la asignatura. Luego pulsa en Confirmar Curso.',
        evento: 'click',
        targetActionSelector: '[data-guide="modal-curso-confirmar"]',
        esperarOperacion: 'curso_guardar',
        mensajeExito: '¡Excelente! Tu curso ya está creado.',
        tituloEtapa: 'Cursos: 01 Crear un curso'
      }
    ]
  },
  {
    id: 'guia-02',
    titulo: '02 Editar o archivar un curso',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Entra a la vista de cursos pulsando en «Cursos».',
        voz: 'Entra a la vista de cursos pulsando en Cursos.',
        evento: 'click',
        tituloEtapa: 'Cursos: 02 Editar o archivar un curso'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Aquí puedes visualizar tus cursos activos. Para editar datos o archivar un curso, usa el menú de opciones del curso.',
        voz: 'Aquí puedes visualizar tus cursos activos. Para editar datos o archivar un curso, usa el menú de opciones del curso.',
        evento: 'click',
        tituloEtapa: 'Cursos: 02 Editar o archivar un curso'
      },
      {
        selector: 'header, [data-guide="btn-alertas"]',
        texto: 'Al archivar un curso, se conservan todas las calificaciones de períodos escolares anteriores.',
        voz: 'Al archivar un curso, se conservan todas las calificaciones de períodos escolares anteriores.',
        evento: 'click',
        tituloEtapa: 'Cursos: 02 Editar o archivar un curso'
      }
    ]
  },
  {
    id: 'guia-03',
    titulo: '03 Duplicar un curso',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Abre el catálogo de tus cursos pulsando en «Cursos».',
        voz: 'Abre el catálogo de tus cursos pulsando en Cursos.',
        evento: 'click',
        tituloEtapa: 'Cursos: 03 Duplicar un curso'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Selecciona el curso base que deseas clonar para otra sección.',
        voz: 'Selecciona el curso base que deseas clonar para otra sección.',
        evento: 'click',
        tituloEtapa: 'Cursos: 03 Duplicar un curso'
      },
      {
        selector: '[data-guide="btn-nuevo-curso"], #btn-nuevo-curso',
        texto: 'Al duplicar, CIELO mantendrá tus actividades e indicadores ahorrándote tiempo de planificación.',
        voz: 'Al duplicar, CIELO mantendrá tus actividades e indicadores ahorrándote tiempo de planificación.',
        evento: 'click',
        tituloEtapa: 'Cursos: 03 Duplicar un curso'
      }
    ]
  },

  // Asignaturas (04 a 06)
  {
    id: 'guia-04',
    titulo: '04 Agregar asignaturas',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Pulsa en «Cursos» para revisar las asignaturas vinculadas a tus grados.',
        voz: 'Pulsa en Cursos para revisar las asignaturas vinculadas a tus grados.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 04 Agregar asignaturas'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Abre el registro académico para asociar asignaturas oficiales del currículo.',
        voz: 'Abre el registro académico para asociar asignaturas oficiales del currículo.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 04 Agregar asignaturas'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Selecciona la materia correspondiente para vincular sus competencias específicas.',
        voz: 'Selecciona la materia correspondiente para vincular sus competencias específicas.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 04 Agregar asignaturas'
      }
    ]
  },
  {
    id: 'guia-05',
    titulo: '05 Asignar docentes',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Pulsa en «Cursos» para ver las asignaciones de tu centro educativo.',
        voz: 'Pulsa en Cursos para ver las asignaciones de tu centro educativo.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 05 Asignar docentes'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Selecciona la materia donde colaborará otro maestro.',
        voz: 'Selecciona la materia donde colaborará otro maestro.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 05 Asignar docentes'
      },
      {
        selector: 'header, [data-guide="btn-alertas"]',
        texto: 'Define los permisos y asignaciones del equipo docente según corresponda.',
        voz: 'Define los permisos y asignaciones del equipo docente según corresponda.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 05 Asignar docentes'
      }
    ]
  },
  {
    id: 'guia-06',
    titulo: '06 Configurar horarios',
    steps: [
      {
        selector: '#nav-inicio',
        texto: 'Vamos al panel principal de CIELO pulsando en «Inicio».',
        voz: 'Vamos al panel principal de CIELO pulsando en Inicio.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 06 Configurar horarios'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Pulsa en «Organizar calendario» para visualizar tu semana escolar.',
        voz: 'Pulsa en Organizar calendario para visualizar tu semana escolar.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 06 Configurar horarios'
      },
      {
        selector: '[data-guide="btn-pase-de-lista"]',
        texto: 'Configura los días y bloques horarios de tus clases presenciales.',
        voz: 'Configura los días y bloques horarios de tus clases presenciales.',
        evento: 'click',
        tituloEtapa: 'Asignaturas: 06 Configurar horarios'
      }
    ]
  },

  // Estudiantes (07 a 10)
  {
    id: 'guia-07',
    titulo: '07 Inscribir estudiantes',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Primero abramos la sección de cursos. Pulsa en «Cursos».',
        voz: 'Primero abramos la sección de cursos. Pulsa en Cursos.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 07 Inscribir estudiantes'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Abre el registro académico donde agregarás a tus alumnos.',
        voz: 'Abre el registro académico donde agregarás a tus alumnos.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 07 Inscribir estudiantes'
      },
      {
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Pulsa en el botón «+» para inscribir un nuevo estudiante en tu lista.',
        voz: 'Pulsa en el botón más para inscribir un nuevo estudiante.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 07 Inscribir estudiantes'
      }
    ]
  },
  {
    id: 'guia-08',
    titulo: '08 Importar desde Excel',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Pulsa en «Cursos» y entra al registro académico.',
        voz: 'Pulsa en Cursos y entra al registro académico.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 08 Importar desde Excel'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Abre el registro académico donde cargarás la nómina estudiantil.',
        voz: 'Abre el registro académico donde cargarás la nómina estudiantil.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 08 Importar desde Excel'
      },
      {
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Usa la importación masiva para pegar listas de estudiantes desde Excel en un solo paso.',
        voz: 'Usa la importación masiva para pegar listas de estudiantes desde Excel en un solo paso.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 08 Importar desde Excel'
      }
    ]
  },
  {
    id: 'guia-09',
    titulo: '09 Gestionar grupos',
    steps: [
      {
        selector: '#nav-estudiante',
        texto: 'Abre el módulo de «Estudiantes» en la barra de navegación.',
        voz: 'Abre el módulo de Estudiantes en la barra de navegación.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 09 Gestionar grupos'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Selecciona el grupo o sección escolar que vas a organizar.',
        voz: 'Selecciona el grupo o sección escolar que vas a organizar.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 09 Gestionar grupos'
      },
      {
        selector: '[data-guide="celda-estudiante"]',
        texto: 'Agrupa a tus estudiantes en equipos para dinámicas de aula y proyectos colectivos.',
        voz: 'Agrupa a tus estudiantes en equipos para dinámicas de aula y proyectos colectivos.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 09 Gestionar grupos'
      }
    ]
  },
  {
    id: 'guia-10',
    titulo: '10 Invitar por enlace',
    steps: [
      {
        selector: '#nav-inicio',
        texto: 'Ve a la pantalla de «Inicio» para consultar los accesos rápidos.',
        voz: 'Ve a la pantalla de Inicio para consultar los accesos rápidos.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 10 Invitar por enlace'
      },
      {
        selector: '[data-guide="btn-alertas"], header',
        texto: 'Desde aquí puedes acceder al generador de enlaces y códigos QR para tus estudiantes.',
        voz: 'Desde aquí puedes acceder al generador de enlaces y códigos QR para tus estudiantes.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 10 Invitar por enlace'
      },
      {
        selector: 'header',
        texto: 'Copia el enlace de acceso seguro para compartirlo por correo o mensajería con las familias.',
        voz: 'Copia el enlace de acceso seguro para compartirlo por correo o mensajería con las familias.',
        evento: 'click',
        tituloEtapa: 'Estudiantes: 10 Invitar por enlace'
      }
    ]
  },

  // Contenido (11 a 13)
  {
    id: 'guia-11',
    titulo: '11 Subir materiales',
    steps: [
      {
        selector: '#nav-plan-clases',
        texto: 'Ingresa a la sección de contenidos pulsando en «Plan clases».',
        voz: 'Ingresa a la sección de contenidos pulsando en Plan clases.',
        evento: 'click',
        tituloEtapa: 'Contenido: 11 Subir materiales'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Selecciona la secuencia o tema curricular donde adjuntarás los recursos didácticos.',
        voz: 'Selecciona la secuencia o tema curricular donde adjuntarás los recursos didácticos.',
        evento: 'click',
        tituloEtapa: 'Contenido: 11 Subir materiales'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Carga documentos PDF, guías o enlaces web para el estudio de tus estudiantes.',
        voz: 'Carga documentos PDF, guías o enlaces web para el estudio de tus estudiantes.',
        evento: 'click',
        tituloEtapa: 'Contenido: 11 Subir materiales'
      }
    ]
  },
  {
    id: 'guia-12',
    titulo: '12 Crear una actividad',
    steps: [
      {
        selector: '[data-guide="modal-actividad-selector-contenidos"]',
        texto: 'Primero, elige el contenido que trabajarás en esta actividad.',
        voz: 'Primero, elige el contenido que trabajarás en esta actividad.',
        evento: 'click',
        targetActionSelector: '[data-guide="item-contenido"], [data-guide="modal-actividad-selector-contenidos"] button',
        tituloEtapa: 'Paso 1: Elige el contenido'
      },
      {
        selector: '[data-guide="modal-actividad-selector-indicadores"]',
        texto: 'Ahora, selecciona el indicador de logro que deseas evaluar.',
        voz: 'Ahora, selecciona el indicador de logro que deseas evaluar.',
        evento: 'click',
        targetActionSelector: '[data-guide="item-indicador"]',
        tituloEtapa: 'Paso 2: Selecciona el indicador'
      },
      {
        selector: '[data-guide="modal-actividad-producto"]',
        texto: 'Por último, escribe el producto o evidencia que elaborará el estudiante. Por ejemplo: cuaderno de trabajo.',
        voz: 'Por último, escribe el producto o evidencia que elaborará el estudiante. Por ejemplo: cuaderno de trabajo.',
        evento: 'change',
        targetActionSelector: '[data-guide="modal-actividad-producto"]',
        tituloEtapa: 'Paso 3: Escribe el producto'
      }
    ]
  },
  {
    id: 'agregar-actividad',
    titulo: 'Agregar actividad',
    steps: [
      {
        selector: '[data-guide="modal-actividad-selector-contenidos"]',
        texto: 'Primero, elige el contenido que trabajarás en esta actividad.',
        voz: 'Primero, elige el contenido que trabajarás en esta actividad.',
        evento: 'click',
        targetActionSelector: '[data-guide="item-contenido"], [data-guide="modal-actividad-selector-contenidos"] button',
        tituloEtapa: 'Paso 1: Elige el contenido'
      },
      {
        selector: '[data-guide="modal-actividad-selector-indicadores"]',
        texto: 'Ahora, selecciona el indicador de logro que deseas evaluar.',
        voz: 'Ahora, selecciona el indicador de logro que deseas evaluar.',
        evento: 'click',
        targetActionSelector: '[data-guide="item-indicador"]',
        tituloEtapa: 'Paso 2: Selecciona el indicador'
      },
      {
        selector: '[data-guide="modal-actividad-producto"]',
        texto: 'Por último, escribe el producto o evidencia que elaborará el estudiante. Por ejemplo: cuaderno de trabajo.',
        voz: 'Por último, escribe el producto o evidencia que elaborará el estudiante. Por ejemplo: cuaderno de trabajo.',
        evento: 'change',
        targetActionSelector: '[data-guide="modal-actividad-producto"]',
        tituloEtapa: 'Paso 3: Escribe el producto'
      }
    ]
  },
  {
    id: 'guia-13',
    titulo: '13 Programar publicaciones',
    steps: [
      {
        selector: '#nav-plan-clases',
        texto: 'Abre el módulo «Plan clases» en la navegación principal.',
        voz: 'Abre el módulo Plan clases en la navegación principal.',
        evento: 'click',
        tituloEtapa: 'Contenido: 13 Programar publicaciones'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Revisa el calendario de secuencias didácticas y asignaciones.',
        voz: 'Revisa el calendario de secuencias didácticas y asignaciones.',
        evento: 'click',
        tituloEtapa: 'Contenido: 13 Programar publicaciones'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Asigna la fecha y hora de entrega para que las tareas se publiquen automáticamente.',
        voz: 'Asigna la fecha y hora de entrega para que las tareas se publiquen automáticamente.',
        evento: 'click',
        tituloEtapa: 'Contenido: 13 Programar publicaciones'
      }
    ]
  },

  // Evaluación (14 a 17)
  {
    id: 'guia-14',
    titulo: '14 Crear una evaluación',
    steps: [
      {
        selector: '#nav-rubrica',
        texto: 'Pulsa en «Rúbrica» para abrir el creador de instrumentos de evaluación.',
        voz: 'Pulsa en Rúbrica para abrir el creador de instrumentos de evaluación.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 14 Crear una evaluación'
      },
      {
        selector: '#nav-cotejo',
        texto: 'También puedes pulsar en «Cotejo» para instrumentos de verificación por criterios.',
        voz: 'También puedes pulsar en Cotejo para instrumentos de verificación por criterios.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 14 Crear una evaluación'
      },
      {
        selector: '[data-guide="btn-generar-ia"]',
        texto: 'Usa el asistente de inteligencia artificial para redactar criterios según el indicador.',
        voz: 'Usa el asistente de inteligencia artificial para redactar criterios según el indicador.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 14 Crear una evaluación'
      },
      {
        selector: '[data-guide="btn-guardar-plantilla"]',
        texto: 'Guarda la evaluación para aplicarla en tus clases y generar calificaciones automáticas.',
        voz: 'Guarda la evaluación para aplicarla en tus clases y generar calificaciones automáticas.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 14 Crear una evaluación'
      }
    ]
  },
  {
    id: 'guia-15',
    titulo: '15 Calificar entregas',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Abre «Cursos» y pulsa en tu registro académico.',
        voz: 'Abre Cursos y pulsa en tu registro académico.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 15 Calificar entregas'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Entra a la planilla de calificaciones del curso.',
        voz: 'Entra a la planilla de calificaciones del curso.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 15 Calificar entregas'
      },
      {
        selector: '[data-guide="modo-eval-pincel"]',
        texto: 'Activa el modo Pincel para calificar de manera rápida y visual.',
        voz: 'Activa el modo Pincel para calificar de manera rápida y visual.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 15 Calificar entregas'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Aplica el nivel de logro correspondiente a cada estudiante.',
        voz: 'Aplica el nivel de logro correspondiente a cada estudiante.',
        evento: 'click',
        esperarOperacion: 'evaluacion_guardar',
        mensajeExito: '¡Calificación registrada correctamente!',
        tituloEtapa: 'Evaluación: 15 Calificar entregas'
      }
    ]
  },
  {
    id: 'guia-16',
    titulo: '16 Dar retroalimentación',
    steps: [
      {
        selector: '#nav-sellos',
        texto: 'Ingresa a «Sellos» para registrar reconocimientos formativos y formativos.',
        voz: 'Ingresa a Sellos para registrar reconocimientos formativos.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 16 Dar retroalimentación'
      },
      {
        selector: '[data-guide="celda-evaluacion"]',
        texto: 'Selecciona el estudiante o la casilla de evaluación a retroalimentar.',
        voz: 'Selecciona el estudiante o la casilla de evaluación a retroalimentar.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 16 Dar retroalimentación'
      },
      {
        selector: '[data-guide="barra-niveles-dominio"]',
        texto: 'Añade observaciones constructivas y orientaciones pedagógicas de mejora.',
        voz: 'Añade observaciones constructivas y orientaciones pedagógicas de mejora.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 16 Dar retroalimentación'
      }
    ]
  },
  {
    id: 'guia-17',
    titulo: '17 Libro de calificaciones',
    steps: [
      {
        selector: '#nav-cursos',
        texto: 'Dirígete a «Cursos» para ver las secciones activas.',
        voz: 'Dirígete a Cursos para ver las secciones activas.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 17 Libro de calificaciones'
      },
      {
        selector: '[data-guide="btn-abrir-registro-academico"]',
        texto: 'Entra al registro académico del curso que deseas auditar.',
        voz: 'Entra al registro académico del curso que deseas auditar.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 17 Libro de calificaciones'
      },
      {
        selector: 'header',
        texto: 'Revisa los promedios acumulados, las ponderaciones y el consolidado oficial por período.',
        voz: 'Revisa los promedios acumulados, las ponderaciones y el consolidado oficial por período.',
        evento: 'click',
        tituloEtapa: 'Evaluación: 17 Libro de calificaciones'
      }
    ]
  },

  // Seguimiento (18 a 20)
  {
    id: 'guia-18',
    titulo: '18 Tomar asistencia',
    steps: [
      {
        selector: '#nav-inicio',
        texto: 'Vamos al panel principal. Pulsa en «Inicio».',
        voz: 'Vamos al panel principal. Pulsa en Inicio.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 18 Tomar asistencia'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Abre el calendario escolar pulsando en «Organizar calendario».',
        voz: 'Abre el calendario escolar pulsando en Organizar calendario.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 18 Tomar asistencia'
      },
      {
        selector: '[data-guide="btn-pase-de-lista"]',
        texto: 'Inicia el registro del día pulsando en «Pase de lista».',
        voz: 'Inicia el registro del día pulsando en Pase de lista.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 18 Tomar asistencia'
      },
      {
        selector: '[data-guide="btn-estado-estudiante"]',
        texto: 'Toca el círculo del estudiante para alternar entre Presente, Ausente, Tardanza o Excusa.',
        voz: 'Toca el círculo del estudiante para alternar su estado de asistencia.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 18 Tomar asistencia'
      }
    ]
  },
  {
    id: 'guia-19',
    titulo: '19 Reportes de progreso',
    steps: [
      {
        selector: '#nav-dashboard',
        texto: 'Ingresa al «Dashboard» para ver analíticas globales de rendimiento.',
        voz: 'Ingresa al Dashboard para ver analíticas globales de rendimiento.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 19 Reportes de progreso'
      },
      {
        selector: '#nav-incidencias',
        texto: 'Consulta el historial de incidencias y anotaciones pedagógicas.',
        voz: 'Consulta el historial de incidencias y anotaciones pedagógicas.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 19 Reportes de progreso'
      },
      {
        selector: 'header',
        texto: 'Genera reportes imprimibles o descargables en formato oficial.',
        voz: 'Genera reportes imprimibles o descargables en formato oficial.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 19 Reportes de progreso'
      }
    ]
  },
  {
    id: 'guia-20',
    titulo: '20 Comunicarte con las familias',
    steps: [
      {
        selector: '#nav-estudiante',
        texto: 'Abre la sección de «Estudiantes» para consultar los contactos de tutores y familias.',
        voz: 'Abre la sección de Estudiantes para consultar los contactos de tutores y familias.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 20 Comunicarte con las familias'
      },
      {
        selector: '[data-guide="btn-alertas"]',
        texto: 'Revisa las notificaciones y comunicaciones pendientes.',
        voz: 'Revisa las notificaciones y comunicaciones pendientes.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 20 Comunicarte con las familias'
      },
      {
        selector: 'header',
        texto: 'Envía boletines y reportes directamente a las familias para mantener una comunicación fluida.',
        voz: 'Envía boletines y reportes directamente a las familias para mantener una comunicación fluida.',
        evento: 'click',
        tituloEtapa: 'Seguimiento: 20 Comunicarte con las familias'
      }
    ]
  },

  // Cuenta (21 a 23)
  {
    id: 'guia-21',
    titulo: '21 Perfil y notificaciones',
    steps: [
      {
        selector: 'header',
        texto: 'Localiza en la cabecera superior tu botón de «Perfil Docente».',
        voz: 'Localiza en la cabecera superior tu botón de Perfil Docente.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 21 Perfil y notificaciones'
      },
      {
        selector: '[data-guide="btn-alertas"]',
        texto: 'Revisa las preferencias del sistema y la campana de alertas.',
        voz: 'Revisa las preferencias del sistema y la campana de alertas.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 21 Perfil y notificaciones'
      },
      {
        selector: 'header',
        texto: 'Personaliza tus datos de contacto institucional, avatar y centro educativo.',
        voz: 'Personaliza tus datos de contacto institucional, avatar y centro educativo.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 21 Perfil y notificaciones'
      }
    ]
  },
  {
    id: 'guia-22',
    titulo: '22 Roles y permisos',
    steps: [
      {
        selector: 'header',
        texto: 'Abre la configuración general del centro educativo desde la cabecera superior.',
        voz: 'Abre la configuración general del centro educativo desde la cabecera superior.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 22 Roles y permisos'
      },
      {
        selector: '#nav-comunidad',
        texto: 'Visita la sección «Comunidad» para gestionar la coordinación con otros docentes.',
        voz: 'Visita la sección Comunidad para gestionar la coordinación con otros docentes.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 22 Roles y permisos'
      },
      {
        selector: 'header',
        texto: 'Establece los roles de visualización y edición correspondientes.',
        voz: 'Establece los roles de visualización y edición correspondientes.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 22 Roles y permisos'
      }
    ]
  },
  {
    id: 'guia-23',
    titulo: '23 Guardar y salir',
    steps: [
      {
        selector: 'header',
        texto: 'En la parte superior derecha de CIELO, haz clic en tu perfil docente.',
        voz: 'En la parte superior derecha de CIELO, haz clic en tu perfil docente.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 23 Guardar y salir'
      },
      {
        selector: '[data-guide="btn-alertas"], header',
        texto: 'Pulsa en «Cerrar sesión» para desconectar tu cuenta de forma segura y proteger tus datos.',
        voz: 'Pulsa en Cerrar sesión para desconectar tu cuenta de forma segura y proteger tus datos.',
        evento: 'click',
        tituloEtapa: 'Cuenta: 23 Guardar y salir'
      }
    ]
  }
];
