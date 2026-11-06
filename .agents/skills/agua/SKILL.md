---
name: agua
description: Sistema obligatorio de ingeniería preventiva para CIELO. Úsala SIEMPRE antes, durante y después de cualquier cambio que toque consultas a Supabase, caché, Zustand, React Query, hooks de datos, efectos (useEffect), Realtime, Edge Functions, migraciones SQL, índices, políticas RLS, escrituras en base de datos, portal del estudiante, calificaciones, asistencia o autenticación. También cuando el cambio parezca solo visual pero pueda disparar peticiones. Su objetivo es reducir Disk IO, CPU y peticiones sin alterar reglas académicas, permisos ni aislamiento de datos.
---

# AGUA: rendimiento, caché y protección de infraestructura de CIELO

## 0. Principios

```
ANTES DE CONSULTAR, REUTILIZAR.
ANTES DE ESCRIBIR, VERIFICAR.
ANTES DE MODIFICAR, MEDIR Y EVALUAR EL IMPACTO.
DESPUÉS DE MODIFICAR, VALIDAR CON EVIDENCIA.
```

Orden de prioridad cuando hay conflicto:

1. Seguridad y aislamiento de datos (RLS, centro, rol).
2. Exactitud académica (calificaciones, ponderaciones, indicadores).
3. Disponibilidad y presupuesto de infraestructura (Disk IO, conexiones, CPU).
4. Rendimiento percibido.
5. Elegancia del código.

Regla de oro: **ninguna optimización puede cambiar un resultado funcional**. Si no se puede demostrar que el comportamiento es idéntico, no se aplica.

## 1. Contexto fijo de CIELO

- Stack: React, Vite, TypeScript, Tailwind, Zustand (persist), Supabase PostgreSQL con RLS, Edge Functions, Auth.
- Proyecto Supabase: Noether Thinkers, ref `sgjnactnhmpmbbgexcox`.
- Multiusuario y multicentro. Picos por carga simultánea de docentes y de cientos o miles de estudiantes (portal).
- Módulos: actividades, estudiantes, calificaciones, rúbricas, cotejos, asistencia, incidencias, planificación, boletines, portal del estudiante.
- Alerta activa: Supabase notificó consumo elevado del presupuesto de **Disk IO**. Todo cambio se evalúa también bajo esa lente.

## 2. Modo de operación

AGUA tiene tres modos. El agente debe declarar cuál aplica al iniciar.

| Modo | Cuándo | Entrega |
|---|---|---|
| **PREVENTIVO** | Antes de implementar cualquier cambio | Ficha de impacto (sección 14) |
| **CORRECTIVO** | Ya hay síntoma (alerta de Disk IO, lentitud, picos) | Diagnóstico con evidencia, causa raíz, plan priorizado |
| **VERIFICACIÓN** | Después de implementar | Informe de validación (sección 15) |

Cambio puramente visual (CSS, textos, layout sin datos): no tocar servicios, hooks de datos ni stores. Verificar solo que no se introdujeron peticiones nuevas.

## 3. Regla de lectura obligatoria

Antes de escribir código:

1. Leer los archivos implicados completos, no fragmentos.
2. Buscar servicios, hooks y stores existentes que ya traigan ese dato: `grep -rn "from('tabla')" src/` y `grep -rn "supabase\.\(from\|rpc\)" src/`.
3. Reutilizar. Crear una consulta nueva solo si se justifica por escrito por qué ninguna existente sirve.
4. Nunca asumir el estado del esquema: consultarlo (sección 12) o leer las migraciones.

## 4. Caché: arquitectura

### 4.1 Separar estado de servidor y estado de cliente

- **Estado de servidor** (datos que viven en Supabase): caché con claves, vigencia, deduplicación e invalidación. Herramienta recomendada: TanStack Query.
- **Estado de cliente/UI** (filtros, pestaña activa, preferencias, borradores): Zustand.
- Zustand persist **no es una caché de datos del servidor**. No guardar en él listas de estudiantes, calificaciones ni actividades salvo que exista una razón documentada.

Primer paso obligatorio: auditar `package.json` y `src/` para determinar qué existe (`@tanstack/react-query`, SWR, caché manual en stores, servicios con memoización).

- Si ya existe una solución de caché de servidor: usarla, no añadir otra.
- Si no existe: proponer TanStack Query como capa única, con migración incremental por módulo, empezando por los endpoints de mayor volumen (portal del estudiante, listado de estudiantes, actividades). No migrar todo en un solo cambio.
- Nunca instalar dos bibliotecas de caché de servidor.

### 4.2 Claves de caché

Fábrica centralizada de claves, jerárquica y siempre con alcance de tenant:

```ts
// src/lib/queryKeys.ts
export const qk = {
  centro: (centroId: string) => ['centro', centroId] as const,
  cursos: (centroId: string, periodoId: string) =>
    [...qk.centro(centroId), 'cursos', periodoId] as const,
  estudiantes: (centroId: string, cursoId: string) =>
    [...qk.centro(centroId), 'curso', cursoId, 'estudiantes'] as const,
  actividades: (centroId: string, cursoId: string, asignaturaId: string, periodoId: string) =>
    [...qk.centro(centroId), 'curso', cursoId, 'asig', asignaturaId, 'periodo', periodoId, 'actividades'] as const,
  calificaciones: (cursoId: string, actividadId: string) =>
    ['calificaciones', cursoId, actividadId] as const,
};
```

Reglas:

- Toda clave incluye los identificadores que cambian el resultado (centro, curso, asignatura, período, usuario si la RLS depende de él).
- Prohibido usar claves con strings sueltos o interpolados a mano.
- Dos usuarios distintos nunca comparten entradas de caché cuando la RLS les devuelve datos distintos.
- En logout, cambio de usuario o cambio de centro: `queryClient.clear()` y limpieza de cualquier almacenamiento persistido.

### 4.3 Políticas por tipo de dato

Los valores son punto de partida. Medir el comportamiento real de cada módulo antes de fijarlos.

| Dato | staleTime inicial | gcTime | Invalidación | Notas |
|---|---|---|---|---|
| Competencias, indicadores, contenidos curriculares | 24 h o más | 7 días | Solo por cambio de versión curricular | Candidatos a persistencia selectiva |
| Cursos, asignaturas, períodos | 10 a 30 min | 1 h | Al crear, editar o archivar | |
| Estudiantes por curso | 5 a 10 min | 30 min | Al matricular, retirar o editar | Clave por curso |
| Actividades | 2 a 5 min | 30 min | Selectiva por curso y asignatura | |
| Calificaciones | 0 a 30 s | 5 min | Inmediata tras escritura confirmada | Nunca confiar en dato viejo para calcular |
| Asistencia | 1 a 2 min | 10 min | Selectiva por fecha y curso | |
| Incidencias | 2 min | 10 min | Al modificar | |
| Roles y permisos | No cachear como fuente de verdad | n/a | n/a | El servidor decide. El cliente solo usa el dato para mostrar u ocultar UI |
| Sesión | La gestiona Supabase Auth | n/a | n/a | No duplicar en stores |

Ajustes globales recomendados por defecto: `refetchOnWindowFocus: false` salvo en pantallas donde la frescura sea crítica, `retry` limitado (máximo 2) y sin reintentar errores 4xx (RLS, validación, no autorizado).

### 4.4 Deduplicación y peticiones en curso

- Un solo `queryKey` = una sola petición en vuelo, sin importar cuántos componentes la pidan.
- Si no hay biblioteca de caché, implementar un mapa de promesas en vuelo por clave en el servicio, nunca en el componente.
- Para consumidores múltiples de un mismo dato, un hook único por recurso (`useEstudiantes(cursoId)`), no consultas ad hoc en cada componente.
- Prefetch solo de lo que el usuario con alta probabilidad usará a continuación, y solo si cuesta menos que lo que ahorra.

### 4.5 Persistencia selectiva

- Persistir solo datos estables, de bajo riesgo y no sensibles (currículo, catálogos).
- Usar `partialize` en Zustand y un `dehydrateOptions.shouldDehydrateQuery` con lista blanca en React Query. **Lista blanca, no lista negra.**
- Siempre definir `version` y `migrate` (Zustand) o `buster` (React Query) para invalidar al cambiar el esquema de datos.
- Definir `maxAge` explícito.
- Prohibido persistir en localStorage: calificaciones, datos personales de estudiantes, tokens, información de otros centros. En dispositivos compartidos (portal del estudiante) no persistir nada sensible.
- Tamaño: vigilar el límite de localStorage (~5 MB). Si un dato lo aproxima, usar IndexedDB o no persistirlo.
- Hidratar sin provocar una cascada de peticiones al arrancar.

## 5. Escrituras e invalidación

### 5.1 Matriz de invalidación

Cada mutación documenta qué claves toca. Plantilla:

| Mutación | Actualiza localmente | Invalida |
|---|---|---|
| Crear actividad | Añadir a lista de actividades del curso y asignatura | Resumen de período del curso |
| Guardar calificación | Fila del estudiante en la actividad | Promedio del estudiante, resumen del curso, boletín |
| Marcar asistencia | Celda del día | Resumen mensual del curso |
| Matricular estudiante | Lista de estudiantes del curso | Resúmenes de curso, asistencia |

Invalidar por prefijo de clave jerárquica, nunca `invalidateQueries()` global.

### 5.2 Actualización optimista

Solo cuando sea segura (acción idempotente, bajo riesgo de rechazo por RLS o validación). Obligatorio:

1. `onMutate`: cancelar consultas en curso de esa clave y guardar el estado previo.
2. `onError`: revertir al estado previo.
3. `onSettled`: reconciliar con el servidor solo la clave afectada.

**Calificaciones**: no mostrar como "guardado" hasta confirmar persistencia real (respuesta con la fila escrita o relectura puntual). Mostrar estado intermedio ("guardando") y error visible si falla.

### 5.3 Integridad de las escrituras

- Operaciones idempotentes: `upsert` con `onConflict` sobre una restricción única real, no insertar y luego comprobar.
- Escribir solo si el valor cambió (comparar antes con el estado local). Evitar UPDATE con valores idénticos: en PostgreSQL cada UPDATE crea una nueva versión de fila (MVCC), aunque el valor no cambie. Eso genera escritura en disco, bloat y trabajo de autovacuum.
- Agrupar escrituras múltiples en una sola llamada (`upsert` con arreglo o RPC), con tamaño de lote acotado.
- Debounce de guardados por edición continua (por ejemplo, notas escritas en un campo). Guardar al blur o tras pausa, no por tecla.
- Control de concurrencia en calificaciones: columna `updated_at` o versión y escritura condicional (`.eq('updated_at', valorLeido)`), o una RPC con bloqueo optimista. Si hay conflicto, avisar al usuario, no sobrescribir en silencio.
- Reintentos: backoff exponencial con jitter, máximo acotado, clave de idempotencia. Nunca reintento infinito.
- Una operación fallida no deja residuos en caché ni en el store.

## 6. Consultas Supabase

### 6.1 Reglas obligatorias

- Columnas explícitas. `select('*')` prohibido salvo justificación escrita.
- Filtrar en PostgreSQL, no en JavaScript. Si se filtra en cliente un resultado traído completo, es defecto.
- Siempre `limit` o paginación en listas que puedan crecer.
- Cero consultas dentro de bucles (N+1). Alternativas: `.in('id', ids)`, relaciones embebidas de PostgREST (`select('id, estudiantes(id, nombre)')`) o una RPC.
- Evitar embebidos profundos sin necesidad: cada nivel multiplica el trabajo y las filas.
- Cero consultas ejecutadas por renderizado. Toda consulta vive en un hook con caché o en un handler de evento.
- Reutilizar servicios existentes antes de escribir uno nuevo.

### 6.2 Paginación

- Listas grandes (estudiantes de un centro, historiales, incidencias): **paginación por cursor (keyset)** sobre una columna indexada y única, por ejemplo `(created_at, id)`. `range()` con offset grande obliga a PostgreSQL a leer y descartar filas.
- Listas pequeñas y acotadas por curso (estudiantes de un curso): una sola consulta sin paginar es aceptable.

### 6.3 Conteos

- `count: 'exact'` recorre filas coincidentes. En tablas grandes usar `count: 'estimated'` o `'planned'`, o mantener un contador derivado, siempre que la exactitud no sea requisito funcional.
- Pedir `head: true` cuando solo se necesita el conteo.
- Nunca traer toda la tabla para contar en cliente.

### 6.4 RPC y vistas

- Pantallas que hoy hacen 3 o más peticiones para armar una vista (portal del estudiante, boletín, resumen de curso) son candidatas a **una RPC** que devuelva el agregado necesario en una sola ida y vuelta.
- Las funciones RPC deben respetar RLS. Si usan `SECURITY DEFINER`, es obligatorio fijar `search_path`, validar `auth.uid()` y el centro dentro de la función, y justificar el uso por escrito. Preferir `SECURITY INVOKER` (por defecto) siempre que sea posible.
- Marcar `STABLE` o `IMMUTABLE` donde corresponda, para que el planificador pueda optimizar.
- Las vistas heredan la seguridad del propietario salvo que se cree con `security_invoker = true`. Verificar antes de exponer una vista.

### 6.5 Cliente Supabase

- Una sola instancia de `createClient` por aplicación.
- Para código servidor o Edge Functions con muchas conexiones directas, usar el pooler (Supavisor) en modo transacción. Con el cliente JS y PostgREST la conexión ya está agrupada, pero las Edge Functions o scripts que abran conexiones Postgres directas no.
- No hacer `getSession()` o `getUser()` repetidos por componente. `getUser()` consulta al servidor de Auth. Obtener la sesión una vez y suscribirse a `onAuthStateChange`, con limpieza del listener.

## 7. Disk IO: protocolo específico

Supabase aplica presupuesto de IO según el tamaño de cómputo. Agotarlo degrada toda la base. Esta sección es prioritaria.

### 7.1 Principio

Disk IO depende de **lecturas que no salen de la memoria caché de PostgreSQL** y de **escrituras** (datos, WAL, checkpoints, autovacuum). Reducir peticiones ayuda, pero no es suficiente: una sola consulta con escaneo secuencial sobre una tabla grande cuesta más que cien consultas por índice.

### 7.2 Diagnóstico (solo lectura, seguro)

Ejecutar en este orden y guardar los resultados como línea base:

```sql
-- 1) Consultas más costosas por tiempo total (requiere pg_stat_statements)
select
  left(query, 120) as query,
  calls,
  round(total_exec_time::numeric, 0) as total_ms,
  round(mean_exec_time::numeric, 2) as mean_ms,
  rows,
  shared_blks_read,
  shared_blks_hit,
  shared_blks_dirtied,
  shared_blks_written
from pg_stat_statements
order by (shared_blks_read + shared_blks_written + shared_blks_dirtied) desc
limit 25;
```

```sql
-- 2) Ratio de aciertos de caché por tabla (objetivo: > 99% en tablas calientes)
select
  relname,
  heap_blks_read,
  heap_blks_hit,
  round(100.0 * heap_blks_hit / nullif(heap_blks_hit + heap_blks_read, 0), 2) as hit_pct
from pg_statio_user_tables
order by heap_blks_read desc
limit 20;
```

```sql
-- 3) Escaneos secuenciales sobre tablas grandes
select
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup
from pg_stat_user_tables
where seq_scan > 0
order by seq_tup_read desc
limit 20;
```

```sql
-- 4) Tablas con más escrituras y filas muertas (bloat y presión de autovacuum)
select
  relname,
  n_tup_ins,
  n_tup_upd,
  n_tup_hot_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_autovacuum,
  last_autoanalyze
from pg_stat_user_tables
order by (n_tup_upd + n_tup_ins + n_tup_del) desc
limit 20;
```

```sql
-- 5) Índices sin uso (candidatos a revisión, NO borrar sin análisis)
select
  s.relname as tabla,
  s.indexrelname as indice,
  s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as tamano
from pg_stat_user_indexes s
join pg_index i on i.indexrelid = s.indexrelid
where s.idx_scan = 0
  and not i.indisunique
  and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc;
```

```sql
-- 6) Claves foráneas sin índice de apoyo
select
  c.conrelid::regclass as tabla,
  c.conname as fk,
  a.attname as columna
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
where c.contype = 'f'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid
      and (i.indkey::int2[])[0] = any(c.conkey)
  )
order by 1;
```

Complementar con los **Advisors de Supabase** (rendimiento y seguridad) y el **Query Performance** y **Observability** del dashboard. Las consultas 5 y 6 son orientativas: confirmar con el plan de ejecución antes de actuar.

Lectura de resultados:

- `hit_pct` bajo en tablas pequeñas y calientes: el cómputo tiene poca memoria o hay escaneos que expulsan datos útiles.
- `n_tup_upd` alto con `n_tup_hot_upd` bajo: las actualizaciones tocan columnas indexadas o no hay espacio en la página. Candidato a `fillfactor` menor y a revisar qué columnas indexadas se actualizan.
- `n_dead_tup` alto de forma sostenida: autovacuum no da abasto o hay transacciones largas que lo bloquean.
- `seq_scan` alto con `n_live_tup` grande: falta índice o la consulta no es sargable (función sobre la columna, `LIKE '%x'`, cast implícito).

### 7.3 Fuentes típicas de Disk IO en CIELO (revisar primero)

1. `perfiles.last_seen` (ver sección 8).
2. Guardados de calificaciones por tecla o por celda sin agrupar.
3. Asistencia marcada celda por celda en lugar de por lote.
4. Listados sin filtro de centro, curso o período que escanean tablas completas.
5. Políticas RLS con subconsultas evaluadas por fila.
6. Refetch automático por foco de ventana, reconexión o montaje repetido.
7. Suscripciones Realtime que provocan recargas completas.
8. Edge Functions o cron que recorren tablas enteras.
9. Tablas de auditoría o logs con escritura por evento sin retención.
10. Índices redundantes que encarecen cada INSERT y UPDATE.

### 7.4 Medidas de reducción (ordenadas por riesgo creciente)

1. Reducir peticiones y columnas en cliente (caché, deduplicación, `select` acotado).
2. Evitar escrituras sin cambio real.
3. Throttle y condición en escrituras periódicas.
4. Agrupar escrituras.
5. Añadir o corregir índices con evidencia de plan.
6. Reescribir políticas RLS con el patrón de subconsulta única (sección 11).
7. Retención y limpieza de tablas de log o auditoría, por lotes pequeños y fuera de hora pico.
8. Ajustes de `fillfactor` y autovacuum por tabla, con análisis.
9. Subir el tamaño de cómputo de Supabase. Es una decisión del propietario, con costo, y se recomienda **después** de agotar las medidas anteriores, no en lugar de ellas.

Medidas 7 a 9 requieren aprobación explícita del usuario.

## 8. Control de escrituras automáticas

Prohibido:

- UPDATE en cada renderizado o en cada cambio de ruta.
- Escrituras de valores idénticos.
- Polling que escriba.
- Procesos sin límite ni condición de parada.
- Escrituras provocadas por lecturas.
- Actualizaciones masivas sin lote ni justificación.

### `perfiles.last_seen`

No modificar su frecuencia sin analizar autenticación, seguridad y operación. Patrón seguro a evaluar:

- Cliente: throttle (por ejemplo, una vez cada 5 a 15 min por sesión, al iniciar y con actividad real, no por navegación), con timestamp local para no repetir.
- Servidor: escritura condicional para que PostgreSQL no cree versión nueva cuando el cambio es irrelevante:

```sql
update perfiles
set last_seen = now()
where id = (select auth.uid())
  and (last_seen is null or last_seen < now() - interval '10 minutes');
```

- Verificar antes: qué funciones, reportes o reglas de seguridad dependen de `last_seen` y con qué precisión necesitan el valor. Si nadie requiere precisión de minutos, el intervalo puede ser mayor.
- Si `last_seen` está en una tabla ancha y caliente, evaluar moverlo a una tabla estrecha dedicada (menos bloat por actualización). Es un cambio de esquema: requiere plan y aprobación.
- Verificar impacto con la consulta 4 (sección 7.2) antes y después.

## 9. React

Auditar en cada cambio:

- `useEffect`: dependencias completas y estables. Un objeto o función creado en cada render como dependencia causa bucles de peticiones.
- Datos en efectos: **no hacer `fetch` dentro de `useEffect` si existe capa de caché**. Usar el hook de consulta.
- StrictMode: en desarrollo monta los efectos dos veces. Los efectos deben ser idempotentes y con limpieza. Una petición duplicada solo en desarrollo es esperada. Si se duplica en producción, es defecto.
- Limpieza obligatoria: `removeEventListener`, `clearInterval` y `clearTimeout`, `unsubscribe` y `removeChannel` de Realtime, cancelación de peticiones.
- `AbortController` o `signal` en peticiones cancelables al desmontar o cambiar parámetros (supabase-js admite `.abortSignal(signal)`).
- `useMemo` y `useCallback`: solo donde estabilicen una dependencia o eviten un cálculo caro medido. No añadirlos por costumbre.
- Selectores de Zustand: suscribirse a la porción mínima (`useStore(s => s.x)`, con `useShallow` para objetos). Suscribirse al store entero provoca renders por cualquier cambio.
- Listas largas (cientos de estudiantes): virtualización o paginación en el cliente.
- Carga diferida de rutas y de módulos pesados (`React.lazy`). Prefetch de una ruta no debe disparar sus consultas.
- Navegar repetidamente entre módulos no debe acumular listeners, temporizadores ni suscripciones.

## 10. Realtime

Por defecto **no** se usa Realtime. Se introduce solo si hay un requisito funcional de actualización inmediata multiusuario que la caché no cubra.

Si se justifica:

- Un canal por contexto (curso, no por estudiante) y reutilizado por todos los componentes interesados.
- Filtros del lado servidor (`filter: 'curso_id=eq.X'`), nunca recibir todo y filtrar en cliente.
- Al recibir un evento, parchear el registro afectado en la caché. No recargar la tabla.
- Limpieza en desmontaje y al cambiar de contexto. Verificar que no hay canales duplicados.
- Respetar RLS: Realtime con Postgres Changes aplica RLS, pero evaluar el costo en cada evento con muchos suscriptores. Evaluar Broadcast para señales ligeras.
- Medir: número de conexiones simultáneas y mensajes por segundo esperados con el volumen real de usuarios.

## 11. PostgreSQL, índices y RLS

### 11.1 Índices

Antes de crear uno:

1. Listar los existentes de la tabla (`\d tabla` o `pg_indexes`).
2. Identificar la consulta exacta que lo necesita y su frecuencia.
3. Ver el plan: `EXPLAIN (ANALYZE, BUFFERS)` en un entorno seguro (en producción, solo sobre consultas de lectura y con cuidado. `ANALYZE` ejecuta la consulta de verdad, y nunca sobre DML sin transacción con `ROLLBACK`).
4. Elegir tipo y forma: B-tree compuesto con orden de columnas por igualdad primero y rango después, índice parcial (`where activo`) si la mayoría de filas no se consulta, `INCLUDE` para cobertura (index-only scan) cuando compense, GIN para `jsonb` o arreglos, BRIN para tablas enormes ordenadas por tiempo.
5. Estimar costo de escritura: cada índice se actualiza en cada INSERT, y en cada UPDATE que toque sus columnas (además de impedir HOT updates).
6. Crear con `create index concurrently` en producción, fuera de transacción, para no bloquear escrituras.
7. Verificar que el planificador lo usa y que la métrica objetivo mejoró.
8. Justificar por escrito y registrar el nombre con convención consistente.

Reglas adicionales:

- Índices en columnas de claves foráneas que se usan en JOIN, en filtros o en cascadas de borrado.
- Índices en las columnas que usan las políticas RLS (`centro_id`, `usuario_id`, `curso_id`). Es frecuente que la causa de lentitud sea la ausencia de ellos.
- Sin índices duplicados ni prefijos redundantes (un índice `(a, b)` hace innecesario uno `(a)`).
- Detectar consultas no sargables: `where lower(col) = ...` sin índice funcional, `col::text`, `like '%x%'` (usar `pg_trgm` si es necesario).
- Mantener estadísticas al día: `analyze` tras cargas masivas.
- **Prohibido sin análisis, plan y aprobación explícita**: `VACUUM FULL` (bloquea la tabla y reescribe todo), `REINDEX` masivo, `CLUSTER`, `ALTER TABLE` que reescriba la tabla, `DROP INDEX` basado solo en `idx_scan = 0`.

### 11.2 RLS

La seguridad prevalece sobre cualquier optimización.

Obligatorio:

- **Nunca** desactivar RLS ni conceder `bypassrls` por rendimiento.
- Revisar las políticas existentes antes de crear nuevas.
- Evitar políticas permisivas duplicadas para el mismo rol y comando: PostgreSQL evalúa todas y las combina con OR.
- Envolver las funciones de contexto en una subconsulta para que se evalúen una vez por consulta y no por fila:

```sql
-- Mal: se evalúa por fila
using (usuario_id = auth.uid())

-- Bien: se evalúa una vez (initPlan)
using (usuario_id = (select auth.uid()))
```

- Para relaciones (docente-curso, tutor, co-docente, administrador de centro), usar una función auxiliar `STABLE` y `SECURITY DEFINER` con `search_path` fijo, que devuelva los identificadores autorizados, y consultarla con `in (select ...)`. Evita subconsultas correlacionadas por fila. Validar que la función no filtra datos de otro centro.
- Cada política y cada función auxiliar debe poder evaluarse con índices sobre sus columnas.
- Especificar `to authenticated` (o el rol exacto) en cada política. No dejar `public` implícito.
- Autorización siempre en servidor. La caché del navegador y los stores solo afectan la interfaz.
- Roles y permisos en `app_metadata` o tablas del servidor, nunca en `user_metadata` (el usuario puede modificarlo).
- Probar cada cambio de política con al menos estos casos: docente del curso, docente de otro curso, docente de otro centro, tutor, co-docente, administrador, estudiante propio, estudiante ajeno, usuario anónimo. Todos deben dar el resultado esperado. Usar `set local role authenticated; set local request.jwt.claims = '...'` dentro de una transacción con `rollback`.
- Las tablas nuevas nacen con RLS activado y políticas explícitas. Una tabla en `public` sin RLS está expuesta por la API.

## 12. Migraciones y cambios de esquema

- Todo cambio de esquema va en una migración versionada, reversible cuando sea posible, con su plan de reversión documentado.
- Probar primero en una rama de Supabase o en un entorno de desarrollo. No experimentar en producción.
- Evitar operaciones que bloqueen tablas grandes en horario de uso (`ALTER TABLE ... ADD COLUMN ... DEFAULT` con valor volátil, cambios de tipo, `ADD CONSTRAINT` sin `NOT VALID` y posterior `VALIDATE`).
- Cambios en dos fases (expandir y contraer): añadir, migrar datos por lotes, cambiar el código, retirar lo antiguo después.
- Datos en lote: transacciones cortas y por tramos, nunca una transacción de larga duración (retiene autovacuum y bloqueos).
- Confirmar el esquema real consultándolo (`information_schema`, `pg_indexes`, `pg_policies`) y no suponerlo.
- Tras la migración, regenerar tipos de TypeScript si el proyecto los usa.

## 13. Edge Functions y procesos programados

Cada función:

- Valida entradas (esquema, tamaño, tipos) y autentica al llamador. Verifica el JWT y los permisos dentro de la función.
- Usa el cliente con el JWT del usuario cuando deba respetar RLS. Usa `service_role` solo cuando sea imprescindible y nunca la expone al cliente.
- Consulta solo lo necesario, con columnas y límites. Sin N+1.
- Define timeout y cancelación. Sin reintentos infinitos. Reintentos con backoff, jitter e idempotencia.
- Controla concurrencia (límite de trabajos simultáneos) y evita ejecuciones duplicadas (clave de idempotencia o bloqueo consultivo `pg_try_advisory_lock`).
- Procesa por lotes con cursor, no cargando tablas enteras en memoria.
- Devuelve solo los datos necesarios, con códigos HTTP correctos y errores sin filtrar información interna.
- No registra datos personales ni credenciales.

Procesos programados (cron, `pg_cron`): justificar la frecuencia, estimar su costo por ejecución, evitar solapamiento con la ejecución anterior y programar tareas pesadas fuera del horario escolar.

## 14. Concurrencia y escalabilidad

Evaluar cada cambio con el multiplicador real:

```
peticiones por pantalla × usuarios simultáneos × frecuencia de refresco
```

Ejemplo: 5 peticiones al abrir el portal × 1.000 estudiantes = 5.000 peticiones en la ventana de apertura (por ejemplo, al publicar calificaciones). Objetivo: reducirlo a 1 petición por estudiante, o menos con caché compartida segura.

Herramientas, en este orden de preferencia:

1. Eliminar la petición.
2. Reutilizar caché válida.
3. Combinar en una RPC.
4. Reducir columnas y filas.
5. Carga diferida (solo cuando se ve).
6. Caché compartida **solo para datos idénticos para todos** (por ejemplo, currículo o catálogos públicos del centro). Nunca para datos que dependen del usuario.
7. Escalonar tareas masivas.

Presupuesto de peticiones sugerido por pantalla (ajustar con datos reales):

| Pantalla | Peticiones iniciales objetivo |
|---|---|
| Portal del estudiante | 1 a 2 |
| Listado de curso | 1 a 3 |
| Registro de calificaciones | 2 a 4 |
| Navegación entre módulos con datos ya cargados | 0 |

Una pantalla que supere su presupuesto exige justificación.

## 15. Protección de la información académica

AGUA no puede alterar, ni siquiera indirectamente:

- Cálculo de calificaciones y promedios.
- Competencias fundamentales y específicas.
- Indicadores de logro y relación actividad-indicador.
- Productos finales y recuperación pedagógica.
- Ponderaciones y períodos académicos.
- Relaciones entre cursos y asignaturas.

Controles:

- Si una optimización toca código que participa en un cálculo, escribir antes una **prueba de caracterización** con casos reales (entradas y salidas actuales) y comprobar que el resultado es idéntico antes y después.
- Los cálculos usan datos confirmados, no entradas de caché potencialmente viejas. Si se calcula desde caché, la caché de las entradas debe haberse invalidado tras cualquier escritura relacionada.
- Un redondeo, un orden o una agregación distinta es un cambio funcional.
- Aplicar la lógica en un solo lugar (servidor o utilidad compartida). Evitar duplicarla entre cliente y SQL sin pruebas que garanticen equivalencia.

## 16. Protocolo ANTES de modificar (modo PREVENTIVO)

Completar esta ficha. Si algún punto no se puede responder, leer más código antes de seguir.

```
FICHA DE IMPACTO AGUA
Cambio: <descripción en una línea>
Archivos implicados: <lista>
Servicios, hooks y stores reutilizables encontrados: <lista>
Consultas implicadas (tabla, columnas, filtros, límite): <lista>
Caché existente y claves que se verán afectadas: <lista>
Lecturas nuevas: <ninguna | detalle y frecuencia esperada>
Escrituras nuevas: <ninguna | detalle, frecuencia, ¿idempotente?>
Impacto estimado en Disk IO: <ninguno | bajo | medio | alto, y por qué>
Multiplicador de concurrencia: <peticiones × usuarios × frecuencia>
CPU y memoria (cliente y servidor): <nota>
Políticas RLS y funciones de autorización implicadas: <lista>
Datos o cálculos académicos tocados: <ninguno | detalle>
Riesgos: <lista>
Plan de validación: <comandos, pruebas, casos RLS>
Plan de reversión: <cómo deshacer>
```

Detener y pedir confirmación al usuario antes de:

- Crear, modificar o eliminar políticas RLS, funciones `SECURITY DEFINER` o permisos.
- Cambios de esquema (tablas, columnas, índices en tablas grandes).
- Operaciones masivas sobre datos (UPDATE o DELETE sin `WHERE` acotado, backfills).
- Operaciones pesadas (`VACUUM FULL`, `REINDEX`, `CLUSTER`).
- Cambiar la frecuencia de `last_seen` o de cualquier proceso automático.
- Instalar dependencias nuevas.
- Subir el tamaño de cómputo de Supabase.

Todo cambio en base de datos se prueba antes en un entorno no productivo cuando exista.

## 17. Protocolo DESPUÉS de modificar (modo VERIFICACIÓN)

Ejecutar y reportar el resultado real. No declarar éxito sin evidencia.

1. `npm run build` sin errores.
2. `npx tsc --noEmit` sin errores.
3. Lint (`npm run lint`) y pruebas (`npm test`) si existen.
4. Inspección de cada consulta nueva o modificada: columnas, filtros, límite, índices disponibles, ausencia de N+1.
5. Inspección de efectos, listeners, timers y suscripciones: dependencias y limpieza.
6. **Conteo de peticiones**: abrir la pantalla afectada con la pestaña Network del navegador y contar peticiones a Supabase en: carga inicial, navegación ida y vuelta, segunda visita (debe salir de caché) y tras una mutación (solo las invalidaciones previstas). Comparar con la línea base.
7. Comprobar que no hay peticiones repetidas por renderizado ni peticiones duplicadas en producción (en desarrollo, StrictMode puede duplicar).
8. Si hubo cambios de SQL: `EXPLAIN (ANALYZE, BUFFERS)` de la consulta afectada antes y después, y casos de prueba de RLS (sección 11.2).
9. Si se tocó un cálculo académico: prueba de caracterización idéntica.
10. Si se tocó una escritura: verificar que un fallo no deja datos en caché, que un reintento no duplica y que no se confirma antes de persistir.

### Informe de validación

```
INFORME AGUA
Resultado: <APROBADO | APROBADO CON OBSERVACIONES | RECHAZADO>
Build: <ok | error>   TypeScript: <ok | error>   Lint/Tests: <ok | n/a | error>
Peticiones antes → después: <n → n> por escenario
Escrituras antes → después: <n → n>
Planes de ejecución: <resumen o n/a>
Pruebas RLS: <casos y resultado o n/a>
Cálculos académicos: <idénticos | n/a>
Pendientes y riesgos residuales: <lista>
```

Si el resultado no se puede medir (sin acceso a la base, sin Network), decirlo explícitamente en lugar de suponerlo.

## 18. Antipatrones (rechazar en revisión)

- `select('*')` en una lista.
- Consulta dentro de `map`, `forEach` o `for`.
- `fetch` o `supabase.from` directamente en el cuerpo de un componente o en un `useEffect` con dependencias inestables.
- Filtrado en JavaScript de datos que PostgreSQL pudo filtrar.
- `invalidateQueries()` sin clave.
- Guardar en Zustand persist datos del servidor sin `partialize`.
- Claves de caché sin centro, curso o usuario.
- Guardado por tecla sin debounce.
- UPDATE sin comprobar si el valor cambió.
- Polling con `setInterval` sin limpieza.
- Suscripción Realtime sin `removeChannel`.
- Política RLS con `auth.uid()` sin `(select ...)`.
- Índice añadido sin plan que lo respalde.
- Confirmación visual de una calificación antes de la persistencia.
- `service_role` accesible desde el cliente.
- Optimización que cambia el redondeo o el orden de un cálculo.

## 19. Principios de comunicación del agente

- Decir qué se midió y qué se asumió. Distinguir hecho, hipótesis y recomendación.
- Priorizar hallazgos: **Crítico** (riesgo de seguridad, pérdida de datos o agotamiento de Disk IO), **Alto**, **Medio**, **Bajo**.
- Proponer el cambio mínimo que logre el objetivo. Evitar refactors amplios no pedidos.
- Si una instrucción del usuario contradice AGUA, avisar del riesgo con datos y dejar que el usuario decida. La seguridad de datos y la exactitud académica no se negocian en silencio.
- Reportar con brevedad: qué cambió, por qué, cómo se validó y qué queda pendiente.

