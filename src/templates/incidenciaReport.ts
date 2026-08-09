// Plantilla base del informe de incidencias (ROL: CENTRO).
// Este documento HTML se genera para descargar el informe correspondiente.
// Nota: la plantilla definitiva será sustituida por la que proporcione el equipo (formato MINERD/institución).
import type { Incidencia, Estudiante, UserProfile, Curso } from '../types';
import { getAsignaturaNombre } from '../constants/asignaturas';

const esc = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const GRAVEDAD_LABELS: Record<string, string> = {
    leve: 'Primera Vez',
    moderada: 'Recurrente',
    grave: 'Persistente',
};

export interface IncidenciaReportData {
    incidencia: Incidencia;
    estudiante?: Estudiante;
    docente?: UserProfile;
    curso?: Curso;
    centroNombre?: string;
    centroCodigo?: string;
}

export function buildIncidenciaReport(data: IncidenciaReportData): string {
    const { incidencia, estudiante, docente, curso, centroNombre, centroCodigo } = data;

    const nombreEstudiante = estudiante
        ? `${estudiante.nombre} ${estudiante.apellido}`
        : 'Estudiante no registrado';
    const expediente = estudiante ? `Exp. #${String(estudiante.id).padStart(4, '0')}` : '';
    const nombreDocente = docente?.nombreDocente || 'Docente del aula';
    const cursoLabel = curso
        ? `${curso.grado} ${curso.seccion} · ${getAsignaturaNombre(curso.asignatura)}`
        : 'Curso no identificado';
    const fechaFormateada = incidencia.fecha
        ? new Date(`${incidencia.fecha}T00:00:00`).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric'
        })
        : 'Sin fecha';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Informe de Incidencia — ${esc(nombreEstudiante)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background: #FDFBF7; color: #2E3330; padding: 32px; }
  .page { max-width: 720px; margin: 0 auto; background: #FFFFFF; border: 1px solid rgba(46,51,48,0.08); border-radius: 16px; padding: 36px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ADC762; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 13px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #ADC762; }
  .brand small { display: block; color: #5F665E; font-weight: 700; letter-spacing: 0.08em; }
  .doc-number { font-size: 11px; font-weight: 700; color: #5F665E; text-transform: uppercase; letter-spacing: 0.08em; text-align: right; }
  h1 { font-size: 20px; font-weight: 800; color: #2E3330; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #5F665E; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin-bottom: 24px; }
  .field label { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #7D847A; margin-bottom: 3px; }
  .field p { font-size: 13px; font-weight: 600; color: #2E3330; }
  .section { margin-bottom: 18px; }
  .section h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #ADC762; border-left: 4px solid #BFC9A6; padding-left: 10px; margin-bottom: 8px; }
  .section p { font-size: 13px; line-height: 1.6; color: #2E3330; white-space: pre-wrap; }
  .pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .pill-conducta { background: rgba(232,140,107,0.12); color: #A34B22; }
  .pill-academico { background: rgba(122,141,105,0.15); color: #4F5F44; }
  .pill-salud { background: rgba(242,214,162,0.25); color: #8A651F; }
  .pill-otro { background: rgba(110,140,160,0.12); color: #3E5A6B; }
  .pill-leve { background: rgba(191,201,166,0.3); color: #4F5F44; }
  .pill-moderada { background: rgba(245,188,93,0.3); color: #8A651F; }
  .pill-grave { background: rgba(235,136,71,0.25); color: #A34B22; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .action-chip { padding: 5px 12px; border-radius: 999px; background: #FAF6F0; border: 1px solid rgba(46,51,48,0.08); font-size: 11px; font-weight: 600; color: #2E3330; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid rgba(46,51,48,0.08); font-size: 10px; color: #9AA09A; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${esc(centroNombre || 'Centro Educativo')}
        ${centroCodigo ? `<small>${esc(centroCodigo)}</small>` : ''}
      </div>
      <div class="doc-number">Informe de Incidencia<br />Registro Anecdótico</div>
    </div>

    <h1>Incidencia Registrada</h1>
    <p class="subtitle">Documento generado desde el panel de dirección · CIELO</p>

    <div class="grid">
      <div class="field"><label>Estudiante</label><p>${esc(nombreEstudiante)}</p></div>
      <div class="field"><label>Expediente</label><p>${esc(expediente)}</p></div>
      <div class="field"><label>Docente</label><p>${esc(nombreDocente)}</p></div>
      <div class="field"><label>Curso</label><p>${esc(cursoLabel)}</p></div>
      <div class="field"><label>Categoría</label><p><span class="pill pill-${incidencia.categoria.toLowerCase()}">${esc(incidencia.categoria)}</span></p></div>
      <div class="field"><label>Gravedad</label><p><span class="pill pill-${incidencia.gravedad}">${esc(GRAVEDAD_LABELS[incidencia.gravedad] || incidencia.gravedad)}</span></p></div>
      <div class="field"><label>Fecha</label><p>${esc(fechaFormateada)}</p></div>
    </div>

    <div class="section">
      <h2>Descripción de los Hechos</h2>
      <p>${esc(incidencia.descripcion)}</p>
    </div>

    <div class="section">
      <h2>Acciones Pedagógicas</h2>
      <div class="actions">
        ${incidencia.accionesTomadas && incidencia.accionesTomadas.length
            ? incidencia.accionesTomadas.map(a => `<span class="action-chip">${esc(a)}</span>`).join('')
            : '<span class="action-chip">Sin acciones registradas</span>'}
      </div>
    </div>

    <div class="section">
      <h2>Acuerdos y Compromisos</h2>
      <p>${esc(incidencia.acuerdos || 'Sin acuerdos registrados.')}</p>
    </div>

    <div class="footer">
      <span>CIELO · Evaluación por Competencias</span>
      <span>${esc(fechaFormateada)}</span>
    </div>
  </div>
</body>
</html>`;
}
