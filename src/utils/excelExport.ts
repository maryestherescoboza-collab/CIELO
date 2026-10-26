export interface EstudianteExportItem {
    id: number;
    numeroLista?: number;
    nombre?: string;
    apellido?: string;
    displayName?: string;
    isPlaceholder?: boolean;
    bcValues?: Array<{
        bc: string;
        avg: number | null;
        rec: number | null;
        final: number | null;
    }>;
}

export interface ExportRegistroOptions {
    curso: { grado?: string; seccion?: string; nombre?: string } | undefined | null;
    periodo: string;
    estudiantes: EstudianteExportItem[];
}

/**
 * Sanitiza y construye un nombre de archivo descriptivo y seguro para el sistema de archivos.
 * Formato estándar: Registro_Academico_[Grado]_[Seccion]_[Periodo].xlsx
 * Ejemplo: Registro_Academico_5to_A_P2.xlsx
 */
export function buildExcelFileName(
    curso: { grado?: string; seccion?: string; nombre?: string } | undefined | null,
    periodo: string
): string {
    const sanitize = (val: string) =>
        val
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Elimina acentos para máxima compatibilidad
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

    const parts = ['Registro_Academico'];

    if (curso?.grado) {
        const cleanGrado = sanitize(curso.grado);
        if (cleanGrado) parts.push(cleanGrado);
    }

    if (curso?.seccion) {
        const cleanSeccion = sanitize(curso.seccion);
        if (cleanSeccion) parts.push(cleanSeccion);
    }

    const cleanPeriodo = sanitize(periodo || 'P1') || 'P1';
    parts.push(cleanPeriodo);

    return `${parts.join('_')}.xlsx`;
}

/**
 * Exporta el Registro Académico a formato .xlsx con las columnas:
 * | N.º | Estudiante | BC1 | BC2 | BC3 | BC4 |
 *
 * Utiliza carga diferida (dynamic import) de la biblioteca SheetJS (xlsx)
 * para garantizar cero impacto en el bundle inicial de la aplicación.
 */
export async function exportarRegistroAcademicoExcel(options: ExportRegistroOptions): Promise<void> {
    const { curso, periodo, estudiantes } = options;

    // 1. Filtrar estudiantes legítimos del curso (omitir filas visuales de relleno / placeholders)
    const realStudents = (estudiantes || [])
        .filter(est => {
            if (est.isPlaceholder) return false;
            if (est.id > 0) return true;
            const name = (est.displayName || `${est.nombre || ''} ${est.apellido || ''}`).trim();
            return name.length > 0;
        })
        .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));

    // 2. Construir la matriz de datos respetando encabezados legibles y tipos exactos
    const headers = ['N.º', 'Estudiante', 'BC1', 'BC2', 'BC3', 'BC4'];
    const rows: (string | number | null)[][] = [headers];

    realStudents.forEach((est, idx) => {
        const num = est.numeroLista ?? (idx + 1);
        const name = (est.displayName || `${est.nombre || ''} ${est.apellido || ''}`).trim() || `Estudiante ${num}`;

        // Obtener calificación por bloque preservando la lógica de evaluación oficial
        const getBcValue = (bcKey: string): number | null => {
            const bcItem = est.bcValues?.find(b => b.bc === bcKey);
            if (!bcItem) return null;
            // Si hubo recuperación aprobada, final contiene ese valor; de lo contrario el promedio
            const score = bcItem.final !== null && bcItem.final !== undefined ? bcItem.final : bcItem.avg;
            if (score === null || score === undefined || isNaN(score)) return null;
            return Math.round(score);
        };

        const bc1 = getBcValue('BC1');
        const bc2 = getBcValue('BC2');
        const bc3 = getBcValue('BC3');
        const bc4 = getBcValue('BC4');

        rows.push([num, name, bc1, bc2, bc3, bc4]);
    });

    // 3. Carga diferida de SheetJS (xlsx) para optimizar el bundle global
    const XLSX = await import('xlsx');

    // 4. Crear hoja de cálculo; los valores null generan celdas vacías genuinas (sin 0 artificial)
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Configuración de anchos de columna legibles y proporcionados
    ws['!cols'] = [
        { wch: 8 },  // N.º
        { wch: 38 }, // Estudiante
        { wch: 10 }, // BC1
        { wch: 10 }, // BC2
        { wch: 10 }, // BC3
        { wch: 10 }  // BC4
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = periodo ? `Registro ${periodo}` : 'Registro';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 5. Nombre descriptivo adaptado al curso y período
    const fileName = buildExcelFileName(curso, periodo);

    // 6. Descarga directa en el navegador
    if (typeof XLSX.writeFile === 'function') {
        XLSX.writeFile(wb, fileName);
    } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
