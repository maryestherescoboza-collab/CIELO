import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import type { AppState, Estudiante, Curso } from '../types';
import { estudiantesDelCurso } from './aislamiento';
import { 
  obtenerPortalAccessTokenEstudiante, 
  construirUrlPortalEstudiante, 
  extraerMatrizQr 
} from './informeCurricularPdf';

function dibujarQrVectorial(doc: jsPDF, matrix: boolean[][], x: number, y: number, size: number): void {
  const n = matrix.length || 1;
  const cell = size / n;
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, 'F');
  doc.setFillColor(30, 30, 36); // #1E1E24
  for (let row = 0; row < n; row++) {
    let col = 0;
    while (col < n) {
      if (matrix[row][col]) {
        let end = col;
        while (end + 1 < n && matrix[row][end + 1]) end++;
        doc.rect(x + col * cell, y + row * cell, (end - col + 1) * cell + 0.02, cell + 0.02, 'F');
        col = end + 1;
      } else {
        col++;
      }
    }
  }
}

export interface DescargarQrPdfOptions {
  state: AppState;
  docenteNombre?: string;
  centroNombre?: string;
  cursoId?: number;
}

export async function generarDescargaQREstudiantesPdf({
  state,
  docenteNombre,
  centroNombre,
  cursoId
}: DescargarQrPdfOptions): Promise<{ success: boolean; totalEstudiantes: number; error?: string }> {
  try {
    const authorizedCourses: Curso[] = state.cursos || [];
    const authorizedCourseIds = new Set(authorizedCourses.map(c => c.id));

    let targetCurso: Curso | undefined = undefined;
    let rawEstudiantes: Estudiante[] = [];

    if (cursoId !== undefined) {
      targetCurso = authorizedCourses.find(c => c.id === cursoId);
      if (!targetCurso) {
        return {
          success: false,
          totalEstudiantes: 0,
          error: 'El curso seleccionado no pertenece a tus cursos autorizados.'
        };
      }

      // 1. Filtrar estudiantes en memoria usando aislamiento institucional
      rawEstudiantes = estudiantesDelCurso(
        authorizedCourses,
        state.estudiantes || [],
        targetCurso,
        targetCurso.centroId
      );

      // 2. Resiliencia: si aún no están en memoria local, consultar directamente a Supabase
      if (rawEstudiantes.length === 0) {
        try {
          const { data: dbEstudiantes, error: dbErr } = await supabase
            .from('estudiantes')
            .select('id, nombres, nombre, apellidos, apellido, curso_id, numero_lista, avatar_color, grupo_id, user_id, shared_course_id')
            .eq('curso_id', targetCurso.id)
            .eq('activo', true)
            .order('numero_lista', { ascending: true });

          if (!dbErr && dbEstudiantes && dbEstudiantes.length > 0) {
            rawEstudiantes = dbEstudiantes.map((row: any) => ({
              id: row.id,
              nombre: row.nombres || row.nombre || '',
              apellido: row.apellidos || row.apellido || '',
              cursoId: row.curso_id,
              numeroLista: row.numero_lista || 0,
              avatarColor: row.avatar_color || '#3B82F6',
              grupoId: row.grupo_id || 0,
              nivel: 1,
              puntaje: 0,
              bc1: { nivel: 1, puntaje: 0 },
              bc2: { nivel: 1, puntaje: 0 },
              bc3: { nivel: 1, puntaje: 0 },
              bc4: { nivel: 1, puntaje: 0 },
              actividadesRecientes: 0,
              enRiesgo: false,
              userId: row.user_id,
              sharedCourseId: row.shared_course_id
            }));
          }
        } catch (fetchErr) {
          console.warn('No fue posible consultar estudiantes en BD, continuando:', fetchErr);
        }
      }

      if (rawEstudiantes.length === 0) {
        const cursoNombre = `${targetCurso.grado || ''} ${targetCurso.seccion || ''}`.trim() || 'seleccionado';
        return {
          success: false,
          totalEstudiantes: 0,
          error: `No se encontraron estudiantes activos en el curso ${cursoNombre}.`
        };
      }
    } else {
      // Modo global heredado: todos los cursos autorizados
      rawEstudiantes = (state.estudiantes || []).filter(e => {
        if (!e || !e.id) return false;
        if ((e as any).activo !== undefined && (e as any).activo === false) return false;
        const cId = e.cursoId || (e as any).curso_id;
        return authorizedCourseIds.has(cId);
      });

      if (rawEstudiantes.length === 0) {
        return {
          success: false,
          totalEstudiantes: 0,
          error: 'No se encontraron estudiantes en los cursos a los que tienes acceso.'
        };
      }
    }

    // 3. Deduplicación estricta por ID
    const estudiantesMap = new Map<number, Estudiante>();
    for (const est of rawEstudiantes) {
      if (!estudiantesMap.has(est.id)) {
        estudiantesMap.set(est.id, est);
      }
    }
    const estudiantes = Array.from(estudiantesMap.values());

    // Ordenación
    if (targetCurso) {
      // Orden por número de lista si existe, y luego por nombre/apellido
      estudiantes.sort((a, b) => {
        if ((a.numeroLista || 0) !== (b.numeroLista || 0)) {
          return (a.numeroLista || 0) - (b.numeroLista || 0);
        }
        const nameA = `${a.apellido || ''} ${a.nombre || ''}`.trim();
        const nameB = `${b.apellido || ''} ${b.nombre || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Orden por curso (grado, sección) y luego por nombre/apellido
      estudiantes.sort((a, b) => {
        const cA = authorizedCourses.find(c => c.id === (a.cursoId || (a as any).curso_id));
        const cB = authorizedCourses.find(c => c.id === (b.cursoId || (b as any).curso_id));
        const cursoAStr = cA ? `${cA.grado || ''} ${cA.seccion || ''}`.trim() : '';
        const cursoBStr = cB ? `${cB.grado || ''} ${cB.seccion || ''}`.trim() : '';
        const cComp = cursoAStr.localeCompare(cursoBStr);
        if (cComp !== 0) return cComp;
        const nameA = `${a.apellido || ''} ${a.nombre || ''}`.trim();
        const nameB = `${b.apellido || ''} ${b.nombre || ''}`.trim();
        return nameA.localeCompare(nameB);
      });
    }

    // 4. Batch query a portal_accesos para reutilizar tokens existentes al instante
    const studentIds = estudiantes.map(e => Number(e.id));
    const accesosMap = new Map<number, string>();

    try {
      const { data: accesos } = await supabase
        .from('portal_accesos')
        .select('estudiante_id, access_token')
        .in('estudiante_id', studentIds)
        .eq('active', true);

      if (accesos) {
        accesos.forEach((a: any) => {
          if (a.estudiante_id && a.access_token) {
            accesosMap.set(Number(a.estudiante_id), String(a.access_token).trim());
          }
        });
      }
    } catch (err) {
      console.warn('Consulta en lote de accesos fallida, usando resolución individual:', err);
    }

    // 5. Resolver tokens definitivos y URLs del portal
    const baseUrl = typeof window !== 'undefined' && window.location?.origin 
      ? window.location.origin 
      : 'https://evaluacielo.com';

    interface EstudianteQrItem {
      nombreCompleto: string;
      cursoTexto: string;
      qrMatrix: boolean[][];
    }

    const items: EstudianteQrItem[] = [];

    for (const est of estudiantes) {
      const cId = est.cursoId || (est as any).curso_id;
      const curso = targetCurso || authorizedCourses.find(c => c.id === cId);
      let token = accesosMap.get(Number(est.id)) || null;

      if (!token) {
        token = await obtenerPortalAccessTokenEstudiante(est, curso, state);
      }

      const qrUrl = construirUrlPortalEstudiante(token, baseUrl);
      const matrix = extraerMatrizQr(qrUrl);
      const nombreCompleto = `${est.nombre || ''} ${est.apellido || ''}`.trim();
      const cursoTexto = curso ? `${curso.grado || ''} ${curso.seccion || ''}`.trim() : '';

      items.push({
        nombreCompleto,
        cursoTexto,
        qrMatrix: matrix
      });
    }

    // 6. Configuración de Maquetación jsPDF (A4 vertical)
    // Dimensiones A4: 210 x 297 mm
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 12; // 12 mm margen izq y der
    const marginTop = 12;

    const cols = 4;
    const rowsPerPage = 5;
    const itemsPerPage = cols * rowsPerPage; // 20 tarjetas por página

    const colGap = 6;
    const rowGap = 5;
    const cardWidth = (pageWidth - (marginX * 2) - (colGap * (cols - 1))) / cols; // (210 - 24 - 18) / 4 = 42 mm
    const cardHeight = 44; // 44 mm de altura uniforme
    const qrSize = 25; // 25 mm código QR nítido

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const fechaImpresion = new Date().toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pageIndex = Math.floor(i / itemsPerPage);
      const indexInPage = i % itemsPerPage;
      const colIndex = indexInPage % cols;
      const rowIndex = Math.floor(indexInPage / cols);

      if (indexInPage === 0 && pageIndex > 0) {
        doc.addPage();
      }

      // Dibujar cabecera de página en cada hoja
      if (indexInPage === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(27, 31, 42); // #1B1F2A
        doc.text('CIELO · CÓDIGOS DE ACCESO AL PORTAL DEL ESTUDIANTE', marginX, marginTop + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(95, 102, 94); // #5F665E

        const cursoHeader = targetCurso
          ? `Curso: ${targetCurso.grado || ''} ${targetCurso.seccion || ''} ${targetCurso.asignatura ? `(${targetCurso.asignatura})` : ''}`.trim()
          : '';

        const subtituloPartes = [
          centroNombre ? `Centro: ${centroNombre}` : '',
          cursoHeader,
          docenteNombre ? `Docente: ${docenteNombre}` : '',
          `Generado: ${fechaImpresion}`
        ].filter(Boolean);
        doc.text(subtituloPartes.join('  •  '), marginX, marginTop + 9);

        // Línea divisoria elegante
        doc.setDrawColor(228, 227, 236); // #E4E3EC
        doc.setLineWidth(0.3);
        doc.line(marginX, marginTop + 11.5, pageWidth - marginX, marginTop + 11.5);
      }

      const gridStartY = marginTop + 15;
      const cardX = marginX + colIndex * (cardWidth + colGap);
      const cardY = gridStartY + rowIndex * (cardHeight + rowGap);

      // Marco de corte para la tarjeta (línea suave para recortar fácilmente)
      doc.setDrawColor(220, 222, 226);
      doc.setLineWidth(0.25);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      // Dibujar QR centrado en la tarjeta
      const qrX = cardX + (cardWidth - qrSize) / 2;
      const qrY = cardY + 2.5;
      dibujarQrVectorial(doc, item.qrMatrix, qrX, qrY, qrSize);

      // Nombre completo del estudiante (debajo del QR, centrado y limpio)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(27, 31, 42);

      const maxTextWidth = cardWidth - 3;
      const wrappedName = doc.splitTextToSize(item.nombreCompleto, maxTextWidth);
      const nameLines = wrappedName.slice(0, 2); // máximo 2 líneas para no desbordar
      const textStartY = qrY + qrSize + 3.2;

      for (let l = 0; l < nameLines.length; l++) {
        doc.text(nameLines[l], cardX + cardWidth / 2, textStartY + (l * 3), { align: 'center' });
      }

      // Grado y sección (si existe)
      if (item.cursoTexto) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 106, 115);
        const cursoY = textStartY + (nameLines.length * 3) + 0.2;
        if (cursoY < cardY + cardHeight - 1.2) {
          doc.text(item.cursoTexto, cardX + cardWidth / 2, cursoY, { align: 'center' });
        }
      }

      // Dibujar pie de página al final de cada página
      if (indexInPage === itemsPerPage - 1 || i === items.length - 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(140, 144, 150);
        doc.text(
          `Página ${pageIndex + 1} de ${totalPages}  •  Recorta y entrega a cada familia para acceder a su portal`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }
    }

    // 7. Descargar automáticamente el documento con nombre limpio
    let fileName = 'Codigos_QR_Estudiantes_CIELO.pdf';
    if (targetCurso) {
      const g = (targetCurso.grado || '').trim().replace(/\s+/g, '_');
      const s = (targetCurso.seccion || '').trim().replace(/\s+/g, '_');
      const partes = ['Codigos_QR', g, s, 'CIELO'].filter(Boolean);
      fileName = `${partes.join('_')}.pdf`;
    }
    doc.save(fileName);

    return {
      success: true,
      totalEstudiantes: items.length
    };
  } catch (error: any) {
    console.error('Error al generar el PDF de códigos QR:', error);
    return {
      success: false,
      totalEstudiantes: 0,
      error: error?.message || 'Ocurrió un error inesperado al generar el PDF.'
    };
  }
}
