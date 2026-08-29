# AUDITORÍA INICIAL — SISTEMA DE CARGA DE DATOS Y CACHÉ EN CIELO

> **Alcance:** Solo diagnóstico. NO se modificó ningún archivo, NO se eliminaron consultas, NO se tocaron rúbricas, listas de cotejo, calificaciones, RLS ni base de datos.
> **Estado:** Espera de aprobación para cualquier cambio.

---

## Resumen ejecutivo

El proyecto **ya cuenta con las piezas centrales de un sistema de caché en memoria** sin necesidad de duplicar infraestructura:

- **Zustand** (`src/store/appStore.ts`) es el store global único, y usa el middleware `persist` (nombre `terra-cognita-storage`) exactamente como caché **en memoria + localStorage**.
- **TanStack Query** (`@tanstack/react-query` v5) está instalado en `package.json` pero **no se usa en ningún lado** (no hay `QueryClientProvider` ni `useQuery`).
- La carga masiva fue **parcialmente migrada a cargas por módulo bajo demanda** (mecanismo `loadedModules` / `loadedCursos`).

El `user_id` se obtiene de `session.user.id` (Supabase Auth). El `centro_id` se obtiene de `perfiles.centro_id` del perfil propio, y se propaga como `centroId` en cada `Curso`. Los datos de actividad, calificaciones, incidencias y recuperaciones se aislan por `shared_course_id` (subordinado al `centro_id` del curso) mediante `src/utils/aislamiento.ts`.

---

## A. Inventario de consultas

### A.1. Carga global / de contexto — `src/hooks/useSupabaseData.ts`

| # | Tabla/recurso | Cuándo se ejecuta | ¿Repetida? | Observaciones |
|---|---|---|---|---|
| 1 | `perfiles` (perfil propio, sin JOIN) | Al iniciar sesión (`fetchData`) | **Sí** (ver A.2 fila 3) | Es la **fuente del `centro_id`** del usuario. Pasos iniciales críticos. |
| 2 | `curso_docentes` (solo `curso_id`) | Al iniciar sesión (`fetchData`) | **Sí** (fila 5) | Consulta previa para resolver los id de cursos propios. Luego se vuelve a consultar completa. |
| 3 | `perfiles` (lista por `centro_id`) | Al iniciar sesión | No | Lista de docentes del centro (para co-docentes, panel). |
| 4 | `centro_roles` (por `user_id`) | Al iniciar sesión | No | Permisos de administración. |
| 5 | `cursos` | Al iniciar sesión | No | Estructura de TODOS los cursos del usuario/centro. **Candidato clave a caché.** |
| 6 | `curso_docentes` (completa) | Al iniciar sesión | **Sí** (fila 2) | Vinculación docente↔curso. |
| 7 | `suscripciones` | Al iniciar sesión | No | Plan/pago. |
| 8 | `historial_colaboradores` | Al iniciar sesión | **Sí** (ver usoComunidad) | Se re-consulta en Comunidad. |
| 9 | `centros` (por `id` del centro) | Al iniciar sesión | **Sí** (ver CentroActions/loadCentro) | Datos del centro. **Candidato #1 a caché de centro.** |
| 10 | `registros_anecdoticos` (activos) | Al iniciar sesión | No | Para dashboard / panel. |
| 11 | `registro_imagenes` (solo si hay anecdóticos) | Al iniciar sesión | No | Dependiente de #10. |

### A.2. Carga bajo demanda — `useSupabaseData.ts`

Estas funciones se invocan desde los screens vía `useSupabaseData(true)` (flag `skipInit` desactiva la carga automática global). Se controlan con `loadedModules` / `loadedCursos` (bloquean la repetición en la misma sesión).

| Función | Tablas | Disparador (screen) | ¿Repetida? |
|---|---|---|---|
| `loadDashboardData` | `estudiantes`, `actividades`, `calificaciones`, `incidencias`, `eventos`, `notificaciones`, `grupos`, `tareas_institucionales`, `tarea_docente`, `calendario_minerd` | Dashboard, Inicio, Cursos, Incidencias, CentroPanel, PrintBoletines, Estudiante | **Sí** entre sí (ver sección C) |
| `loadCursoData(cursoId)` | `estudiantes`, `actividades`, `calificaciones`, `recuperaciones`, `curso_detalle`, `recuperaciones_cotejo` | CursoDetalle, Rubrica, Cotejo, Estudiante | No dentro de la sesión (guard por `loadedCursos`) |
| `loadPlanificacionData` | `secuencias` | Planificacion | No |
| `loadRubricaCotejoData` | `plantillas` | Rubrica, Cotejo | No dentro de sesión (evaluacion) |
| `loadComunidadData` | `posts`, `historial_colaboradores` | (definido pero usado por useCommunityData) | **Sí** con `useCommunityData` |

### A.3. Hooks de consumo directo (componentes individuales)

| Hook/Archivo | Tabla/recurso | Cuándo | ¿Repetida? |
|---|---|---|---|
| `useCommunityData.ts` | `posts` (pag.), `historial_colaboradores`, `plantillas` (por ids), `secuencias` (por ids) | Al montar Comunidad y al hacer scroll (`loadMore`) | **Sí** con `loadComunidadData`; `historial_colaboradores` se repite en login |
| `useCommunityData.ts` (plural) | Ninguna consulta (solo filtrado de `state` en memoria) | — | — |
| `useCentroActions.loadCentro(centroId)` | `centros` | CentroPanel al montar y en "cambiar centro" | **Sí** con `fetchData` (fila 9). Consulta el MISMO centro que ya se carga al login |
| `useCentroActions.updateInstitutoName` | `centros`, `perfiles` (upsert) | Editar nombre de institución | Solo escritura + una lectura puntual |
| `useAppInitialization` | `perfiles` (upsert `last_seen`) | Cada 60s + al montar | Escritura de presencia, no lectura |
| `usePostActions.ts` | `plantillas` (insert), `posts` (insert), `reportes_comunidad` (insert) | Publicar en comunidad | Solo escritura |
| `useEvaluationActions.ts` | `actividades`, `calificaciones`, `recuperaciones`, `recuperaciones_cotejo`, `curso_detalle`, `niveles_puntaje`, `descriptores_rubrica`, `criterios_cotejo`, `plantillas` | Guardar evaluaciones y editar plantillas | Solo escritura (cálculo de rúbricas/cotejo — **no tocar**) |
| `src/components/comunidad/ModalsManager.tsx` | `plantillas`, `descriptores_rubrica`, `criterios_cotejo`, `secuencias` (por id) | Ver detalle de un recurso de la comunidad | **Sí** — re-consulta plantillas que ya están en `state`
| `src/components/RegistroAnecdotico.tsx` | `registro_imagenes` (insert), `registros_anecdoticos` (soft-delete) | Añadir imagen / eliminar anecdótico | Solo escritura |

### A.4. Pantallas con consultas directas

| Screen | Tabla/recurso | Cuándo | ¿Repetida? |
|---|---|---|---|
| `Auth.tsx` | `centros` (por id), `perfiles` (upsert), RPCs (`asignar_centro_administrador`, `aplicar_vinculo_usuario`, `validar_codigo_usuario`, `centro_tiene_suscripcion_institucional`) | Registro/vinculación | — |
| `CentroPanel.tsx` | `centros` (vía `loadCentro`), + `loadDashboardData` | Al montar | `centros` repetido con login |
| `ProfileSettings.tsx` | (usa acciones de `useProfileActions`/`useCentroActions`) | Editar perfil/institución | — |

### A.5. Hooks de acciones (solo escritura — no son carga de datos, pero se listan para no quitarlos)

`useCourseActions.ts`, `useStudentActions.ts`, `useSecuenciaActions.ts`, `useTareaActions.ts`, `useNotificationActions.ts`, `useIncidenciaActions.ts`, `useGoogleDrive.ts`, `usePremiumAccess.ts`. Todos hacen `insert/update/delete/upsert` o RPC; **no participan en la carga de lectura** y no deben modificarse en esta etapa.

---

## B. Arquitectura actual

1. **Login** → `useSupabaseAuth` escucha `onAuthStateChange` y guarda `session` en el store (`setSession`). Al cambiar de usuario, `setSession` resetea `loadedModules` y `loadedCursos`.
2. **`useSupabaseData`** en `App.tsx` (hook raíz) ejecuta `fetchData()` al tener `session.user.id`. Este hace **Phase 1** (perfil propio → resuelve `centro_id` → consulta en paralelo `perfiles`, `centro_roles`, `cursos`, `curso_docentes`, `suscripciones`, `historial_colaboradores`, `centros`) y **Phase 1.5** (anecdóticos/imágenes).
3. Todo se **normaliza/mapea** (funciones `mapX`) y se escribe en `state` de Zustand vía `setState`.
4. **Realtime**: se suscriben canales (notificaciones, anecdóticos; y por curso: calificaciones, curso_detalle, actividades, estudiantes, recuperaciones, recuperaciones_cotejo). Actualizan `state` incrementalmente.
5. **Backup**: `fetchData(true)` (silencioso) se repite cada **15 minutos** (`setInterval`).
6. **Bajo demanda**: al entrar a un screen, este invoca `loadXData()` con `useSupabaseData(true)` (skipInit). El mecanismo `loadedModules`/`loadedCursos` evita recargar lo ya cargado en la sesión.
7. Los **screens leen siempre de `state`** (Zustand) mediante hooks de datos derivados (`useDashboardData`, `useCursosData`, `useCursoDetalleData`, `useEstudianteData`), que hacen filtrado/memo (no consultas).

**Resumen del flujo:** Login → session → fetchData (masiva pero acotada a contexto/centro) → Zustand `state` (fuente única en memoria) → screens leen de `state` y completan bajo demanda.

---

## C. Consultas duplicadas

| Dato | Dónde se repite |
|---|---|
| **`centros` (del centro actual)** | 1) `fetchData` → Phase 1 (fila 9). 2) `useCentroActions.loadCentro` (CentroPanel). Se consulta el **mismo `centro_id`** dos veces en el arranque. |
| **`historial_colaboradores`** | 1) `fetchData` (login). 2) `loadComunidadData`. 3) `useCommunityData` (al abrir Comunidad y por página). |
| **`plantillas`** | 1) `loadRubricaCotejoData` (carga propia). 2) `useCommunityData` (por ids faltantes). 3) `ModalsManager` (por id al ver detalle). |
| **`secuencias`** | 1) `loadPlanificacionData` (carga propia). 2) `useCommunityData` (por ids). 3) `ModalsManager` (por id). |
| **`posts`** | 1) `loadComunidadData` (definido). 2) `useCommunityData` (montaje + paginación). (Actualmente solo corre `useCommunityData`.) |
| **`estudiantes` / `actividades` / `calificaciones`** | Se cargan en `loadDashboardData` (todos los cursos) y de *nuevo* en `loadCursoData` (por curso). Superposición real para los cursos que ya se cargaron en dashboard. |
| **`notificaciones`** | `loadDashboardData` (solo no leídas) + realtime. |

> Nota: aunque `loadedModules`/`loadedCursos` evitan la repetición *dentro de una misma sesión*, el `setInterval` de 15 min (`fetchData(true)`) re-descarga **todo** el contexto sin caché intermedia, y en una misma sesión las cargas de dashboard y curso no comparten deduplicación real (guards distintos).

---

## D. Sistemas existentes

| Sistema | Existe | Detalle |
|---|---|---|
| **Zustand** | ✅ Sí (`v5`) | `src/store/appStore.ts`. Store global único con todos los datos en `state`. |
| **persist (Zustand)** | ✅ Sí | `persist` con nombre `terra-cognita-storage`. Sin embargo `partialize` **solo** persiste UI: `selectedCursoId`, `selectedEstudianteId`, `selectedPeriodo`, `darkMode`. **No persiste datos** (`state` no se persiste). El acceso a localStorage (`pendingCentroCIELO`, `pendingVinculoCIELO`) existe pero no es caché de datos. |
| **TanStack Query** | ⚠️ Instalado, **NO usado** | `@tanstack/react-query` v5 en deps, pero no hay `QueryClientProvider` ni `useQuery` en `src`. No aporta caché hoy. |
| **Cache en memoria** | ✅ Sí (implícito) | Todo vive en `state` (Zustand). Es *de facto* la capa de caché en memoria del app. |
| **localStorage / sessionStorage** | ✅ localStorage (persist UI + pending) | No se usa para datos de dominio. |
| **Memoización** | ✅ Sí | `useMemo` extensivo en los hooks de datos derivados (filtrado sobre `state`). No es caché de red. |
| **Realtime** | ✅ Sí | Canales de Supabase que mantienen `state` fresco sin re-consulta. |

**Conclusión:** No hay que crear un sistema de caché desde cero. La infraestructura natural a reutilizar es **Zustand `state`** (ya es la caché en memoria) y se puede reforzar con el `persist` existente (extendiendo `partialize`) o adoptando TanStack Query para envolver los fetch. Reusar Zustand evita duplicar.

---

## E. Riesgos

### Riesgos de mezcla de datos entre usuarios / centros
- `perfiles` se carga **por `centro_id`** cuando el usuario tiene centro; esto permite ver los docentes del mismo centro (necesario para co-docentes). Cualquier caché de `perfiles`/`docentes` debe **clavearse por `centro_id`**.
- `cursos` se filtran localmente en `fetchData` por: ser creador (`c.user_id === session.user.id`), vínculo (`curso_docentes.docente_id`) o rol de admin del centro (`c.centro_id === centroRolActual.centro_id`). Si se cachean, **el filtro de aislamiento debe re-ejecutarse por usuario**, no asumir que el curso es compartido.
- `shared_course_id` no equivale a centro: un curso compartido **solo** dentro del mismo `centro_id`. Ver `src/utils/aislamiento.ts` (`perteneceAlContextoDelCurso`, `esEstudianteDelCurso`). Al cachear, siempre validar la relación con `curso.centroId`.
- `centro_id` del usuario proviene de `perfiles` (paso 1, sin JOIN). Nunca asumir el centro desde otra fuente.

### Áreas que NO deben modificarse durante la implementación
- **Lógica de rúbricas** (`saveRubrica`, `updateDescriptor`, `savePlantilla` en `useEvaluationActions.ts`).
- **Lógica de listas de cotejo** (`saveCotejo`, `saveRecuperacionCotejo`).
- **Cálculo y guardado de calificaciones** (`saveCalificaciones`, `calculateStudentPeriodBC` en `utils/academic.ts`, `useCursoDetalleData`).
- **Suscripciones Realtime** (borrar/alterar canales rompe el estado en vivo).
- **Políticas RLS y base de datos** (ninguna modificación de SQL ni `supabase/`).
- La capa de **normalización/mapping** (`mapActividad`, `mapCalificacion`, etc.) ya está aislada y no debe romperse.

### Riesgos operativos
- El `setInterval` de 15 min (`fetchData(true)`) puede borrar/sobrescribir optimizaciones si se cachea sin invalidación correcta.
- Los guards `loadedModules`/`loadedCursos` viven en el store y **se resetean solo al cambiar de usuario**. Si se agrega caché persistente, definir limpieza/expiración (por día, periodo o cambio de centro) para no servir datos obsoletos de un año escolar distinto.

---

## F. Recomendación para el primer paso

**Punto de integración sugerido:** la capa de **datos del centro ya resuelta en `fetchData` (Phase 1, consultas `cursos` + `centros`)**, trasladándola a una lectura única desde el store.

Concretamente, el primer archivo a tocar sería **`src/hooks/useSupabaseData.ts`**, dentro de la función `fetchData`, para convertir la consulta `centros` (fila 9) y `cursos` (fila 5) en lecturas servidas desde el store Zustand con invalidación por `centro_id`, en lugar de re-consultarlas:

1. Evita la doble consulta de `centros` con `useCentroActions.loadCentro` (CentroPanel) — el dato central candidato #1.
2. Establece el patrón (clave `centro_id` → valor) que se reutilizará para `perfiles`, `plantillas`, `secuencias` y cursos estructurales.
3. Se integra sin tocar rúbricas, cotejo ni calificaciones.

> A la espera de tu aprobación. No se ha modificado ni eliminado nada.
