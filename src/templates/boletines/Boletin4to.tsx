import React from 'react';
import type { BoletinTemplateProps } from './types';
import { ASIGNATURAS_CATALOGO } from '../../constants/asignaturas';
import { obtenerCentroDelCurso } from '../../utils/aislamiento';
import { getBoletinHeaderImage } from '../../utils/colorimetriaBoletines';

export default function Boletin4to({ curso, estudiantes, docenteNombre, studentGrades, state }: BoletinTemplateProps) {
    // Datos institucionales reales: BOLETÍN → CURSO → curso.centroId → CENTRO.
    // Nunca un centro global ni el del usuario que imprime; si el centro no
    // puede demostrarse, el campo queda en blanco (como el formulario físico).
    const centro = obtenerCentroDelCurso(state.centros, curso);
    const headerImg = getBoletinHeaderImage(curso?.grado);
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @page { size: 11in 8.5in; margin: 0.3in; }
                * { box-sizing: border-box; }
                body {
                  font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
                  color: #111;
                  margin: 0;
                  padding: 0;
                  background: #f2f2f2;
                }
                .page {
                  background: #fff;
                  margin: 8px auto;
                  padding: 7mm;
                  box-shadow: 0 0 6px rgba(0,0,0,0.25);
                }
                .page.portrait { width: 11in; min-height: 8.5in; position:relative; }
                .page.landscape { width: 11in; min-height: 8.5in; position:relative; }
                .fold-guide{
                  position:absolute; top:0; left:50%; width:0;
                  height:100%; border-left:1px dashed #bbb;
                  pointer-events:none;
                }
                @media print{ 
                  *, *::before, *::after {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .fold-guide{ display:none; } 
                  body { background: #fff; }
                  .page { box-shadow: none; margin: 0; page-break-after: always; }
                  .no-print { display: none !important; }
                }
                h1,h2,h3,p { margin:0; padding:0; }

                /* Variables dinámicas inyectadas desde el wrapper */

                .header-bar{
                  background: var(--boletin-medium);
                  color: var(--boletin-text);
                  font-weight:bold;
                  font-size:10.5px;
                  text-align:center;
                  padding:3px 0;
                  letter-spacing:0.3px;
                }

                /* ============ PAGE 1 ============ */
                .p1-container{ display:flex; gap:14px; }
                .p1-left, .p1-right{ flex:1; }
                .periodos-title{ font-weight:bold; font-size:10.5px; margin:5px 0 4px 0; }
                .periodo-line{ font-size:10.5px; margin-bottom:9px; border-bottom:1px solid #000; padding-bottom:1px; width:95%; }
                .obs-table{ width:100%; border-collapse:collapse; margin-top:3px; }
                .obs-table td{ border-bottom:1px solid #999; height:19px; }

                .p1-right{ text-align:center; }
                .logo-box{ margin:4px auto 2px auto; }
                .logo-box svg{ display:block; margin:0 auto; }
                .country-name{ font-size:8px; font-weight:bold; color:var(--boletin-main); letter-spacing:1px; margin-top:1px; }
                .edu-word{ color:#cc0000; font-weight:bold; font-size:10px; margin-top:5px; }
                .minerd-logo{ display:block; margin:6px auto; max-width:90px; height:auto; }
                .subtitle-small{ font-size:8px; line-height:1.2; }
                .boletin-title{ color:var(--boletin-main); font-weight:bold; font-size:17px; margin-top:9px; }
                .grado-logo{ display:block; margin:8px auto 0 auto; max-width:170px; height:auto; }
                .form-fields{ text-align:left; font-size:10.5px; margin-top:12px; padding:0 8px; }
                .form-fields .field{ margin-bottom:9px; display:flex; align-items:flex-end; white-space:nowrap; }
                .field .label{ flex-shrink:0; }
                .field .fill-line{ flex:1; border-bottom:1px solid #000; margin-left:4px; height:11px; font-weight: bold; padding-left: 6px; }
                .field.split{ display:flex; gap:16px; }
                .field.split .sub{ display:flex; align-items:flex-end; flex:1; white-space:nowrap; }
                .small-note{ font-size:7.5px; font-weight:normal; }

                /* ============ PAGE 2 ============ */
                .top-info{ font-size:10.5px; display:flex; justify-content:space-between; margin-bottom:5px; }
                .top-info .fill-line{ display:inline-block; border-bottom:1px solid #000; min-width:180px; margin-left:6px; font-weight: bold; }

                table.grades{
                  width:100%;
                  border-collapse:collapse;
                  table-layout:fixed;
                  margin-top:4px;
                  font-size:7px;
                }
                table.grades th, table.grades td{
                  border:0.5px solid var(--boletin-border);
                  text-align:center;
                  padding:1px;
                  height:19px;
                }
                table.grades th{
                  background:var(--boletin-light);
                  color:var(--boletin-text);
                  font-weight:bold;
                  font-size:7px;
                  line-height:1.05;
                }
                table.grades td.rowlabel{
                  text-align:left;
                  font-size:7.6px;
                  padding-left:3px;
                  font-weight:normal;
                  white-space:nowrap;
                }
                table.grades .vert{
                  writing-mode:vertical-rl;
                  transform:rotate(180deg);
                  font-size:6.6px;
                }
                table.grades .areas-label{
                  writing-mode:vertical-rl;
                  transform:rotate(180deg);
                  font-weight:bold;
                  font-size:7.5px;
                  background:var(--boletin-light);
                }
                table.grades td.shaded{ background:var(--boletin-light); }
                table.grades th.compfund{
                  font-size:7px;
                  background:var(--boletin-light);
                }

                .bottom-section{ display:flex; gap:10px; margin-top:8px; align-items:flex-start; }
                .attendance, .legend, .final-status{ flex:1; }

                table.attendance-table{
                  width:100%; border-collapse:collapse; font-size:8.5px; margin-top:3px;
                }
                table.attendance-table th, table.attendance-table td{
                  border:0.5px solid var(--boletin-border); text-align:center; padding:2px;
                }
                table.attendance-table th{ background:var(--boletin-light); }

                table.legend-table{
                  width:100%; border-collapse:collapse; font-size:7.6px; margin-top:3px;
                }
                table.legend-table th{
                  background:var(--boletin-medium); color:var(--boletin-text); padding:3px; font-size:9px;
                }
                table.legend-table td{
                  border:0.5px solid var(--boletin-border); padding:1.5px 3px;
                }
                table.legend-table td.code{ font-weight:bold; width:48px; white-space:nowrap; }

                .situacion-row{
                  display:flex; justify-content:space-between; align-items:center;
                  font-weight:bold; font-size:9px; padding:4px 2px; flex-wrap:wrap; gap:6px;
                }
                .situacion-row .opt{ display:flex; align-items:center; font-weight:normal; gap:4px; }
                .circle{
                  display:inline-block; width:10px; height:10px; border:1px solid #000;
                  border-radius:50%; vertical-align:middle;
                }
                .circle.checked{
                  background: #000;
                }

                .condicion-lines{ margin-top:6px; }
                .condicion-lines .line{
                  border-bottom:1px solid #000; height:16px; margin-bottom:4px;
                }

                .signatures{
                  display:flex; justify-content:space-around; margin-top:22px; font-size:9.5px; font-style:italic;
                }
                .signatures .sig{ text-align:center; width:40%; }
                .signatures .sig .line{ border-top:1px solid #000; margin-bottom:3px; width:100%; }
            ` }} />

            {estudiantes.map((est, idx) => {
                const grades = studentGrades[est.id] || {};

                // Check if student passed all areas (all finalGrades >= 70)
                const hasAllGrades = ASIGNATURAS_CATALOGO.every(asig => grades[asig.id]?.finalGrade !== null);
                const allPassed = hasAllGrades && ASIGNATURAS_CATALOGO.every(asig => {
                    const fg = grades[asig.id]?.finalGrade;
                    return fg !== undefined && fg !== null && fg >= 70;
                });

                return (
                    <React.Fragment key={est.id}>
                        {/* ===================== PÁGINA 1 ===================== */}
                        <div className="page portrait">
                          <div className="fold-guide"></div>
                          <div className="p1-container">
                            <div className="p1-left">
                              <div className="header-bar">FIRMA DEL PADRE, MADRE O TUTOR</div>
                              <div className="periodos-title">Períodos de Reportes de Calificaciones</div>
                              <div className="periodo-line">Ago -Sept-Oct&nbsp;</div>
                              <div className="periodo-line">Nov - Dic -Ene&nbsp;</div>
                              <div className="periodo-line">Feb - Mar&nbsp;</div>
                              <div className="periodo-line">Abr - May - Jun&nbsp;</div>
                              <div className="header-bar" style={{ marginTop: '10px' }}>Observaciones:</div>
                              <table className="obs-table">
                                <tbody>
                                    <tr><td></td></tr><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr>
                                    <tr><td></td></tr><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr>
                                    <tr><td></td></tr><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr>
                                    <tr><td></td></tr><tr><td></td></tr><tr><td></td></tr><tr><td></td></tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="p1-right">
                              <img src="https://upload.wikimedia.org/wikipedia/commons/f/f8/Logo_del_Ministerio_de_Educaci%C3%B3n_%28Rep%C3%BAblica_Dominicana%29.svg" alt="Logo MINERD" className="minerd-logo" />
                              <div className="subtitle-small">
                                Viceministro de Servicios Técnicos y Pedagógicos<br />
                                Dirección General de Educación Secundaria
                              </div>
                              <div className="boletin-title">BOLETÍN DE CALIFICACIONES</div>
                              
                              {headerImg ? (
                                <img 
                                  src={headerImg} 
                                  alt={`${curso?.grado || 'Grado'} Header`} 
                                  className="grado-logo" 
                                  style={{ display: 'block', margin: '8px auto 0 auto', maxWidth: '170px', height: 'auto', imageRendering: '-webkit-optimize-contrast' }} 
                                />
                              ) : (
                                <div style={{ margin: '14px 0', border: '1.5px solid var(--boletin-main)', padding: '6px', borderRadius: '4px', background: 'var(--boletin-light)' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 'black', color: 'var(--boletin-main)', letterSpacing: '1.5px' }}>NIVEL EDUCACIÓN SECUNDARIA</div>
                                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--boletin-main)', marginTop: '2px' }}>{curso?.grado || 'Grado no especificado'} - Segundo Ciclo</div>
                                </div>
                              )}

                              <div className="form-fields">
                                <div className="field" style={{ justifyContent: 'center', gap: 0 }}>
                                  <span className="label">Año escolar: 20</span>
                                  <span className="fill-line" style={{ flex: '0 0 auto', width: '22px' }}>25</span>
                                  <span className="label">- 20</span>
                                  <span className="fill-line" style={{ flex: '0 0 auto', width: '22px' }}>26</span>
                                </div>
                                <div className="field split">
                                  <div className="sub"><span className="label">Sección:</span><span className="fill-line">{curso.seccion}</span></div>
                                  <div className="sub"><span className="label">Número de orden:</span><span className="fill-line">{est.numeroLista || idx + 1}</span></div>
                                </div>
                                <div className="field"><span className="label">Nombre(s):</span><span className="fill-line">{est.nombre}</span></div>
                                <div className="field"><span className="label">Apellido(s):</span><span className="fill-line">{est.apellido}</span></div>
                                <div className="field"><span className="label">ID estudiante <span className="small-note">(Número de identificación SIGERD)</span>:</span><span className="fill-line"></span></div>
                                <div className="field"><span className="label">Docente:</span><span className="fill-line">{docenteNombre}</span></div>
                                <div className="field"><span className="label">Centro educativo:</span><span className="fill-line">{centro?.nombre || state.instituto || ''}</span></div>
                                <div className="field"><span className="label">Código del centro:</span><span className="fill-line">{centro?.codigoCentro || ''}</span></div>
                                <div className="field"><span className="label">Tanda:</span><span className="fill-line">{centro?.tanda || ''}</span></div>
                                <div className="field"><span className="label">Teléfono del centro:</span><span className="fill-line">{centro?.telefono || ''}</span></div>
                                <div className="field split">
                                  <div className="sub"><span className="label">Distrito:</span><span className="fill-line">{centro?.distritoEducativo || ''}</span></div>
                                  <div className="sub"><span className="label">Regional:</span><span className="fill-line">{centro?.regionalEducacion || ''}</span></div>
                                </div>
                                <div className="field split">
                                  <div className="sub"><span className="label">Provincia:</span><span className="fill-line">{centro?.provincia || ''}</span></div>
                                  <div className="sub"><span className="label">Municipio:</span><span className="fill-line">{centro?.municipio || ''}</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ===================== PÁGINA 2 (APAISADA) ===================== */}
                        <div className="page landscape">
                          <div className="fold-guide"></div>
                          <div className="top-info">
                            <span>Nombre(s) y apellido (s): <span className="fill-line" style={{ minWidth: '320px', display: 'inline-block', borderBottom: '1px solid #000', paddingLeft: '8px' }}>{est.nombre} {est.apellido}</span></span>
                            <span>Grado: <span className="fill-line" style={{ minWidth: '120px', display: 'inline-block', borderBottom: '1px solid #000', paddingLeft: '8px' }}>{curso.grado}</span></span>
                            <span>Sección: <span className="fill-line" style={{ minWidth: '100px', display: 'inline-block', borderBottom: '1px solid #000', paddingLeft: '8px' }}>{curso.seccion}</span></span>
                          </div>

                          <div className="header-bar">CALIFICACIONES DE RENDIMIENTO</div>

                          <table className="grades">
                            <colgroup>
                              <col style={{ width: '10px' }} />
                              <col style={{ width: '80px' }} />
                              <col span={16} style={{ width: '14px' }} />
                              <col span={4} style={{ width: '14px' }} />
                              <col style={{ width: '16px' }} />
                              <col span={3} style={{ width: '14px' }} />
                              <col span={3} style={{ width: '14px' }} />
                              <col span={2} style={{ width: '14px' }} />
                              <col span={2} style={{ width: '14px' }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th colSpan={2} className="compfund">COMPETENCIAS<br />FUNDAMENTALES</th>
                                <th colSpan={4}>Comunicativa</th>
                                <th colSpan={4}>Pensamiento Lógico, Creativo y Crítico / Resolución de Problemas</th>
                                <th colSpan={4}>Científica y Tecnológica / Ambiental y de la Salud</th>
                                <th colSpan={4}>Ética y Ciudadana / Desarrollo Personal y Espiritual</th>
                                <th colSpan={4}>PROMEDIO GRUPO DE COMPETENCIAS ESPECÍFICAS</th>
                                <th rowSpan={2} className="vert">CALIFICACIÓN FINAL DEL ÁREA</th>
                                <th colSpan={3}>CALIFICACIÓN COMPLETIVA</th>
                                <th colSpan={3}>CALIFICACIÓN EXTRAORDINARIA</th>
                                <th colSpan={2}>EVALUACIÓN ESPECIAL</th>
                                <th colSpan={2}>SITUACIÓN FINAL EN LA ASIGNATURA</th>
                              </tr>
                              <tr>
                                <th colSpan={2}>PERÍODOS</th>
                                <th>P1</th><th>P2</th><th>P3</th><th>P4</th>
                                <th>P1</th><th>P2</th><th>P3</th><th>P4</th>
                                <th>P1</th><th>P2</th><th>P3</th><th>P4</th>
                                <th>P1</th><th>P2</th><th>P3</th><th>P4</th>
                                <th>PC1</th><th>PC2</th><th>PC3</th><th>PC4</th>
                                <th className="vert">50% C.F</th><th className="vert">C.E.C.</th><th className="vert">50% C.E.C.</th>
                                <th className="vert">30% C.F</th><th className="vert">C.E. EX</th><th className="vert">70% C.E. EX</th>
                                <th className="vert">C.F.</th><th className="vert">C.E.</th>
                                <th className="vert">A</th><th className="vert">R</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ASIGNATURAS_CATALOGO.map((asig, aIdx) => {
                                  const g = grades[asig.id] || {
                                      P1: { BC1: null, BC2: null, BC3: null, BC4: null },
                                      P2: { BC1: null, BC2: null, BC3: null, BC4: null },
                                      P3: { BC1: null, BC2: null, BC3: null, BC4: null },
                                      P4: { BC1: null, BC2: null, BC3: null, BC4: null },
                                      PC: { BC1: null, BC2: null, BC3: null, BC4: null },
                                      finalGrade: null
                                  };

                                  const isDeficient = g.finalGrade !== null && g.finalGrade < 70;

                                  return (
                                      <tr key={asig.id}>
                                        {aIdx === 0 && <td rowSpan={9} className="areas-label">ÁREAS CURRICULARES</td>}
                                        <td className="rowlabel">{asig.nombre}</td>
                                        
                                        {/* BC1 (Comunicativa) */}
                                        <td>{g.P1.BC1 ?? ''}</td>
                                        <td>{g.P2.BC1 ?? ''}</td>
                                        <td>{g.P3.BC1 ?? ''}</td>
                                        <td>{g.P4.BC1 ?? ''}</td>

                                        {/* BC2 (Pensamiento Lógico) */}
                                        <td>{g.P1.BC2 ?? ''}</td>
                                        <td>{g.P2.BC2 ?? ''}</td>
                                        <td>{g.P3.BC2 ?? ''}</td>
                                        <td>{g.P4.BC2 ?? ''}</td>

                                        {/* BC3 (Científica) */}
                                        <td>{g.P1.BC3 ?? ''}</td>
                                        <td>{g.P2.BC3 ?? ''}</td>
                                        <td>{g.P3.BC3 ?? ''}</td>
                                        <td>{g.P4.BC3 ?? ''}</td>

                                        {/* BC4 (Ética y Personal) */}
                                        <td>{g.P1.BC4 ?? ''}</td>
                                        <td>{g.P2.BC4 ?? ''}</td>
                                        <td>{g.P3.BC4 ?? ''}</td>
                                        <td>{g.P4.BC4 ?? ''}</td>

                                        {/* PC1 - PC4 Averages */}
                                        <td>{g.PC.BC1 ?? ''}</td>
                                        <td>{g.PC.BC2 ?? ''}</td>
                                        <td>{g.PC.BC3 ?? ''}</td>
                                        <td>{g.PC.BC4 ?? ''}</td>

                                        {/* Final Grade */}
                                        <td style={{ fontWeight: 'bold' }}>{g.finalGrade ?? ''}</td>

                                        {/* Completiva columns */}
                                        <td className="shaded">{isDeficient ? Math.round(g.finalGrade! * 0.5) : ''}</td>
                                        <td className="shaded"></td>
                                        <td className="shaded"></td>

                                        {/* Extraordinaria columns */}
                                        <td className="shaded">{isDeficient ? Math.round(g.finalGrade! * 0.3) : ''}</td>
                                        <td className="shaded"></td>
                                        <td className="shaded"></td>

                                        {/* Especial columns */}
                                        <td></td>
                                        <td></td>

                                        {/* Final Status (A/R) */}
                                        <td style={{ fontWeight: 'bold' }}>{g.finalGrade !== null && g.finalGrade >= 70 ? 'A' : ''}</td>
                                        <td style={{ fontWeight: 'bold' }}></td>
                                      </tr>
                                  );
                              })}
                              
                              {/* Empty optative rows matching standard design */}
                              <tr>
                                <td rowSpan={2} className="areas-label">SALIDA OPTATIVA</td>
                                <td className="rowlabel">&nbsp;</td>
                                <td colSpan={16}></td><td colSpan={4}></td><td></td>
                                <td className="shaded"></td><td className="shaded"></td><td className="shaded"></td>
                                <td className="shaded"></td><td className="shaded"></td><td className="shaded"></td>
                                <td></td><td></td><td></td><td></td>
                              </tr>
                              <tr>
                                <td className="rowlabel">&nbsp;</td>
                                <td colSpan={16}></td><td colSpan={4}></td><td></td>
                                <td className="shaded"></td><td className="shaded"></td><td className="shaded"></td>
                                <td className="shaded"></td><td className="shaded"></td><td className="shaded"></td>
                                <td></td><td></td><td></td><td></td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="bottom-section">
                            <div className="attendance">
                              <div className="header-bar">RESUMEN DE ASISTENCIA DEL/LA ESTUDIANTE</div>
                              <table className="attendance-table">
                                <tbody>
                                    <tr>
                                      <th rowSpan={2}>Períodos</th>
                                      <th rowSpan={2}>Asistencia</th>
                                      <th rowSpan={2}>Ausencia</th>
                                      <th colSpan={2}>% de Anual</th>
                                    </tr>
                                    <tr><th>Asistencia</th><th>Ausencia</th></tr>
                                    <tr><td>P1</td><td></td><td></td><td></td><td></td></tr>
                                    <tr><td>P2</td><td></td><td></td><td></td><td></td></tr>
                                    <tr><td>P3</td><td></td><td></td><td></td><td></td></tr>
                                    <tr><td>P4</td><td></td><td></td><td></td><td></td></tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="legend">
                              <table className="legend-table">
                                <tbody>
                                    <tr><th colSpan={2}>LEYENDA:</th></tr>
                                    <tr><td className="code">(P1)</td><td>Período 1</td></tr>
                                    <tr><td className="code">(P2)</td><td>Período 2</td></tr>
                                    <tr><td className="code">(P3)</td><td>Período 3</td></tr>
                                    <tr><td className="code">(P4)</td><td>Período 4</td></tr>
                                    <tr><td className="code">(PC)</td><td>Promedio Grupo de Competencias Específicas</td></tr>
                                    <tr><td className="code">(C.F.)</td><td>Calificación Final</td></tr>
                                    <tr><td className="code">(C.E.C.)</td><td>Calificación Evaluación Completiva</td></tr>
                                    <tr><td className="code">(C.C.F.)</td><td>Calificación Completiva Final</td></tr>
                                    <tr><td className="code">(C.E. EX)</td><td>Calificación Evaluación Extraordinaria</td></tr>
                                    <tr><td className="code">(C.EX.F.)</td><td>Calificación Extraordinaria Final (C.E.) Calificación Especial</td></tr>
                                    <tr><td className="code">(A)</td><td>Aprobado</td></tr>
                                    <tr><td className="code">(R)</td><td>Reprobado</td></tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="final-status">
                              <div className="situacion-row">
                                <span>SITUACIÓN DEL/DE LA ESTUDIANTE</span>
                                <span className="opt"><span className={`circle ${allPassed ? 'checked' : ''}`}></span>Promovido/a</span>
                                <span className="opt"><span className="circle"></span>Repitente</span>
                              </div>
                              <div className="header-bar" style={{ background: 'var(--boletin-light)', color: 'var(--boletin-text)' }}>CONDICIÓN FINAL DEL/DE LA ESTUDIANTE:</div>
                              <div className="condicion-lines">
                                <div className="line" style={{ fontSize: '10px', paddingLeft: '8px', paddingTop: '2px', fontWeight: 'bold' }}>
                                    {allPassed ? 'PROMOVIDO AL GRADO INMEDIATO SUPERIOR' : ''}
                                </div>
                                <div className="line"></div>
                                <div className="line"></div>
                              </div>
                            </div>
                          </div>

                          <div className="signatures">
                            <div className="sig"><div className="line"></div>Maestro(a) encargado(a) del grado</div>
                            <div className="sig"><div className="line"></div>Director(a) del Centro Educativo</div>
                          </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </>
    );
}
