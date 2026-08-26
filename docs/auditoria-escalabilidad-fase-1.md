# Auditoría de Escalabilidad CIELO — Fase 1

> **Fecha:** 2026-08-24 · **Alcance:** Diagnóstico de solo lectura. **Ningún cambio fue ejecutado ni implementado.**
>
> Prioridad declarada por el propietario del proyecto:
> **PRESERVAR EL FUNCIONAMIENTO ACTUAL DE CIELO > ESCALABILIDAD > OPTIMIZACIÓN.**

---

## 1. Objetivo

Mejorar la escalabilidad de CIELO **preservando completamente las funcionalidades existentes**. Esta primera fase determina si la base de datos cuenta con los índices necesarios y si los riesgos de escalabilidad descritos en auditorías anteriores son reales, **sin modificar nada**: ni React, ni TypeScript, ni Zustand, ni `useSupabaseData.ts`, ni RLS, ni Realtime, ni consultas, ni tablas.

CIELO funciona correctamente hoy. Este documento no propone implementar nada; solo documenta evidencia y clasifica opciones futuras.

---

## 2. Estado actual de la arquitectura

| Componente | Versión / Estado | Fuente |
|---|---|---|
| React | ^19.2.0 | package.json (comprobado) |
| TypeScript | ~5.9.3 | package.json (comprobado) |
| Zustand | ^5.0.13 — store único `src/store/appStore.ts` (165 líneas, patrón snapshot derivado) | comprobado |
| Supabase JS | ^2.105.1 (`@supabase/supabase-js`) | comprobado |
| Base de datos | PostgreSQL gestionado (proyecto `sgjnactnhmpmbbgexcox` — "Noether Thinkers") | supabase/.temp/linked-project.json |
| Vite | v7 (build verificado: bundle JS **1,443.89 kB**, gzip ≈ **388 kB**) | salida de `npm run build` |
| Tailwind | ^4.2.1 | comprobado |

### Carga inicial de datos (`useSupabaseData.ts`, 760 líneas)

- Patrón **fase 1 / fase 2** con `Promise.all` de consultas `select('*')` **sin filtros SQL en el cliente**: el filtrado por usuario recae íntegramente en **RLS**.
- Fase 1 (contexto base): `perfiles` (con **un único JOIN relacional embebido**: `centros!perfiles_centro_id_fkey`), `centro_roles`, `cursos`, `curso_docentes` (único `.eq('activo', true)`), `suscripciones`, `historial_colaboradores`.
- Fase 2: `estudiantes`, `grupos`, `secuencias`* , `criterios_cotejo`, `descriptores_rubrica`, `niveles_puntaje`, `plantillas`, `curso_detalle`, `eventos`, `posts`, `tareas_institucionales`, `tarea_docente`, `registro_imagenes`, `calendario_minerd`.
- `calificaciones`, `recuperaciones`, `incidencias` y `registros_anecdoticos` **no** se cargan en este hook: se cargan desde hooks/componentes de evaluación (comprobado por ausencia en `.from()` de `useSupabaseData.ts`).
- Total `.from()` en el hook principal: **19**. En todo `src/`: ~30 tablas distintas consultadas al menos una vez.

\* La presencia exacta de `secuencias` dentro de las fases corresponde al análisis estático; el orden puede variar entre fases.

### Paginación

- `.range()`: **0 ocurrencias** en todo `src/` (**comprobado**). No hay paginación server-side.
- `.limit()` en cargas principales: no detectado en el hook principal (No determinado todavía para componentes secundarios).

---

## 3. Consultas detectadas

Análisis estático de `src/**/*.ts(x)` (comprobado por búsqueda de patrones):

### Agregación de filtros `.eq('columna')`

| Columna | Ocurrencias | Uso típico |
|---|---|---|
| `id` | 22 | updates/deletes puntuales |
| `user_id` | 9 | perfiles, notificaciones, plantillas |
| `activo` | 4 | `curso_docentes.activo = true` |
| `curso_id` | 2 | puntual |
| `centro_id` | 2 | puntual |
| `docente_id` | 2 | puntual |
| otras (`leida`, `archivado`, `grado`, `seccion`, `asignatura`, `tarea_id`…) | 1–2 c/u | puntual |

### Otros operadores

- `.in('columna')`: `curso_id` ×2, `id` ×2 — uso marginal.
- `.order()`: `created_at` ×3, `id` ×2, `nombre` ×1, `fecha` ×1.
- `.range()`: **0**.
- JOINs relacionales embebidos (`select("a(...)")`): **1** en todo el cliente — `perfiles → centros!perfiles_centro_id_fkey`.

**Conclusión clave:** el cliente casi nunca filtra por `curso_id`, `estudiante_id` o `actividad_id`. El volumen de trabajo de esas columnas ocurre **dentro de RLS** y en cláusulas `match()` de updates/deletes. Por tanto, la utilidad de índices sobre esas FK depende más de RLS y de escrituras que de filtros explícitos del cliente.

### RPC detectadas (7)

`aplicar_vinculo_usuario`, `crear_tarea_institucional`, `validar_codigo_usuario`, `centro_tiene_suscripcion_institucional`, `crear_plantilla`, `reset_user_school_year`, `cambiar_centro_vinculado`.

---

## 4. RLS

Estado: **no modificado**. Lo siguiente proviene exclusivamente de los archivos SQL del repositorio (~50 migraciones); **el estado real de las políticas en la base de datos no ha sido confirmado aún** (requiere Bloque 5 de las consultas de diagnóstico).

Políticas identificadas en migraciones, agrupadas:

| Grupo | Tablas | Operaciones | Columnas usadas | ¿user_id? | ¿centro_id? | ¿curso_id? | ¿Subconsultas? |
|---|---|---|---|---|---|---|---|
| «Gestión propia» | calificaciones, recuperaciones, estudiantes, actividades, cursos, secuencias, eventos, incidencias, evaluaciones_*, criterios_cotejo, descriptores_rubrica, niveles_puntaje, plantillas, posts… | SELECT/INSERT/UPDATE/DELETE | `user_id = auth.uid()` | Sí | No | No | No |
| Genérico dinámico | varias (loop DO con `%I`) | CRUD | `user_id` | Sí | No | No | No |
| Lectura pública/compartida | posts, plantillas, descriptores_rubrica, historial_colaboradores, docentes | SELECT | visibilidad compartida | Indirecto | No | No | **Sí** (EXISTS contra tablas de colaboración) |
| Colaboración centros | centros, centro_roles, codigos_acceso_centro, tareas_institucionales | SELECT/UPDATE | vinculación usuario↔centro | Sí | **Sí** | No | **Sí** (verificación de rol/vínculo) |
| Perfil propio | perfiles | CRUD | `id/user_id = auth.uid()` | Sí | No | No | No |
| Directores | centros | UPDATE | rol director | Sí | Sí | No | Sí |

**Impacto de rendimiento potencial (hipótesis razonada, no medida):**
- Las políticas «Gestión propia» filtran por `user_id`: **ya existen índices declarados** en migraciones para 9 tablas principales (ver §6).
- Las políticas con **subconsultas** (compartidos/colaboración) evalúan EXISTS por fila; su coste crece con el tamaño de las tablas intermedias (`historial_colaboradores`, `centro_roles`). Sin confirmar en producción.
- Existen migraciones correctivas históricas (`fix_rls_recursion.sql`) que indican que hubo recursión entre políticas: patrón ya resuelto, pero relevante al evaluar cambios futuros de RLS.

---

## 5. Realtime

Comprobado por lectura directa del código:

| Suscripción | Archivo | Filtro | Callback |
|---|---|---|---|
| 15 tablas: posts, historial_colaboradores, notificaciones, curso_detalle, calificaciones, recuperaciones, curso_docentes, cursos, estudiantes, actividades, grupos, registros_anecdoticos, registro_imagenes, tareas_institucionales, tarea_docente | `useSupabaseData.ts:672–687` | Solo 2 tienen filtro: `notificaciones:user_id=eq.X` y `registros_anecdoticos:profile_id=eq.X`; las demás escuchan **todos los eventos de toda la tabla** | `debouncedFetchData` → **recarga global** de las fases 1+2 |
| posts, historial_colaboradores | `useCommunityData.ts:129–133` | Sin filtro | `fetchData(true)` |
| codigos_acceso_centro | `CentroCodigos.tsx:39` | Por centro (según código) | refetch local |

- Evento utilizado: `'*'` en todas las detectadas.
- **Comprobado:** cualquier INSERT/UPDATE/DELETE en cualquiera de esas tablas (de cualquier usuario del sistema) dispara el callback y una recarga completa de datos en todos los clientes suscritos, porque las suscripciones carecen de filtro y el callback es global.
- **Hipótesis (no medida):** el número exacto de consultas re-ejecutadas por evento depende del debounce implementado y de cuántas fases se re-lanzan. No se afirma una cifra concreta (p. ej., "28 consultas") porque no pudo comprobarse directamente.
- El debounce mitiga tormentas de eventos, pero cada evento que sobrevive al debounce produce refetch global en cada cliente activo.

---

## 6. Índices

> ⚠️ **Estado real de índice no confirmado; requiere ejecución de consulta en Supabase SQL Editor.**
> Todo lo siguiente proviene de los archivos SQL del repositorio. La base de datos real puede diferir.

Índices **declarados en migraciones del repo** (relevantes):

| Tabla | Índice declarado | Nota |
|---|---|---|
| cursos, estudiantes, actividades, calificaciones, secuencias, incidencias, recuperaciones, eventos, docentes, posts | `(user_id)` | soporte directo a políticas RLS «Gestión propia» |
| perfiles | `(centro_id)` | comentario en migración: optimizar joins/queries |
| cursos | `(centro_id)` | idem |
| tareas_institucionales | `(centro_id)`, `(fecha_limite)` | panel institucional |
| tarea_docente | `(tarea_id)`, `(docente_id)`, `(estado)` | |
| tarea_asignaciones | `(tarea_id)`, `(user_id)` | |
| post_likes | `(post_id)` | |
| plantillas | compuesto `(user_id, tipo, activo?)` («idx_plantillas_user_tipo_activas») | definición parcial en migración |
| calendario_minerd | `(rango fechas)`, `(activo)`, `(anio)` | migración reciente |
| recuperacion_tokens / auditoria_recuperacion | token, user_id, parciales temporales | seguridad/auth |

Columnas FK **sin ningún índice declarado en las migraciones del repo** (coincide con la advertencia de la auditoría previa):

| Tabla.Columna | Declarado en migraciones | Uso esperado según código |
|---|---|---|
| calificaciones.curso_id / estudiante_id / actividad_id | ❌ No | updates/deletes con `match()`; RLS por user_id ya cubre el acceso, pero las coincidencias por fila requieren scan |
| estudiantes.curso_id | ❌ No | carga de estudiantes por curso (hoy: fetch total + filtro cliente) |
| actividades.curso_id / secuencia_id | ❌ No | idem |
| curso_detalle.curso_id / estudiante_id / actividad_id | ❌ No | tabla pivote de inscripción; usada en Realtime sin filtro |
| grupos.curso_id, secuencias.* (FK a curso) | Parcial/No determinado todavía | |

### Comparación solicitada

| Tabla | Columna | Foreign Key | Índice existente (según migraciones) | Consulta/RLS que la utiliza | Recomendación |
|---|---|---|---|---|---|
| calificaciones | user_id | sí (auth) | idx_calificaciones_user_id ✔ declarado | RLS «Gestión propia»; realtime sin filtro | Verificar existencia real; mantener |
| calificaciones | curso_id / estudiante_id / actividad_id | sí | **No declarado** | match() en upsert/update/delete; sin filtros GET explícitos | 🟡 Posiblemente útil — prioridad media-baja mientras las cargas sean globales por RLS |
| estudiantes | user_id / curso_id | sí | user_id ✔ / curso_id ❌ | RLS; asignación por curso en cliente | 🟡 curso_id posiblemente útil |
| actividades | user_id / curso_id / secuencia_id | sí | user_id ✔ / resto ❌ | RLS; cliente no filtra por curso en SQL | 🟡 |
| curso_detalle | curso_id / estudiante_id / actividad_id | sí (pivote) | **Ninguno declarado** | Realtime global; vínculos estudiante↔curso↔actividad | 🟡→🟢 si crece el nº de inscripciones |
| perfiles | centro_id | sí | idx_perfiles_centro_id ✔ | JOIN embebido perfiles→centros; políticas de colaboración | Mantener |
| cursos | centro_id | sí | idx_cursos_centro_id ✔ | panel centro | Mantener |
| notificaciones | user_id | sí | No determinado todavía | filtro realtime `user_id=eq.` + lecturas | 🟡 verificar |
| historial_colaboradores | user/centro/curso | No determinado todavía | No determinado todavía | subconsultas RLS compartidas + realtime global | 🔍 verificar en diagnóstico SQL |

---

## 7. Foreign Keys

Clasificación de la evidencia:

- **Comprobada en base de datos:** ninguna todavía (sin acceso directo a catálogos hasta ejecutar las consultas de diagnóstico).
- **Encontrada solamente en migraciones (repo):** referencias a `auth.users(id)` ×15; hacia `centros(id)` ×6; `perfiles(id)`; `plantillas(id)`; `posts(id)` (post_likes/reportes); `secuencias(id)`; `tareas_institucionales(id)` ×4; `tareas(id)`. Incluye la constraint nombrada `perfiles_centro_id_fkey` (usada por el JOIN del cliente — nombre coherente con convención PostgREST).
- **Inferida por el código:** relaciones lógicas usadas por el cliente sin FK visible en los archivos revisados: `calificaciones→(curso, estudiante, actividad)`, `curso_detalle→(curso, estudiante, actividad)`, `grupos→curso`. El JOIN embebido del cliente confirma al menos la FK `perfiles.centro_id → centros.id` **en la base real** (PostgREST solo permite `!fkname` si la relación existe) — esta es la única relación **efectivamente comprobada en producción** por comportamiento observado.

---

## 8. Riesgos actuales

Escala: 🟢 Bajo · 🟡 Moderado · 🟠 Alto · 🔴 Crítico

| Área | Riesgo | Evidencia |
|---|---|---|
| Consultas globales sin filtro SQL (fetch-all por RLS) | 🟠 Alto | Comprobado: `select('*')` sin filtros en hook principal; escala lineal con filas visibles por usuario |
| Ausencia de paginación | 🟠 Alto (a futuro) | Comprobado: 0 usos de `.range()`. Hoy soportable con volúmenes actuales; límite desconocido (No determinado todavía) |
| Realtime sin filtros + recarga global | 🟠 Alto | Comprobado: 13 de 15 suscripciones sin filtro y callback `debouncedFetchData` global |
| Índices FK faltantes (curso/estudiante/actividad/pivote) | 🟡 Moderado | Declarado ausente solo en migraciones; estado real pendiente de confirmar. El cliente apenas consulta por esas columnas hoy |
| RLS con subconsultas de colaboración | 🟡 Moderado | Detectado en migraciones; coste no medido |
| Bundle JS | 🟡 Moderado | Medido: 1.44 MB (≈388 kB gzip), advertencia de chunk >500 kB del propio Vite |
| Zustand snapshot único | 🟢 Bajo | Store de 165 líneas, patrón simple; sin evidencia de problema |
| Almacenamiento (imágenes registro/avatar) | 🟢 Bajo | Sin evidencia de problema en esta fase (No determinado todavía) |
| Generación de boletines | 🟢 Bajo / N/A | No se encontró módulo «boletines» en el código actual; la generación de reportes existente es `incidenciaReport.ts` (PDF de incidencias) |
| Seguridad incidental detectada durante esta auditoría | 🟠 Alto (fuera de alcance) | `server/.env` contiene la `SUPABASE_SERVICE_ROLE_KEY` en texto plano dentro del repo local — **no se modificó nada**; se deja constancia para decisión del propietario |

---

## 9. Cambios recomendados (NO IMPLEMENTADOS)

Solo enumerados y clasificados. Ninguno fue aplicado.

### Prioridad 1 — Bajo riesgo funcional (no deberían alterar comportamiento)
1. Crear índices sobre columnas FK verificadas tras el diagnóstico SQL (p. ej. pivote `curso_detalle` y `calificaciones(curso_id, estudiante_id, actividad_id)`), **solo** las que el Bloque 6 confirme como ausentes y justificadas.
2. Confirmar/crear índices para columnas usadas por RLS que el Bloque 5 muestre sin soporte (`notificaciones.user_id`, `historial_colaboradores.*`).
3. Añadir filtros a suscripciones Realtime donde sea semánticamente posible (p. ej. por `curso_id` cuando el cliente ya conoce los cursos) — cambia alcance de refetch, requiere validar que no rompa actualizaciones cruzadas.

### Prioridad 2 — Requiere pruebas (pueden afectar comportamiento)
1. Introducir `.range()`/paginación incremental en cargas grandes (calificaciones, curso_detalle) manteniendo el snapshot de Zustand.
2. Reducir el refetch global de Realtime a invalidaciones dirigidas.
3. Code-splitting del bundle (dynamic import por pantalla).

### Prioridad 3 — Posponer
1. Migración de arquitectura de datos (React Query, normalización granular del store).
2. Optimizaciones de almacenamiento multimedia.
3. Cualquier cambio en lógica pedagógica, cálculos o competencias.

---

## 10. Cambios que NO recomiendo realizar todavía

- **Migración completa de `useSupabaseData.ts`:** funciona correctamente; reescribirlo arriesga regresiones en todo el sistema por beneficio incierto a corto plazo.
- **Eliminación general de Realtime:** es parte del comportamiento percibido (multi-dispositivo/multi-docente); quitarlo cambia funcionalidad observable.
- **Migración a React Query:** aunque `@tanstack/react-query` ya figura instalado como dependencia, adoptarlo globalmente es un cambio arquitectónico mayor.
- **Cambios importantes de RLS:** las políticas funcionan y hubo episodios de recursión resueltos (`fix_rls_recursion.sql`); tocarlas exige pruebas exhaustivas.
- **Paginación general:** no hay evidencia de dolor actual medido; introducirla masivamente podría alterar vistas que asumen datos completos.
- **Cambios de arquitectura ni de lógica pedagógica** (competencias, rúbricas, cotejos, cálculos de calificaciones): fuera de discusión en esta fase.

CIELO funciona correctamente. Primero deben agotarse las optimizaciones de bajo riesgo (índices y filtros de suscripción), midiendo después.

---

## 11. Próximo paso

El propietario del proyecto ejecutará **manualmente** en el Supabase SQL Editor las consultas de solo lectura del apéndice siguiente, y compartirá los resultados. Con ellos se confirmará el estado real de índices y políticas. **No se realizará ningún cambio hasta recibir y revisar esos resultados.**

---

# Consultas de diagnóstico para Supabase

Exclusivamente `SELECT` contra catálogos del sistema. **No modifican absolutamente nada.** Ejecutar cada bloque como una consulta independiente (el SQL Editor muestra un grid por sentencia) y copiar los resultados.

### 1. Índices existentes

```sql
select tablename as tabla, indexname as indice, indexdef as definicion
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

### 2. Foreign keys existentes

```sql
select tc.table_name as tabla,
       kcu.column_name as columna,
       ccu.table_name as tabla_referenciada,
       ccu.column_name as columna_referenciada
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;
```

### 3. Relación foreign keys ↔ índices (detección automática de huecos)

```sql
with fks as (
    select tc.table_name, kcu.column_name,
           ccu.table_name as ref_tabla
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
),
idx_cols as (
    select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'
)
select f.table_name as tabla,
       f.column_name as columna_fk,
       f.ref_tabla as referencia,
       case when i.indexname is null then 'SIN INDICE' else i.indexname end as indice_encontrado,
       coalesce(i.indexdef, '-') as definicion
from fks f
left join idx_cols i
  on i.tablename = f.table_name
 and i.indexdef ilike '%' || f.column_name || '%'
order by (i.indexname is null) desc, f.table_name, f.column_name;
```

### 4. Políticas RLS

```sql
select tablename as tabla, policyname as politica, cmd as operacion,
       left(qual, 400) as condicion_using,
       left(with_check, 400) as condicion_with_check
from pg_policies
where schemaname = 'public'
order by tablename;
```

### 5. Uso real (índices vs seq_scan) + volumen — opcional pero muy valioso

```sql
select t.relname as tabla,
       s.idx_scan as veces_usado_indice,
       st.seq_scan as veces_seq_scan,
       st.n_live_tup as filas_aprox,
       pg_size_pretty(pg_total_relation_size(st.relid)) as tamano_tabla
from pg_stat_user_tables st
join pg_class t on t.oid = st.relid
left join (
    select relid, sum(idx_scan) as idx_scan
    from pg_stat_user_indexes group by relid
) s on s.relid = st.relid
order by st.n_live_tup desc;
```

---

*Fin de la Fase 1. Ninguna recomendación será implementada sin autorización explícita del propietario.*
