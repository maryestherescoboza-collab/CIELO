import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { BookOpen, StickyNote, LayoutTemplate, CalendarDays } from 'lucide-react';
import { usePlanClasesStore } from '../../../store/planClasesStore';
import { useAppStore } from '../../../store/appStore';
import { useSupabaseData } from '../../../hooks/useSupabaseData';
import SidebarSection from './SidebarSection';
import SidebarNestedSection from './SidebarNestedSection';
import SidebarItem from './SidebarItem';

const PLANTILLAS_HTML = [
  {
    id: 'plan-recuperacion',
    titulo: 'Plan de Recuperación',
    path: '/planificacion',
  },
];

export default function PlanClasesSidebar() {
  const location = useLocation();
  const { secuenciaId, notaId } = useParams();
  const session = useAppStore((s) => s.session);
  const stateSecuencias = useAppStore((s) => s.state.secuencias);

  const { secuencias, notas, fetchSecuencias, fetchAllNotas } = usePlanClasesStore();
  const { loadPlanificacionData } = useSupabaseData(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSecuencias(session.user.id);
      fetchAllNotas(session.user.id);
      loadPlanificacionData();
    }
  }, [session?.user?.id, fetchSecuencias, fetchAllNotas, loadPlanificacionData]);

  const totalNotas = notas.length;
  const totalSecuenciasPc = secuencias.length;
  const totalPlanificaciones = stateSecuencias.length;
  const totalPlantillasHtml = PLANTILLAS_HTML.length;
  const totalElementos = totalNotas + totalSecuenciasPc + totalPlanificaciones + totalPlantillasHtml;

  const isNotaActive = (id: string) => notaId === id;
  const isSecuenciaActive = (id: string) => secuenciaId === id && !notaId;
  const isSecuenciaNotasActive = (id: string) => secuenciaId === id && !!notaId;

  const isPlanificacionDiariaRoute = location.pathname.startsWith('/planificacion-diaria/');
  const planificacionParamId = isPlanificacionDiariaRoute
    ? location.pathname.split('/planificacion-diaria/')[1]
    : null;
  const isPlanificacionActiva = (id: number) =>
    planificacionParamId !== null && planificacionParamId !== 'plantilla' && planificacionParamId === String(id);

  const getNotasParaSecuencia = (sId: string) =>
    notas.filter((n) => n.secuencia_id === sId);

  return (
    <aside className="w-64 h-full flex flex-col shrink-0 bg-[#FAFAF8] border-r border-[#2E3330]/10 z-30 overflow-hidden">
      <div className="flex flex-col h-full overflow-y-auto px-3 py-4 gap-4">
        {/* Header */}
        <div className="px-1 flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold text-[#2E3330] tracking-tight">
            Plan clases
          </span>
          <span className="text-[11px] font-semibold text-[#2E3330]/40">
            {totalElementos} elemento{totalElementos !== 1 && 's'}
          </span>
        </div>

        {/* Secciones */}
        <div className="flex flex-col gap-3">
          {/* Mis notas */}
          <SidebarSection
            title="Mis notas"
            icon={StickyNote}
            count={totalNotas}
            color="orange"
            defaultOpen={location.pathname.includes('/mis-notas') || !!notaId}
          >
            {notas.map((nota) => (
              <SidebarItem
                key={nota.id}
                label={nota.titulo}
                path={`/plan-de-clases/secuencias/${nota.secuencia_id}/notas/${nota.id}/editar`}
                isActive={isNotaActive(nota.id)}
              />
            ))}
          </SidebarSection>

          {/* Secuencias */}
          <SidebarSection
            title="Secuencias"
            icon={BookOpen}
            count={totalSecuenciasPc}
            color="yellow"
            defaultOpen={location.pathname.includes('/secuencias') && !notaId}
          >
            {secuencias.map((secuencia) => {
              const notasDeSecuencia = getNotasParaSecuencia(secuencia.id);
              const isActive = isSecuenciaActive(secuencia.id) || isSecuenciaNotasActive(secuencia.id);

              if (notasDeSecuencia.length === 0) {
                return (
                  <SidebarItem
                    key={secuencia.id}
                    label={secuencia.titulo}
                    path={`/plan-de-clases/secuencias/${secuencia.id}/notas`}
                    isActive={isActive}
                  />
                );
              }

              return (
                <div key={secuencia.id} className="flex flex-col gap-0.5">
                  <SidebarItem
                    label={secuencia.titulo}
                    path={`/plan-de-clases/secuencias/${secuencia.id}/notas`}
                    isActive={isActive && !notaId}
                  />
                  {notasDeSecuencia.map((nota) => (
                    <SidebarItem
                      key={nota.id}
                      label={nota.titulo}
                      path={`/plan-de-clases/secuencias/${nota.secuencia_id}/notas/${nota.id}/editar`}
                      isActive={isNotaActive(nota.id)}
                      depth={1}
                    />
                  ))}
                </div>
              );
            })}
          </SidebarSection>

          {/* Plantillas */}
          <SidebarSection
            title="Plantillas"
            icon={LayoutTemplate}
            count={totalPlanificaciones + totalPlantillasHtml}
            color="green"
            defaultOpen={location.pathname.includes('/planificacion')}
          >
            {/* Sub-sección: Planificación de clase diaria */}
            <SidebarNestedSection
              title="Planificación de clase diaria"
              icon={CalendarDays}
              count={totalPlanificaciones}
              path="/planificacion"
              isActive={location.pathname === '/planificacion'}
              defaultOpen={isPlanificacionDiariaRoute || location.pathname === '/planificacion'}
            >
              {stateSecuencias.map((plan) => (
                <SidebarItem
                  key={plan.id}
                  label={plan.titulo || 'Sin título'}
                  path={`/planificacion-diaria/${plan.id}`}
                  isActive={isPlanificacionActiva(plan.id)}
                  depth={1}
                />
              ))}
            </SidebarNestedSection>

            {/* Plantillas HTML existentes */}
            {PLANTILLAS_HTML.map((plantilla) => (
              <SidebarItem
                key={plantilla.id}
                label={plantilla.titulo}
                path={plantilla.path}
                isActive={location.pathname === plantilla.path}
              />
            ))}
          </SidebarSection>
        </div>
      </div>
    </aside>
  );
}
