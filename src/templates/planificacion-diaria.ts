export interface PlanificacionData {
  centro: string;
  codigoCentro: string;
  docente: string;
  asignatura: string;
  grado: string;
  seccion: string;
  fecha: string;
}

export function getPlanificacionDiariaTemplate(data: PlanificacionData): string {
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
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #000;
    margin: 0;
    padding: 20px;
    background: #e9e9e9;
  }
  .page {
    background: #fff;
    width: 1100px;
    margin: 0 auto 30px auto;
    padding: 14px;
    border: 1px solid #999;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 4px;
  }
  td, th {
    border: 1px solid #000;
    padding: 4px 6px;
    vertical-align: top;
  }
  .header-sub {
    text-align: center;
    font-size: 13px;
    font-weight: bold;
    padding: 4px 0 10px 0;
  }
  .section-title {
    background: #bcd6ee;
    font-weight: bold;
    text-align: center;
  }
  .label {
    background: #e8f1fb;
    font-weight: bold;
    width: 14%;
  }
  .label-sm {
    background: #e8f1fb;
    font-weight: bold;
  }
  ul { margin: 2px 0; padding-left: 18px; }
  .editable {
    outline: 1px dashed transparent;
    min-height: 14px;
  }
  .editable:hover, .editable:focus {
    outline: 1px dashed #3b82f6;
    background: #fbfdff;
  }
  .placeholder {
    color: #555;
    font-style: italic;
  }
  .placeholder:focus {
    color: #000;
    font-style: normal;
  }
  .comp-block p { margin: 4px 0; }
  .toolbar {
    max-width: 1100px;
    margin: 0 auto 12px auto;
    text-align: right;
  }
  .toolbar button {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-left: 6px;
  }
  .toolbar button:hover { background: #1d4ed8; }

  .divider {
    border: none;
    border-top: 2px solid #444;
    margin: 16px 0 10px 0;
  }
  .session-block {
    margin-bottom: 22px;
    position: relative;
  }
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .session-title {
    font-weight: bold;
    font-size: 12px;
  }
  .fecha-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }
  .fecha-row .label-sm {
    border: 1px solid #000;
    background: #e8f1fb;
    font-weight: bold;
    padding: 4px 8px;
  }
  .fecha-row .editable {
    border: 1px solid #000;
    padding: 4px 8px;
    min-width: 140px;
  }
  .add-session-btn {
    background: #16a34a;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-top: 6px;
  }
  .add-session-btn:hover { background: #15803d; }
  .remove-session-btn {
    background: #dc2626;
    color: #fff;
    border: none;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
  }
  .remove-session-btn:hover { background: #b91c1c; }

  @media print {
    body { background: #fff; padding: 0; }
    .page { border: none; margin: 0; width: 100%; }
    .toolbar, .add-session-btn, .remove-session-btn { display: none; }
    .placeholder { color: #555; }
    .session-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="page">
  <div class="header-sub">Planificación de clase diaria &nbsp;&nbsp;&nbsp; Año escolar 2026-2027</div>

  <!-- DATOS GENERALES -->
  <table>
    <tr>
      <td colspan="6" class="section-title">DATOS GENERALES</td>
    </tr>
    <tr>
      <td class="label">Centro educativo</td>
      <td class="editable" contenteditable="true">${data.centro}</td>
      <td class="label">Docente</td>
      <td class="editable" contenteditable="true">${data.docente}</td>
      <td class="label">Fecha</td>
      <td class="editable" contenteditable="true">${data.fecha}</td>
    </tr>
    <tr>
      <td class="label">Código del centro:</td>
      <td class="editable" contenteditable="true">${data.codigoCentro}</td>
      <td class="label">Cantidad de estudiantes</td>
      <td class="editable" contenteditable="true" colspan="3"></td>
    </tr>
    <tr>
      <td class="label">Ciclo:</td>
      <td class="editable" contenteditable="true"></td>
      <td class="label">Asignatura</td>
      <td class="editable" contenteditable="true">${data.asignatura}</td>
      <td class="label">Teléfono:</td>
      <td class="editable" contenteditable="true"></td>
    </tr>
    <tr>
      <td class="label">Grado:</td>
      <td class="editable" contenteditable="true">${data.grado} ${data.seccion}</td>
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

  <!-- ESPECIFICACIÓN CURRICULAR -->
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
      <td class="editable placeholder" contenteditable="true">Redacta el propósito de aprendizaje de la clase: qué habilidad o conocimiento específico deben demostrar los estudiantes al finalizar la sesión.</td>
    </tr>
    <tr>
      <td class="label">Indicador de logro</td>
      <td class="editable placeholder" contenteditable="true">Escribe el indicador de logro alineado al currículo dominicano (código IL y descripción), que precise qué debe ser capaz de hacer el estudiante al finalizar.</td>
    </tr>
  </table>

  <hr class="divider">

  <div id="sessions-container"></div>

  <button class="add-session-btn" onclick="addSession()">+ Agregar otra sesión</button>
</div>

<!-- Plantilla oculta para cada sesión repetible -->
<template id="session-template">
  <div class="session-block">
    <div class="session-header">
      <span class="session-title">Desarrollo de la clase</span>
      <button class="remove-session-btn" onclick="removeSession(this)">Eliminar sesión</button>
    </div>

    <div class="fecha-row">
      <span class="label-sm">Fecha</span>
      <span class="editable" contenteditable="true"></span>
    </div>

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
      <tr>
        <td class="label">Estrategia inclusiva</td>
        <td colspan="3" class="editable placeholder" contenteditable="true">Describe la(s) adecuación(es) o apoyo(s) que se brindará a estudiantes con necesidades específicas (por ejemplo: andamiaje visual, guías paso a paso, tiempo adicional, material adaptado, trabajo en pareja de apoyo).</td>
      </tr>
      <tr>
        <td class="label">Evidencias o productos intermedios</td>
        <td colspan="3" class="editable placeholder" contenteditable="true">Indica qué productos o evidencias se recogerán como muestra del trabajo realizado (fotos, cuaderno, hojas de trabajo, portafolio, etc.).</td>
      </tr>
      <tr>
        <td colspan="4" class="section-title">Evaluación</td>
      </tr>
      <tr>
        <td class="label-sm">Técnica</td>
        <td class="editable placeholder" contenteditable="true">Indica la técnica de evaluación a utilizar (por ejemplo: observación, prueba escrita, exposición oral).</td>
        <td class="label-sm" style="width:9%;">Instrumento</td>
        <td class="editable placeholder" contenteditable="true">Indica el instrumento de evaluación (por ejemplo: rúbrica, lista de cotejo), el tipo (diagnóstica, formativa o sumativa) y el agente evaluador (autoevaluación, coevaluación, heteroevaluación).</td>
      </tr>
      <tr>
        <td class="label">Metacognición</td>
        <td colspan="3" class="editable placeholder" contenteditable="true">Escribe una o dos preguntas de reflexión final para que el estudiante piense sobre su propio proceso de aprendizaje (por ejemplo: ¿Qué me sorprendió más?, ¿Qué parte me resultó más difícil?).</td>
      </tr>
    </table>
  </div>
</template>

<script>
  let sessionCounter = 0;

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
      block.querySelector('.session-title').textContent = 'Desarrollo de la clase' + (blocks.length > 1 ? ' — Sesión ' + (i + 1) : '');
    });
  }

  // Agregar la primera sesión al cargar la página
  addSession();
</script>

</body>
</html>`;
}
