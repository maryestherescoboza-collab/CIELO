export interface PlanificacionData {
  centro: string;
  codigoCentro: string;
  docente: string;
  asignatura: string;
  grado: string;
  seccion: string;
  fecha: string;
}

export function getPlanificacionDiariaTemplate(_data: PlanificacionData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Planificación de Clase Diaria</title>
<style>
  @page {
    size: letter landscape;
    margin: 10mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    font-size: 11.5px;
    color: #1C2938;
    margin: 0;
    padding: 24px;
    background: #E9EDF2;
  }
  .page {
    background: #fff;
    width: 1100px;
    margin: 0 auto 30px auto;
    padding: 26px 30px 30px 30px;
    border: 1px solid #C6D2DE;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 14px;
  }
  td, th {
    border: 1px solid #C6D2DE;
    padding: 6px 9px;
    vertical-align: top;
  }
  .header-sub {
    text-align: center;
    font-size: 17px;
    font-weight: 600;
    color: #1F3A5C;
    padding: 2px 0 4px 0;
    letter-spacing: 0.01em;
  }
  .header-rule {
    width: 90px;
    height: 3px;
    background: #C69B3C;
    margin: 8px auto 20px auto;
    border: none;
  }
  .section-title {
    background: #1F3A5C;
    color: #fff;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.02em;
    padding: 7px 9px;
  }
  .label {
    background: #EEF3F8;
    color: #1F3A5C;
    font-weight: 600;
    width: 14%;
  }
  .label-sm {
    background: #EEF3F8;
    color: #1F3A5C;
    font-weight: 600;
  }
  ul { margin: 2px 0; padding-left: 18px; }
  .editable {
    outline: 1px dashed transparent;
    min-height: 14px;
  }
  .editable:hover, .editable:focus {
    outline: 1px dashed #3E6DA3;
    background: #F5F8FC;
  }
  .placeholder {
    color: #5B6B7C;
    font-style: italic;
  }
  .placeholder:focus {
    color: #1C2938;
    font-style: normal;
  }
  .comp-block p { margin: 4px 0; }

  .divider {
    border: none;
    border-top: 2px solid #1F3A5C;
    margin: 22px 0 8px 0;
    position: relative;
  }
  .divider::after {
    content: 'Planes de clase';
    position: absolute;
    top: -11px;
    left: 24px;
    background: #fff;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 600;
    color: #1F3A5C;
    letter-spacing: 0.02em;
  }

  .session-block {
    margin-bottom: 20px;
    position: relative;
  }
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    margin-top: 14px;
  }
  .session-title {
    font-weight: 700;
    font-size: 13px;
    color: #1F3A5C;
  }
  .fecha-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .fecha-row .label-sm {
    border: 1px solid #C6D2DE;
    background: #EEF3F8;
    color: #1F3A5C;
    font-weight: 600;
    padding: 5px 10px;
  }
  .fecha-row .editable {
    border: 1px solid #C6D2DE;
    padding: 5px 10px;
    min-width: 150px;
  }
  .add-session-btn {
    background: #1F3A5C;
    color: #fff;
    border: none;
    padding: 9px 18px;
    border-radius: 3px;
    font-size: 12.5px;
    cursor: pointer;
    margin-top: 6px;
    letter-spacing: 0.01em;
  }
  .add-session-btn:hover { background: #163049; }
  .remove-session-btn {
    background: #fff;
    color: #8A3B2E;
    border: 1px solid #C9A79D;
    padding: 4px 11px;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }
  .remove-session-btn:hover { background: #FBF1EF; }

  @media print {
    body { background: #fff; padding: 0; }
    .page { border: none; margin: 0; width: 100%; }
    .add-session-btn, .remove-session-btn { display: none; }
    .placeholder { color: #5B6B7C; }
    .session-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="page">
  <div class="header-sub">Planificación de clase diaria</div>
  <div style="text-align:center; font-size:12px; color:#5B6B7C;">Año escolar 2026-2027</div>
  <hr class="header-rule">

  <!-- DATOS GENERALES -->
  <table>
    <tr>
      <td colspan="6" class="section-title">DATOS GENERALES</td>
    </tr>
    <tr>
      <td class="label">Centro educativo</td>
      <td class="editable" contenteditable="true">\${data.centro}</td>
      <td class="label">Docente</td>
      <td class="editable" contenteditable="true">\${data.docente}</td>
      <td class="label">Fecha</td>
      <td class="editable" contenteditable="true">\${data.fecha}</td>
    </tr>
    <tr>
      <td class="label">Código del centro:</td>
      <td class="editable" contenteditable="true">\${data.codigoCentro}</td>
      <td class="label">Cantidad de estudiantes</td>
      <td class="editable" contenteditable="true" colspan="3"></td>
    </tr>
    <tr>
      <td class="label">Ciclo:</td>
      <td class="editable" contenteditable="true"></td>
      <td class="label">Asignatura</td>
      <td class="editable" contenteditable="true">\${data.asignatura}</td>
      <td class="label">Teléfono:</td>
      <td class="editable" contenteditable="true"></td>
    </tr>
    <tr>
      <td class="label">Grado:</td>
      <td class="editable" contenteditable="true">\${data.grado} \${data.seccion}</td>
      <td class="label"></td>
      <td class="editable" contenteditable="true"></td>
      <td class="label">Tiempo</td>
      <td class="editable" contenteditable="true"></td>
    </tr>
    <tr>
      <td class="label">Secuencia</td>
      <td class="editable" contenteditable="true"></td>
      <td class="label">Semana</td>
      <td class="editable" contenteditable="true" colspan="3"></td>
    </tr>
  </table>

  <!-- CONTENIDOS -->
  <table>
    <tr>
      <td colspan="3" class="section-title">CONTENIDOS</td>
    </tr>
    <tr>
      <td class="label-sm" style="width:33.3%;">Conceptual</td>
      <td class="label-sm" style="width:33.3%;">Procedimental</td>
      <td class="label-sm" style="width:33.3%;">Actitudes y valores</td>
    </tr>
    <tr>
      <td class="editable placeholder" contenteditable="true">Escribe el tema o concepto matemático que se abordará (el "qué").</td>
      <td class="editable placeholder" contenteditable="true">Describe el procedimiento o destreza que el estudiante debe aplicar (el "cómo").</td>
      <td class="editable placeholder" contenteditable="true">Describe la actitud o valor que se busca desarrollar durante la actividad.</td>
    </tr>
  </table>

  <hr class="divider">

  <div id="sessions-container"></div>

  <button class="add-session-btn" onclick="addSession()">+ Agregar otro Plan de clase</button>
</div>

<!-- Plantilla oculta para cada actividad repetible -->
<template id="session-template">
  <div class="session-block">
    <div class="session-header">
      <span class="session-title">Plan de clase</span>
      <button class="remove-session-btn" onclick="removeSession(this)">Eliminar plan de clase</button>
    </div>

    <div class="fecha-row">
      <span class="label-sm">Fecha</span>
      <span class="editable" contenteditable="true"></span>
    </div>

    <table>
      <tr>
        <td colspan="2" class="section-title">ESPECIFICACIÓN CURRICULAR</td>
      </tr>
      <tr>
        <td class="label">Competencias fundamentales/ Específicas</td>
        <td class="editable placeholder comp-block" contenteditable="true">Escribe aquí las competencias fundamentales que se trabajarán en la clase (por ejemplo: Comunicativa, Resolución de Problemas, Pensamiento lógico-creativo-crítico, Desarrollo Personal y Espiritual, Ética y Ciudadana), indicando brevemente cómo se evidencia cada una en la actividad del día.</td>
      </tr>
      <tr>
        <td class="label">Intención pedagógica</td>
        <td class="editable placeholder" contenteditable="true">Redacta el propósito de aprendizaje de la clase: qué habilidad o conocimiento específico deben demostrar los estudiantes al finalizar la actividad.</td>
      </tr>
      <tr>
        <td class="label">Indicador de logro</td>
        <td class="editable placeholder" contenteditable="true">Escribe el indicador de logro alineado al currículo dominicano (código IL y descripción), que precise qué debe ser capaz de hacer el estudiante al finalizar.</td>
      </tr>
    </table>

    <table>
      <tr>
        <td class="label-sm" style="width:9%;">Momento</td>
        <td class="label-sm" style="width:9%;">Tiempo</td>
        <td class="label-sm" style="width:60%;">Actividades de enseñanza</td>
        <td class="label-sm" style="width:22%;">Recursos</td>
      </tr>
      <tr>
        <td class="editable" contenteditable="true"><b>Inicio</b></td>
        <td class="editable placeholder" contenteditable="true">min.</td>
        <td class="editable placeholder" contenteditable="true">Describe las actividades de apertura: saludo, pase de lista, motivación, exploración de saberes previos y/o preguntas orales de retroalimentación de la clase anterior.</td>
        <td rowspan="3" class="editable placeholder" contenteditable="true">Lista los materiales y recursos didácticos que se usarán durante la clase (pizarra, marcadores, computadora, enlaces, guías, etc.).</td>
      </tr>
      <tr>
        <td class="editable" contenteditable="true"><b>Desarrollo</b></td>
        <td class="editable placeholder" contenteditable="true">min.</td>
        <td class="editable placeholder" contenteditable="true">Describe paso a paso el desarrollo de la clase: presentación del tema, explicación de la actividad, instrumento de evaluación, ejercicio a resolver, modalidad de trabajo (individual/parejas/grupos) y forma de validación de resultados.</td>
      </tr>
      <tr>
        <td class="editable" contenteditable="true"><b>Cierre</b></td>
        <td class="editable placeholder" contenteditable="true">min.</td>
        <td class="editable placeholder" contenteditable="true">Describe la dinámica de cierre de la clase (por ejemplo, ticket de salida, síntesis oral, preguntas de reflexión) y qué deben entregar o responder los estudiantes antes de salir.</td>
      </tr>
    </table>

    <table>
      <tr>
        <td class="label" style="width:16%;">Estrategia inclusiva</td>
        <td class="editable placeholder" contenteditable="true">Describe la(s) adecuación(es) o apoyo(s) que se brindará a estudiantes con necesidades específicas (por ejemplo: andamiaje visual, guías paso a paso, tiempo adicional, material adaptado, trabajo en pareja de apoyo).</td>
      </tr>
      <tr>
        <td class="label" style="width:16%;">Evidencias o productos intermedios</td>
        <td class="editable placeholder" contenteditable="true">Indica qué productos o evidencias se recogerán como muestra del trabajo realizado (fotos, cuaderno, hojas de trabajo, portafolio, etc.).</td>
      </tr>
    </table>

    <table>
      <tr>
        <td colspan="4" class="section-title">EVALUACIÓN</td>
      </tr>
      <tr>
        <td class="label-sm" style="width:11%;">Técnica</td>
        <td class="editable placeholder" style="width:39%;" contenteditable="true">Indica la técnica de evaluación a utilizar (por ejemplo: observación, prueba escrita, exposición oral).</td>
        <td class="label-sm" style="width:11%;">Instrumento</td>
        <td class="editable placeholder" style="width:39%;" contenteditable="true">Indica el instrumento de evaluación (por ejemplo: rúbrica, lista de cotejo), el tipo (diagnóstica, formativa o sumativa) y el agente evaluador (autoevaluación, coevaluación, heteroevaluación).</td>
      </tr>
    </table>

    <table>
      <tr>
        <td class="label" style="width:16%;">Metacognición</td>
        <td class="editable placeholder" contenteditable="true">Escribe una o dos preguntas de reflexión final para que el estudiante piense sobre su propio proceso de aprendizaje (por ejemplo: ¿Qué me sorprendió más?, ¿Qué parte me resultó más difícil?).</td>
      </tr>
    </table>
  </div>
</template>

<script>
  function addSession() {
    const tpl = document.getElementById('session-template');
    const clone = document.importNode(tpl.content, true);
    document.getElementById('sessions-container').appendChild(clone);
    renumberSessions();
  }

  function removeSession(btn) {
    const block = btn.closest('.session-block');
    block.remove();
    renumberSessions();
  }

  function renumberSessions() {
    const blocks = document.querySelectorAll('#sessions-container .session-block');
    blocks.forEach((block, i) => {
      block.querySelector('.session-title').textContent = 'Plan de clase' + (blocks.length > 1 ? ' ' + (i + 1) : '');
    });
  }

  addSession();
</script>

</body>
</html>`;
}
