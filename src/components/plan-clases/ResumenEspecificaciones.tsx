import { useMemo } from 'react';
import { PERIODOS_ACADEMICOS } from '../../cache/academicCache';
import { COLORES_BLOQUE_CF, bloqueDeCompetencia, normalizarTexto } from '../../lib/curriculo';
import type {
  BloqueCF,
  CompetenciaCurricular,
  EspecificacionPeriodoDB,
  FilaCompetenciaEspecifica,
  FilaIndicador,
} from '../../types/especificaciones';

interface ItemIndicador {
  id: string;
  codigo: string;
  descripcion: string;
  /** curr_indicadores.competencia (bloque CF o nombre de la competencia) para relacionarlo con la CE. */
  competencia: string | null;
  /** BC real del indicador (color CIELO de acento); null si el catálogo no lo define. */
  bloque: BloqueCF | null;
}

interface FilaResumen {
  codigo: string;
  /** Bloque CF de la CE que agrupa la fila (respaldo de color para sus indicadores). */
  bloque: BloqueCF | null;
  indicadores: ItemIndicador[];
}

interface ItemContenidoResumen {
  contenido: string;
  conceptos: string[];
  procedimientos: string[];
  actitudes_valores: string[];
}

interface PeriodoResumen {
  periodo: string;
  numero: string;
  filas: FilaResumen[];
  /** Indicadores del período cuando no hay CE seleccionada: no existe CE con la que relacionarlos. */
  indicadoresLibres: ItemIndicador[];
  contenidos: ItemContenidoResumen[];
}

interface ResumenEspecificacionesProps {
  /** Períodos guardados de la especificación activa; solo se muestran los que tienen datos. */
  periodos: EspecificacionPeriodoDB[];
  /** Catálogo de CE del grado y la asignatura (para ordenar los códigos como en el formulario). */
  catalogoCE: FilaCompetenciaEspecifica[];
  /** Catálogo de indicadores del grado y la asignatura (para enriquecer la selección guardada). */
  catalogoIndicadores: FilaIndicador[];
  /** Código de CE → ids de curr_indicadores vinculados en curr_ce_indicadores (vacío si la tabla no tiene filas). */
  puente: Map<string, string[]>;
}

const SIN_ASOCIADOS = 'Sin elementos asociados';

const ordenarPorCodigo = (a: string, b: string) =>
  a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

const CELDA = 'border border-[#2E3330]/25 px-3 py-2 align-top';
const COLUMNA = `${CELDA} bg-[#EFEFEF] text-[12px] font-extrabold text-[#2E3330]`;

/** Lista de contenidos con su desglose JSON organizado (conceptos, procedimientos y actitudes). */
function ListaContenidos({ elementos }: { elementos: ItemContenidoResumen[] }) {
  if (elementos.length === 0) {
    return <span className="text-[#2E3330]/50">{SIN_ASOCIADOS}</span>;
  }
  return (
    <div className="flex flex-col gap-3">
      {elementos.map((item, idx) => {
        const tieneDetalles =
          item.conceptos.length > 0 ||
          item.procedimientos.length > 0 ||
          item.actitudes_valores.length > 0;

        return (
          <div
            key={`${idx}-${item.contenido}`}
            className="flex flex-col gap-1.5 border-b border-[#2E3330]/10 pb-2.5 last:border-b-0 last:pb-0"
          >
            <span className="font-extrabold text-[#2E3330] leading-snug">
              {item.contenido}
            </span>
            {tieneDetalles && (
              <div className="pl-2 flex flex-col gap-1.5 text-[12px] mt-0.5">
                {item.conceptos.length > 0 && (
                  <div>
                    <span className="font-black text-[#2563EB] uppercase text-[10px] tracking-wider block">
                      Conceptos:
                    </span>
                    <ul className="list-disc pl-4 text-[#2E3330]/80 flex flex-col gap-0.5 mt-0.5">
                      {item.conceptos.map((c, i) => (
                        <li key={i} className="leading-snug">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.procedimientos.length > 0 && (
                  <div>
                    <span className="font-black text-[#0D9488] uppercase text-[10px] tracking-wider block mt-1">
                      Procedimientos:
                    </span>
                    <ul className="list-disc pl-4 text-[#2E3330]/80 flex flex-col gap-0.5 mt-0.5">
                      {item.procedimientos.map((p, i) => (
                        <li key={i} className="leading-snug">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.actitudes_valores.length > 0 && (
                  <div>
                    <span className="font-black text-[#D97706] uppercase text-[10px] tracking-wider block mt-1">
                      Actitudes y Valores:
                    </span>
                    <ul className="list-disc pl-4 text-[#2E3330]/80 flex flex-col gap-0.5 mt-0.5">
                      {item.actitudes_valores.map((a, i) => (
                        <li key={i} className="leading-snug">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Lista de indicadores con la etiqueta del código teñida por su Competencia Fundamental. */
function ListaIndicadores({ elementos, respaldo }: { elementos: ItemIndicador[]; respaldo?: BloqueCF | null }) {
  if (elementos.length === 0) {
    return <span className="text-[#2E3330]/50">{SIN_ASOCIADOS}</span>;
  }
  return (
    <ul className="list-disc pl-4 flex flex-col gap-1.5">
      {elementos.map((ind) => {
        const bloque = ind.bloque ?? respaldo ?? null;
        const color = bloque ? COLORES_BLOQUE_CF[bloque] : null;
        return (
          <li key={ind.id} className="leading-snug text-[#2E3330]/85">
            {ind.codigo && (
              <span
                className="mr-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-black text-[#2E3330]"
                style={{ backgroundColor: color ? `${color}1F` : 'rgba(46, 51, 48, 0.06)' }}
              >
                {ind.codigo}
              </span>
            )}
            {ind.descripcion}
          </li>
        );
      })}
    </ul>
  );
}

export default function ResumenEspecificaciones({
  periodos,
  catalogoCE,
  catalogoIndicadores,
  puente,
}: ResumenEspecificacionesProps) {
  const resumen = useMemo<PeriodoResumen[]>(() => {
    const indiceCE = new Map(catalogoCE.map((f, i) => [f.codigo, i]));
    const indicadorPorId = new Map(catalogoIndicadores.map((f) => [f.id, f]));
    const ordenPeriodo = new Map<string, number>(PERIODOS_ACADEMICOS.map((p, i) => [p, i]));

    const conDatos = periodos
      .filter(
        (p) =>
          (Array.isArray(p.competencias_especificas) &&
            p.competencias_especificas.some((c) => !!c && typeof c === 'object' && !!c.codigo)) ||
          (Array.isArray(p.contenidos) && p.contenidos.length > 0) ||
          (Array.isArray(p.indicadores) && p.indicadores.length > 0)
      )
      .sort(
        (a, b) =>
          (ordenPeriodo.get(a.periodo) ?? Number.MAX_SAFE_INTEGER) -
          (ordenPeriodo.get(b.periodo) ?? Number.MAX_SAFE_INTEGER)
      );

    return conDatos.map((p) => {
      // CE seleccionadas en el período: sin duplicados y en el mismo orden curricular que el formulario.
      const ceVistas = new Set<string>();
      const ces: CompetenciaCurricular[] = [];
      for (const c of p.competencias_especificas || []) {
        if (c && typeof c === 'object' && c.codigo && !ceVistas.has(c.codigo)) {
          ceVistas.add(c.codigo);
          ces.push(c);
        }
      }
      ces.sort(
        (a, b) =>
          (indiceCE.get(a.codigo) ?? Number.MAX_SAFE_INTEGER) -
          (indiceCE.get(b.codigo) ?? Number.MAX_SAFE_INTEGER)
      );

      // Indicadores guardados en el período, enriquecidos con el catálogo y sin duplicados.
      const indVistos = new Set<string>();
      const indicadores: ItemIndicador[] = [];
      for (const i of p.indicadores || []) {
        if (!i || typeof i !== 'object' || !i.curr_indicador_id || indVistos.has(i.curr_indicador_id)) {
          continue;
        }
        indVistos.add(i.curr_indicador_id);
        const cat = indicadorPorId.get(i.curr_indicador_id);
        const item: ItemIndicador = {
          id: i.curr_indicador_id,
          codigo: (cat?.codigo || i.codigo || '').trim(),
          descripcion: (cat?.descripcion || '').trim(),
          competencia: cat?.competencia ? cat.competencia.trim() : null,
          bloque: bloqueDeCompetencia(cat?.competencia),
        };
        if (item.codigo || item.descripcion) indicadores.push(item);
      }

      // Relación CE ↔ indicador: primero el puente curr_ce_indicadores; si ese CE no tiene
      // filas en el puente, se usa la relación real del catálogo (curr_indicadores.competencia
      // frente al bloque o la competencia fundamental de la CE). No se inventa ninguna asociación.
      const asociados = (ce: CompetenciaCurricular): ItemIndicador[] => {
        const vinculados = puente.get(ce.codigo);
        const bloque = normalizarTexto(ce.bloque);
        const nombre = normalizarTexto(ce.nombre);
        const lista = indicadores.filter((ind) => {
          if (vinculados) return vinculados.includes(ind.id);
          if (!ind.competencia) return false;
          const rel = normalizarTexto(ind.competencia);
          return rel === bloque || rel === nombre;
        });
        return [...lista].sort((a, b) => ordenarPorCodigo(a.codigo, b.codigo));
      };

      const filas: FilaResumen[] = ces.map((ce) => ({
        codigo: ce.codigo,
        bloque: ce.bloque ?? null,
        indicadores: asociados(ce),
      }));

      const contenidoVistos = new Set<string>();
      const contenidos: ItemContenidoResumen[] = [];
      for (const c of p.contenidos || []) {
        if (!c || typeof c !== 'object') continue;
        const texto = (c.contenido || '').trim();
        if (texto && !contenidoVistos.has(texto)) {
          contenidoVistos.add(texto);
          contenidos.push({
            contenido: texto,
            conceptos: Array.isArray(c.conceptos) ? c.conceptos : [],
            procedimientos: Array.isArray(c.procedimientos) ? c.procedimientos : [],
            actitudes_valores: Array.isArray(c.actitudes_valores) ? c.actitudes_valores : [],
          });
        }
      }

      return {
        periodo: p.periodo,
        numero: p.periodo.replace(/^P/i, ''),
        filas,
        indicadoresLibres: filas.length === 0 ? indicadores : [],
        contenidos,
      };
    });
  }, [periodos, catalogoCE, catalogoIndicadores, puente]);

  if (resumen.length === 0) {
    return (
      <div className="rounded-3xl border border-[#2E3330]/10 border-dashed p-8 text-center">
        <p className="font-bold text-[#2E3330]">Aún no hay selecciones guardadas</p>
        <p className="text-[14px] text-[#2E3330]/60 mt-1">
          Completa los pasos anteriores para ver aquí el resumen por período.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {resumen.map((r) => (
        <section key={r.periodo} className="flex flex-col gap-2">
          <h2 className="text-[13px] sm:text-[14px] font-black text-[#2E3330] tracking-wide">
            Período {r.numero} — ESPECIFICACIÓN CURRICULAR APLICADA POR PERÍODO
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  <th className={`${COLUMNA} whitespace-nowrap`}>CE</th>
                  <th className={COLUMNA}>Indicadores de Logro</th>
                  <th className={COLUMNA}>Contenidos Claves</th>
                </tr>
              </thead>
              <tbody>
                {r.filas.length > 0 ? (
                  r.filas.map((fila, idx) => (
                    <tr key={fila.codigo}>
                      <td className={`${CELDA} font-black text-[#2E3330] whitespace-nowrap`}>{fila.codigo}</td>
                      <td className={CELDA}>
                        <ListaIndicadores elementos={fila.indicadores} respaldo={fila.bloque} />
                      </td>
                      {idx === 0 && (
                        <td rowSpan={r.filas.length} className={CELDA}>
                          <ListaContenidos elementos={r.contenidos} />
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={`${CELDA} font-black text-[#2E3330]`}>{SIN_ASOCIADOS}</td>
                    <td className={CELDA}>
                      <ListaIndicadores elementos={r.indicadoresLibres} />
                    </td>
                    <td className={CELDA}>
                      <ListaContenidos elementos={r.contenidos} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
