export interface GuideStep {
  selector: string;
  texto: string;
  voz?: string;
  etapa?: number;
  tituloEtapa?: string;
  evento: 'click' | 'change' | 'dblclick';
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
        selector: '#nav-cursos',
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
        selector: '[data-guide="modal-curso-grado"]',
        texto: 'Selecciona el grado escolar que vas a impartir.',
        voz: 'Selecciona el grado escolar que vas a impartir.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'change'
      },
      {
        selector: '[data-guide="modal-curso-seccion"]',
        texto: 'Escribe la sección correspondiente (por ejemplo: A, B o C).',
        voz: 'Escribe la sección correspondiente.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'change'
      },
      {
        selector: '[data-guide="modal-curso-asignatura"]',
        texto: 'Selecciona la asignatura oficial o agrega una optativa.',
        voz: 'Selecciona la asignatura oficial o agrega una optativa.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'change'
      },
      {
        selector: '[data-guide="modal-curso-confirmar"]',
        texto: 'Pulsa en «Confirmar Curso» para guardarlo en CIELO.',
        voz: 'Pulsa en Confirmar Curso para guardarlo. ¡Excelente! Ya tienes tu primer curso.',
        etapa: 1,
        tituloEtapa: 'Etapa 1: Crear un curso',
        evento: 'click'
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
        voz: 'Escribe el nombre del estudiante con el formato Apellidos, Nombres. ¡Muy bien! Ya tienes estudiantes para trabajar.',
        etapa: 2,
        tituloEtapa: 'Etapa 2: Agregar estudiantes',
        evento: 'change'
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
        selector: '[data-guide="modal-actividad-indicador"]',
        texto: 'Selecciona el indicador de logro que vas a evaluar. El indicador te dice qué aprendizaje observarás en el estudiante.',
        voz: 'Selecciona el indicador de logro que vas a evaluar. El indicador te dice qué aprendizaje observarás en el estudiante.',
        etapa: 3,
        tituloEtapa: 'Etapa 3: Crear una actividad',
        evento: 'click'
      },
      {
        selector: '[data-guide="modal-actividad-producto"]',
        texto: 'El producto es la evidencia que permitirá comprobar ese aprendizaje (ej: Cuaderno, Proyecto, Debate).',
        voz: 'El producto es la evidencia que permitirá comprobar ese aprendizaje. Escribe el producto o evidencia.',
        etapa: 3,
        tituloEtapa: 'Etapa 3: Crear una actividad',
        evento: 'change'
      },
      {
        selector: '[data-guide="modal-actividad-guardar"]',
        texto: 'Pulsa en «Agregar actividad» para guardarla en tu curso.',
        voz: 'Pulsa en Agregar actividad para guardarla. ¡Perfecto! Tu actividad está lista.',
        etapa: 3,
        tituloEtapa: 'Etapa 3: Crear una actividad',
        evento: 'click'
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
        evento: 'click'
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
        evento: 'change'
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
        evento: 'click'
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
        texto: 'Haz clic en «Cursos» para acceder a tus cursos.',
        voz: 'Haz clic en Cursos para acceder a tus cursos.',
        evento: 'click'
      },
      {
        selector: '#btn-nuevo-curso, [data-guide="btn-nuevo-curso"]',
        texto: 'Haz clic en «Nuevo curso» para crear tu primer curso.',
        voz: 'Haz clic en Nuevo curso para crear tu primer curso.',
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
        selector: '[data-guide="btn-agregar-estudiante"]',
        texto: 'Haz clic en «+» para agregar un estudiante.',
        voz: 'Haz clic en más para agregar un estudiante.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-estudiante"]',
        texto: 'Haz clic en la celda del estudiante y escribe su nombre con el formato: Nombre, Apellido.',
        voz: 'Haz clic en la celda del estudiante y escribe su nombre.',
        evento: 'change'
      },
      {
        selector: '[data-guide="btn-agregar-actividad"]',
        texto: 'Haz clic en «Agregar actividad» para crear una nueva actividad.',
        voz: 'Haz clic en Agregar actividad para crear una nueva actividad.',
        evento: 'click'
      },
      {
        selector: '[data-guide="celda-actividad"]',
        texto: 'Haz clic sobre «Activ. #» para cambiar el nombre de la actividad.',
        voz: 'Haz clic sobre la actividad para cambiar su nombre.',
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
        texto: 'Haz clic en «Inicio» para ir al panel principal.',
        voz: 'Haz clic en Inicio para ir al panel principal.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-organizar-calendario"]',
        texto: 'Haz clic en «Organizar calendario» para abrir el calendario escolar.',
        voz: 'Haz clic en Organizar calendario para abrir el calendario escolar.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-pase-de-lista"]',
        texto: 'Haz clic en «Pase de lista» para iniciar el registro de asistencia del día.',
        voz: 'Haz clic en Pase de lista para iniciar el registro de asistencia del día.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-curso-asistencia"]',
        texto: 'Haz clic en la asignatura o curso al que deseas pasar lista.',
        voz: 'Haz clic en la asignatura o curso al que deseas pasar lista.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-continuar-asistencia"]',
        texto: 'Haz clic en «Continuar» para ver la lista de tus estudiantes.',
        voz: 'Haz clic en Continuar para ver la lista de tus estudiantes.',
        evento: 'click'
      },
      {
        selector: '[data-guide="btn-estado-estudiante"]',
        texto: 'Haz un clic sobre el círculo del estudiante para cambiar su estado a Ausente.',
        voz: 'Haz un clic sobre el círculo del estudiante para cambiar su estado a Ausente.',
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
  }
];
