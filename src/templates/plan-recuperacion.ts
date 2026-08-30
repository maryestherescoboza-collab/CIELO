import { getCompetenciaDisplay } from '../types';

export interface ActividadRecuperar {
  nombre: string;
  competencias: string[];
  indicador: string;
  producto?: string;
  puntajeObtenido: number;
}

export interface EstudianteRecuperar {
  nombreCompleto: string;
  curso: string;
  actividades: ActividadRecuperar[];
}

export interface PlanRecuperacionData {
  centro: string;
  codigoCentro: string;
  docente: string;
  asignatura: string;
  grado: string;
  seccion: string;
  fecha: string;
  periodoRecuperacion: 'P1' | 'P2' | 'P3';
  nombrePeriodo: string;
  estudiantes: EstudianteRecuperar[];
}

export const PERIODOS_RECUPERACION = {
  P1: {
    nombre: 'Recuperación pedagógica P1',
    fechaInicio: '2026-11-02',
    fechaFin: '2027-01-29'
  },
  P2: {
    nombre: 'Recuperación pedagógica P2',
    fechaInicio: '2027-02-01',
    fechaFin: '2027-03-30'
  },
  P3: {
    nombre: 'Recuperación pedagógica P3',
    fechaInicio: '2027-04-01',
    fechaFin: '2027-05-30'
  }
};

// MODO DE PRUEBA TEMPORAL: Cambiar a `false` antes de publicar en producción.
// Cuando está en `true`, todos los períodos de recuperación (P1, P2, P3) se habilitan
// inmediatamente para realizar pruebas funcionales de desarrollo.
export const MODO_PRUEBA_RECUPERACION = true;

export function isPeriodoDisponible(fechaInicioStr: string): boolean {
  if (MODO_PRUEBA_RECUPERACION) {
    return true;
  }
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  return todayStr >= fechaInicioStr;
}

export function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const monthNames: Record<string, string> = {
    '01': 'enero',
    '02': 'febrero',
    '03': 'marzo',
    '04': 'abril',
    '05': 'mayo',
    '06': 'junio',
    '07': 'julio',
    '08': 'agosto',
    '09': 'septiembre',
    '10': 'octubre',
    '11': 'noviembre',
    '12': 'diciembre'
  };
  return `${parseInt(day, 10)} de ${monthNames[month] || ''} de ${year}`;
}

function formatCompetencias(competencias: string[]): string {
  return competencias
    .map(c => `▪ ${getCompetenciaDisplay(c) || c}`)
    .join('<br>');
}

export function getPlanRecuperacionTemplate(data: PlanRecuperacionData): string {
  const studentsRowsHtml = data.estudiantes.map((estudiante) => {
    const activitiesRowsHtml = estudiante.actividades.map((actividad) => `
      <tr>
        <td contenteditable="true"
            data-placeholder="Describa la actividad">${actividad.nombre} (Puntaje obtenido: ${actividad.puntajeObtenido})</td>
        <td contenteditable="true"
            data-placeholder="Competencia asociada">${formatCompetencias(actividad.competencias)}</td>
        <td contenteditable="true"
            data-placeholder="Indicador de logro">${actividad.indicador || ''}</td>
        <td contenteditable="true"
            data-placeholder="Producto o evidencia">${actividad.producto || ''}</td>
      </tr>
    `).join('');

    return `
      <!-- ======================================
           ESTUDIANTE: ${estudiante.nombreCompleto}
           ====================================== -->
      <tr class="student-row">
        <td colspan="4">
          <span class="field">
            <span class="field-label">
              Nombre del estudiante:
            </span>
            <span class="value"
                  contenteditable="true"
                  data-placeholder="Nombre completo">${estudiante.nombreCompleto}</span>
          </span>

          <span class="field course">
            <span class="field-label">
              Curso:
            </span>
            <span class="value"
                  contenteditable="true"
                  data-placeholder="Curso">${estudiante.curso}</span>
          </span>
        </td>
      </tr>

      <!-- ENCABEZADOS -->
      <tr>
        <th>
          Actividades a recuperar
        </th>
        <th>
          Competencias
        </th>
        <th>
          Indicador que debe alcanzar
        </th>
        <th>
          Producto
        </th>
      </tr>

      <!-- FILAS DE ACTIVIDADES A RECUPERAR -->
      ${activitiesRowsHtml}

      <!-- METACOGNICIÓN -->
      <tr class="metacognicion-row">
        <td colspan="4">
          <strong>
            Metacognición
          </strong>
          <div class="metacognicion-intro">
            El estudiante debe ser capaz de responder:
          </div>
          <ul class="meta-questions">
            <li contenteditable="true"
                data-placeholder="¿Qué aprendí al realizar esta actividad?">
            </li>
            <li contenteditable="true"
                data-placeholder="¿Qué dificultades encontré y cómo las resolví?">
            </li>
            <li contenteditable="true"
                data-placeholder="¿Qué haría diferente la próxima vez?">
            </li>
          </ul>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Plan de Recuperación Pedagógica Individualizado</title>

<style>
  @page{
    size: letter;
    margin: 0.6in;
  }

  *{
    box-sizing:border-box;
  }

  body{
    margin:0;
    background:#EDEDED;
    color:#1A1A1A;
    font-family:Arial, Helvetica, sans-serif;
    font-size:12px;
    padding:30px 0 60px;
  }

  .page{
    width:8.5in;
    min-height:11in;
    margin:0 auto;
    background:#fff;
    padding:0.6in;
    border:1px solid #ccc;
  }

  h1{
    font-size:16px;
    font-weight:700;
    text-align:center;
    margin:0 0 4px;
    letter-spacing:.02em;
  }

  .subtitle{
    text-align:center;
    font-size:11px;
    color:#555;
    margin:0 0 20px;
  }

  h2{
    font-size:11.5px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.04em;
    margin:0 0 6px;
    padding-bottom:3px;
    border-bottom:2px solid #1A1A1A;
  }

  table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:22px;
    table-layout:fixed;
  }

  th,
  td{
    border:1px solid #1A1A1A;
    padding:6px 7px;
    vertical-align:top;
    text-align:left;
    word-wrap:break-word;
  }

  th{
    font-size:10px;
    font-weight:700;
    text-transform:uppercase;
    background:#F2F2F2;
  }

  /* ==============================
     DATOS GENERALES
     ============================= */

  .datos-table td.label{
    width:22%;
    font-weight:700;
    background:#F7F7F7;
    font-size:10.5px;
  }

  .datos-table td.value{
    min-height:16px;
  }

  .datos-table td[contenteditable="true"]:empty::before{
    content:attr(data-placeholder);
    color:#999;
    font-style:italic;
    font-size:10.5px;
  }

  /* ==============================
     PLAN DE RECUPERACIÓN
     ============================== */

  .plan-table th{
    font-size:9px;
  }

  .plan-table td{
    font-size:10.5px;
  }

  .plan-table td[contenteditable="true"]:empty::before{
    content:attr(data-placeholder);
    color:#999;
    font-style:italic;
  }

  /* ==============================
     DATOS DEL ESTUDIANTE
     ============================== */

  .student-row td{
    background:#F2F2F2;
    padding:7px 8px;
  }

  .student-row .field{
    display:inline-block;
    margin-right:28px;
    font-size:10.5px;
  }

  .student-row .field-label{
    font-weight:700;
    text-transform:uppercase;
    font-size:9.5px;
    margin-right:6px;
  }

  .student-row .field .value{
    display:inline-block;
    min-width:180px;
    border-bottom:1px solid #999;
    padding:0 2px;
  }

  .student-row .field.course .value{
    min-width:100px;
  }

  /* ==============================
     METACOGNICIÓN
     ============================== */

  .metacognicion-row td{
    background:#F7F7F7;
    padding:9px 10px 8px;
  }

  .metacognicion-row strong{
    font-size:10.5px;
  }

  .metacognicion-intro{
    margin-top:5px;
    font-size:10.5px;
  }

  .meta-questions{
    margin:5px 0 0;
    padding-left:18px;
    font-size:10.5px;
  }

  .meta-questions li{
    margin-bottom:4px;
  }

  .meta-questions li[contenteditable="true"]:empty::before{
    content:attr(data-placeholder);
    color:#999;
    font-style:italic;
  }

  /* ==============================
     EDITABLE
     ============================== */

  [contenteditable="true"]{
    outline:none;
  }

  [contenteditable="true"]:focus{
    background:#FFFDE7;
  }

  /* ==============================
     IMPRESIÓN
     ============================== */

  @media print{
    body{
      background:#fff;
      padding:0;
    }

    .page{
      border:none;
      width:auto;
      min-height:auto;
      padding:0;
    }
  }
</style>
</head>

<body>

<div class="page" data-plantilla="Plan de recuperación" data-periodo="${data.periodoRecuperacion}">

  <h1>Plan de Recuperación Pedagógica Individualizado</h1>

  <p class="subtitle">
    Documento de planificación para el seguimiento y recuperación académica del estudiante
  </p>


  <!-- ==========================================
       I. DATOS GENERALES
       ========================================== -->

  <h2>I. Datos generales</h2>

  <table class="datos-table">

    <tr>
      <td class="label">Centro educativo</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="Nombre del centro educativo">${data.centro}</td>

      <td class="label">Docente</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="Nombre del docente">${data.docente}</td>
    </tr>

    <tr>
      <td class="label">Rango de fecha de aplicación</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="Del __/__/__ al __/__/__">
      </td>

      <td class="label">Cantidad de estudiantes</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="N.º de estudiantes">${data.estudiantes.length}</td>
    </tr>

    <tr>
      <td class="label">Asignatura</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="Nombre de la asignatura">${data.asignatura}</td>

      <td class="label">Grados</td>

      <td class="value"
          contenteditable="true"
          data-placeholder="Grado(s) correspondiente(s)">${data.grado} ${data.seccion}</td>
    </tr>

    <tr>
      <td class="label">Objetivo</td>

      <td class="value"
          colspan="3"
          contenteditable="true"
          data-placeholder="Objetivo general del plan de recuperación">
      </td>
    </tr>

    <tr>
      <td class="label">Período a recuperar</td>

      <td class="value"
          colspan="3"
          contenteditable="true"
          data-placeholder="Ej. I trimestre / Unidad 2">${data.nombrePeriodo}</td>
    </tr>

  </table>


  <!-- ==========================================
       II. PLAN DE RECUPERACIÓN
       ========================================== -->

  <h2>II. Plan de recuperación</h2>

  <table class="plan-table">

    <tbody>
      ${studentsRowsHtml}
    </tbody>

  </table>

</div>

</body>
</html>`;
}
