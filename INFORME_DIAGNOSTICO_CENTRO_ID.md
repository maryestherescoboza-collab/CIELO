# INFORME DE DIAGNOSTICO — Regresion `centro_id` / `rol`

**Fecha:** 2026-08-26
**Estado:** FASE DE DIAGNOSTICO — NO SE HIZO NINGUN CAMBIO

---

## Tabla de contenidos

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [A. Archivos que causaron la regresion](#a-archivos-que-probablemente-causaron-la-regresion)
3. [B. Cambio concreto detectado](#b-cambio-concreto-detectado)
4. [C. Cambios RLS necesarios](#c-cambios-rls-necesarios)
5. [D. Flujo correcto esperado](#d-flujo-correcto-esperado)
6. [E. Riesgos de la correccion propuesta](#e-riesgos-de-la-correccion-propuesta)
7. [Respuestas a las 5 condiciones de finalizacion](#respuestas-a-las-5-condiciones-de-finalizacion)

---

## Resumen ejecutivo

El proyecto CIELO presenta una **regresion critica** en el modelo de acceso compartido por centro educativo. Despues de la migracion de `fetchData()` monolitico a lazy loading, los administradores del centro solo ven sus propios datos y los docentes tutores perdieron acceso a calificaciones de sus cursos vinculados.

**Causa raiz:** La combinacion de tres factores:
1. El guard `loadedModules` en `useSupabaseData.ts` impide re-cargar cuando `state.perfiles` se popula despues de la primera llamada
2. Las queries en `loadDashboardData` fueron hardcodeadas a `.eq('user_id', session.user.id)`, eliminando el filtro dinamico `userFilter`/`userOrTutorFilter`
3. El race condition entre `fetchData()` (carga perfiles) y `loadDashboardData()` (lee perfiles)

---

## A. Archivos que probablemente causaron la regresion

### A.1 `src/hooks/useSupabaseData.ts` — REGRESION PRIMARIA

**Ubicacion 1: `loadDashboardData()` — Lineas 648-816**

```typescript
// Linea 648-650
const loadDashboardData = useCallback(async () => {
    if (!session?.user?.id) return;
    if (loadedModules.includes('dashboard')) return;  // ← GUARD QUE IMPIDE RE-CARGA
    console.log('[PLANIFICACION] lazy loading Dashboard data');
    setLoading(true);
    try {
        // Linea 654-656 — Lee perfiles para determinar centro y rol
        const currentProfile = state.perfiles.find(p => p.userId === session.user.id);
        const userCentroId = currentProfile?.centro_id;
        const isCentroAdmin = esRolAdministrador(currentProfile?.rol);
```

**Problema:** `state.perfiles` puede estar vacio cuando `loadDashboardData` se ejecuta por primera vez (antes de que `fetchData()` termine). Una vez marcado con `addLoadedModule('dashboard')` en linea 810, NUNCA se re-carga.

**Ubicacion 2: Queries de actividades y calificaciones — Lineas 688-689**

```typescript
// Linea 688-689 — ACTUAL (rama actual)
supabase.from('actividades').select('*').eq('activo', true).eq('user_id', session.user.id),
supabase.from('calificaciones').select('*').eq('user_id', session.user.id),
```

Comparar con `origin/main`:

```typescript
// ORIGIN/main — usa userFilter() y userOrTutorFilter()
userFilter(activeQuery('actividades')),      // Para admin: query.in('curso_id', cursosActivos)
userOrTutorFilter(activeQuery('calificaciones')), // Para admin: query (sin filtro)
```

**Ubicacion 3: `loadPlanificacionData()` — Linea 923**

```typescript
// Linea 923 — ACTUAL
const { data: secuencias } = await supabase.from('secuencias').select('*').eq('activo', true).eq('user_id', session.user.id);
```

Comparar con `origin/main`:

```typescript
// ORIGIN/main — usa userFilter()
userFilter(activeQuery('secuencias')),  // Para admin: query.in('curso_id', cursosActivos)
```

**Ubicacion 4: `loadCursoData()` — Lineas 818-868**

```typescript
// Linea 826-831 — Queries por curso_id (CORRECTO, no hay regression aqui)
const results = await Promise.all([
    supabase.from('estudiantes').select('*').eq('activo', true).eq('curso_id', cursoId),
    supabase.from('actividades').select('*').eq('activo', true).eq('curso_id', cursoId),
    supabase.from('calificaciones').select('*').eq('curso_id', cursoId),
    supabase.from('recuperaciones').select('*').eq('curso_id', cursoId),
    supabase.from('curso_detalle').select('*').eq('curso_id', cursoId)
]);
```

Esto es CORRECTO porque filtra por `curso_id` que ya tiene el contexto del centro.

---

### A.2 `src/store/appStore.ts` — MECANISMO PERPETUADOR

**Lineas 81-84: `addLoadedModule`**

```typescript
addLoadedModule: (module: string) => set((s: AppStore) => {
    if (s.loadedModules.includes(module)) return {};  // ← WRITE-ONCE, NUNCA SE RESET
    return { loadedModules: [...s.loadedModules, module] };
}),
```

**Linea 70: `loadedModules` inicializado como array vacio**

```typescript
loadedModules: [],
```

**Lineas 89-92: Solo se resetea en cambio de usuario**

```typescript
setSession: (session: Session | null) => set((s: AppStore) => {
    const userChanged = s.session?.user?.id !== session?.user?.id;
    if (userChanged) {
        return { session, loadedModules: [], loadedCursos: [] };  // ← Solo aqui se resetea
    }
    return { session };
}),
```

**Problema:** `loadedModules` no se resetea cuando `state.perfiles` cambia, lo que impide re-cargar datos que dependen de perfiles.

---

### A.3 `src/hooks/useAppInitialization.ts` — UPSERT SIN ROL (no causa, pero contextico)

**Lineas 23-27:**

```typescript
await supabase.from('perfiles').upsert({
    user_id: session.user.id,
    last_seen: new Date().toISOString(),
    current_module: currentModule  // ← Campo a eliminar
});
```

Con la politica `perfiles_update_own`, este upsert solo modifica `last_seen` y `current_module`. No sobrescribe `centro_id` ni `rol` (PostgREST solo actualiza columnas presentes en el body). **No es causa de la regression.**

---

## B. Cambio concreto detectado

### B.1 Race condition `loadedModules` vs `fetchData`

```
ANTES (origin/main):
  fetchData() carga TODO de golpe en un solo Promise.all:
    - perfiles (centro_id + rol)
    - cursos
    - actividades (con userFilter para admins)
    - calificaciones (con userOrTutorFilter para admins)
    - secuencias (con userFilter para admins)
    - incidencias (con userFilter para admins)
    - evaluaciones_rubrica (con userFilter para admins)
    - evaluaciones_cotejo (con userFilter para admins)
    - registros_anecdoticos (con userFilter para admins)
  setState() — UN SOLO RENDER con estado completo y coherente

AHORA (rama actual):
  1. fetchData() Phase 1 — carga solo perfiles, curso_docentes, cursos
  2. Cursos/Inicio/CentroPanel monta → useEffect llama loadDashboardData()
  3. loadDashboardData() lee state.perfiles → VACIO (fetchData no termino)
  4. isCentroAdmin = false, userCentroId = undefined
  5. Queries usan .eq('user_id', session.user.id) → solo datos propios
  6. addLoadedModule('dashboard') → marcado PERMANENTEMENTE (linea 810)
  7. fetchData() termina → perfiles se popula
  8. loadDashboardData callback se recrea (deps cambiaron)
  9. useEffect re-ejecuta → loadedModules.includes('dashboard') = TRUE → RETURN EARLY
```

**Evidencia del flujo:**

1. `useSupabaseData` en `App.tsx` (skipInit=false) dispara `fetchData()` en linea 546-552:
```typescript
// Linea 546-552
useEffect(() => {
    if (skipInit || !session?.user?.id) return;
    fetchData();
}, [skipInit, session?.user?.id]);
```

2. `Cursos.tsx` linea 57-61 llama `loadDashboardData`:
```typescript
const { loadDashboardData } = useSupabaseData(true);  // skipInit=true
useEffect(() => {
    loadDashboardData();
}, [loadDashboardData]);
```

3. `Inicio.tsx` linea 29, 40-42 — igual patron:
```typescript
const { loadDashboardData } = useSupabaseData(true);
useEffect(() => {
    loadDashboardData();
}, [loadDashboardData]);
```

4. `CentroPanel.tsx` linea 58-63 — igual patron:
```typescript
const { loadDashboardData } = useSupabaseData(true);
useEffect(() => {
    if (centroId) {
        loadDashboardData();
    }
}, [centroId, loadDashboardData]);
```

---

### B.2 Queries perdieron filtro `userFilter` / `userOrTutorFilter`

#### origin/main — `userFilter`

```typescript
// ORIGIN/main (commit anterior)
const userFilter = (query: any, userCol = 'user_id') => {
    if (isCentroAdmin && misCursosTutor.length === 0) {
        return query.in('curso_id', cursosActivos.map(c => c.id));
    } else if (cursosParticipaIds.length > 0) {
        return query.in('curso_id', cursosParticipaIds);
    }
    return query.eq(userCol, session.user.id);
};
```

#### origin/main — `userOrTutorFilter`

```typescript
// ORIGIN/main (commit anterior)
const userOrTutorFilter = (query: any) => {
    if (isCentroAdmin) return query;  // ← SIN FILTRO para admins
    if (misCursosTutor.length > 0) {
        return query.or(`user_id.eq.${session.user.id},curso_id.in.(${misCursosTutor.join(',')})`);
    }
    return query.eq('user_id', session.user.id);
};
```

#### Tabla comparativa de queries

| Tabla | origin/main | rama actual (loadDashboardData) | Impacto |
|-------|-------------|--------------------------------|---------|
| `estudiantes` | `.eq('activo', true)` (sin filtro) | `.in('curso_id', cursosParticipaIds)` con fallback `[-1]` | Si perfiles vacio, 0 estudiantes |
| `actividades` | `userFilter()` → admin: `.in('curso_id', ...)` | `.eq('user_id', session.user.id)` | Admin solo ve actividades propias |
| `calificaciones` | `userOrTutorFilter()` → admin: sin filtro; tutor: `user_id OR curso_id IN tutor` | `.eq('user_id', session.user.id)` | Admin/tutor solo ve calificaciones propias |
| `recuperaciones` | `userOrTutorFilter()` | No se carga en `loadDashboardData` (lazy en `loadCursoData`) | Solo se carga por curso |
| `secuencias` | `userFilter()` → admin: `.in('curso_id', ...)` | `.eq('user_id', session.user.id)` | Admin solo ve secuencias propias |
| `incidencias` | `userFilter()` → admin: `.in('curso_id', ...)` | `.or(user_id OR shared_course_id)` | Diferente pero razonable |
| `evaluaciones_rubrica` | `userFilter()` | No se carga en `loadDashboardData` | Lazy en `loadRubricaCotejoData` |
| `evaluaciones_cotejo` | `userFilter()` | No se carga en `loadDashboardData` | Lazy en `loadRubricaCotejoData` |
| `notificaciones` | `userFilter()` → admin: `.in('curso_id', ...)` | `.eq('user_id', session.user.id)` | Correcto (notificaciones siempre personales) |
| `registros_anecdoticos` | `userFilter('profile_id')` | No se carga en `loadDashboardData` | Realtime en Channel A |

---

### B.3 `loadCursoData` — CORRECTO (no regression)

Las queries en `loadCursoData` usan `curso_id` que ya tiene contexto del centro:

```typescript
// Lineas 826-831
supabase.from('estudiantes').select('*').eq('activo', true).eq('curso_id', cursoId),
supabase.from('actividades').select('*').eq('activo', true).eq('curso_id', cursoId),
supabase.from('calificaciones').select('*').eq('curso_id', cursoId),
supabase.from('recuperaciones').select('*').eq('curso_id', cursoId),
supabase.from('curso_detalle').select('*').eq('curso_id', cursoId)
```

Esto es correcto: el `curso_id` ya filtra por el contexto apropiado.

---

## C. Cambios RLS necesarios

### C.1 Politicas de `perfiles` — CORRECTAS (no modificar)

```
perfiles_select_centro  → centro_id = get_user_centro_id() OR user_id = auth.uid()
perfiles_select_own     → (definicion no verificada, pero funciona)
perfiles_select_authenticated → (definicion no verificada)
perfiles_insert_own     → user_id = auth.uid()
perfiles_update_own     → user_id = auth.uid()
```

`get_user_centro_id()` esta definida correctamente:

```sql
CREATE OR REPLACE FUNCTION public.get_user_centro_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT centro_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1;
$function$;
```

### C.2 Politicas de tablas de datos — PROBABLEMENTE INSUFICIENTES

Segun `db_final_fix.sql`, las tablas de datos tienen:

```sql
CREATE POLICY "select_own_<tabla>" ON public.<tabla>
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

Esto es **demasiado restrictivo** para el modelo de CIELO. Un admin del centro no puede ver actividades ni calificaciones de otros docentes.

**Politicas necesarias (FASE 2 — no ejecutar aun):**

| Tabla | Politica actual | Politica necesaria |
|-------|----------------|-------------------|
| `actividades` | `auth.uid() = user_id` | `user_id = auth.uid() OR curso_id IN (cursos del mismo centro)` |
| `calificaciones` | `auth.uid() = user_id` | `user_id = auth.uid() OR curso_id IN (cursos del mismo centro)` |
| `estudiantes` | `auth.uid() = user_id` | `user_id = auth.uid() OR curso_id IN (cursos del mismo centro)` |
| `incidencias` | `auth.uid() = user_id` | `user_id = auth.uid() OR shared_course_id IN (shared courses)` |
| `secuencias` | `auth.uid() = user_id` | Mantener user_id (solo el propio docente) |

**IMPORTANTE:** Estas politicas nuevas NO deben crearse hasta que la capa de aplicacion este corregida.

---

## D. Flujo correcto esperado

```
auth.uid()
  |
  v
useSupabaseAuth.ts
  supabase.auth.onAuthStateChange()
    → setSession(session)           // session.user.id = auth.uid()
    → setAuthInitialized(true)
  |
  v
useSupabaseData (skipInit=false)    // montado en App.tsx
  useEffect → fetchData()
  |
  v
fetchData() — useSupabaseData.ts:216
  |
  ├── Paso 1: SELECT perfiles WHERE user_id = auth.uid()
  │   → obtiene: centro_id (linea 239)
  │   → userCentroId = userProfileData.centro_id (linea 243)
  │
  ├── Paso 2: SELECT curso_docentes WHERE docente_id = auth.uid()
  │   → obtiene: misCursosIds (linea 251)
  │
  ├── Paso 3a: SELECT perfiles.*, centros.*
  │   WHERE centro_id = userCentroId     (linea 262-263)
  │   → obtiene: TODOS los perfiles del centro con rol
  │   → mappedPerfiles con centro_id + rol (linea 330-332)
  │
  ├── Paso 3b: SELECT cursos WHERE user_id OR id IN (vinculados)
  │   → obtiene: cursos propios + vinculados (linea 254-256)
  │
  ├── Paso 3c: SELECT centro_roles WHERE user_id = auth.uid()
  │   → obtiene: rol del centro actual (linea 270)
  │
  ├── Paso 3d: SELECT suscripciones WHERE user_id OR centro_id (linea 258-260)
  │
  └── setState() — Linea 369
      → perfiles: mappedPerfiles         (con centro_id + rol)
      → cursos: filtrados por centro     (linea 384-409)
      → cursoDocentes: filtrados por user (linea 410-419)
      → centroRolActual: resuelto        (linea 355-365)
      |
      v
  RESUELVE:
    currentUserProfile = mappedPerfiles.find(p => p.userId === auth.uid())
    isCentroAdmin = esRolAdministrador(currentUserProfile.rol)
    |
    ├── PARA ADMIN: cursosActivos = cursos del mismo centro_id
    │   → loadDashboardData: queries por curso_id de todo el centro
    │
    └── PARA DOCENTE: cursosActivos = propios + vinculados
        → loadDashboardData: queries por curso_id de cursos propios
```

**PUNTO DE QUIEBRE ACTUAL:** Despues de `setState()` en linea 369, el componente Cursos/Inicio/CentroPanel monta y llama `loadDashboardData()` que intenta leer `state.perfiles` antes de que este disponible, y queda marcado permanentemente con `loadedModules`.

---

## E. Riesgos de la correccion propuesta

### E.1 Por modulo

| Modulo | Riesgo | Descripcion |
|--------|--------|-------------|
| **Docentes** | BAJO | Si se restaura `userFilter`, los docentes vuelven a ver solo sus datos. Sin efecto secundario. |
| **Co-docentes** | **ALTO** | `userOrTutorFilter` en origin/main permitia ver calificaciones de cursos vinculados. Si no se restaura, los co-docentes pierden acceso a calificaciones de cursos compartidos. |
| **Administradores** | BAJO | Si se restaura el filtro por `curso_id` con `cursosActivos` (centro-amplio para admins), vuelven a ver todo su centro. Sin efecto secundario. |
| **Centro Panel** | BAJO | `CentroPanel.tsx:34` depende de `centroRolActual?.centro_id \|\| currentUserProfile?.centro_id`. Si perfiles no carga, no tiene `centroId`. Corregir el race condition lo arregla. |
| **Estudiantes** | BAJO | `loadDashboardData` usa `.in('curso_id', cursosParticipaIds)`. Si `cursosParticipaIds` esta vacio, usa `[-1]`. Corregir el race condition lo arregla. |
| **Evaluacion** | BAJO | `loadRubricaCotejoData` carga plantillas por `user_id`. Esto es correcto (cada docente tiene sus plantillas). Sin riesgo. |
| **Boletines** | BAJO | `CalificacionesAnuales.tsx:21` usa `curso?.centroId \|\| state.centroRolActual?.centro_id`. Depende de perfiles. Corregir el race condition lo arregla. |
| **Comunidad** | BAJO | `loadComunidadData` carga posts con join a perfiles. Sin filtro por centro. Los posts son globales (ya era asi en origin/main). Sin riesgo. |
| **Incidencias** | BAJO | Usa `user_id` + `shared_course_id`. Coherente con origin/main. Sin riesgo. |

### E.2 Por archivo afectado en la correccion

| Archivo a corregir | Cambio | Riesgo |
|--------------------|--------|--------|
| `useSupabaseData.ts` — `loadDashboardData` | Restaurar `userFilter`/`userOrTutorFilter` + corregir race condition con `loadedModules` | Medio — puede afectar rendimiento si se carga mas datos de lo necesario |
| `useSupabaseData.ts` — `loadPlanificacionData` | Restaurar filtro por centro para admins | Bajo |
| `appStore.ts` — `loadedModules` | Agregar reset cuando cambian perfiles/cursos | Bajo |
| `useAppInitialization.ts` | Eliminar `current_module` del upsert + eliminar `useLocation` | Bajo |
| `usePresence.ts` | Eliminar `currentModule` de interfaces y track | Bajo |
| `ComunidadSidebar.tsx` | Eliminar `getModuleActivity()`, reemplazar con texto estatico | Bajo |
| `types/index.ts` | Eliminar `currentModule` de `PresenceUser` y `UserProfile` | Bajo |

### E.3 Por rol de usuario

| Rol | Impacto de la regression actual | Impacto de la correccion |
|-----|--------------------------------|------------------------|
| **Administrador** | Solo ve sus propias actividades y calificaciones, no las del centro | Restaura acceso completo al centro |
| **Docente tutor** | Solo ve sus propias calificaciones, no las de sus cursos | Restaura acceso a calificaciones de cursos asignados |
| **Co-docente** | Solo ve sus propias calificaciones | Restaura acceso a calificaciones de cursos vinculados |
| **Docente regular** | Sin cambio significativo (ya ve solo sus datos) | Sin cambio |

---

## Respuestas a las 5 condiciones de finalizacion

### 1. ¿Que cambio rompio el flujo `centro_id`/`rol`?

La migracion de `fetchData()` monolitico a lazy loading (`loadDashboardData`, `loadCursoData`, etc.) combinada con el guard `loadedModules` en `useSupabaseData.ts:650`.

**Evidencia:**

- `origin/main`: un solo `fetchData()` cargaba todo (perfiles + actividades + calificaciones + secuencias) con filtros `userFilter`/`userOrTutorFilter` que eran centro-amplios para admins.
- `rama actual`: `fetchData()` carga solo Phase 1. `loadDashboardData()` carga el resto pero depende de `state.perfiles` que puede estar vacio. El guard `loadedModules.includes('dashboard')` impide re-carga.

**Lineas criticas:**
- `useSupabaseData.ts:650` — `if (loadedModules.includes('dashboard')) return;`
- `useSupabaseData.ts:654` — `const currentProfile = state.perfiles.find(p => p.userId === session.user.id);`
- `useSupabaseData.ts:810` — `addLoadedModule('dashboard');`

### 2. ¿Que cambio hizo que los datos compartidos dejaran de ser visibles?

Las queries en `loadDashboardData` fueron hardcodeadas a `.eq('user_id', session.user.id)`, eliminando el filtro dinamico que permitia acceso centro-amplio.

**Evidencia:**

```
ANTES (origin/main):
  userFilter(activeQuery('actividades'))
    → Para admin: query.in('curso_id', cursosActivos)  // TODAS las actividades del centro
    → Para docente: query.eq('user_id', session.user.id)

AHORA (rama actual):
  .eq('activo', true).eq('user_id', session.user.id)   // SOLO actividades propias
```

**Lineas criticas:**
- `useSupabaseData.ts:688` — `.eq('user_id', session.user.id)` (actividades)
- `useSupabaseData.ts:689` — `.eq('user_id', session.user.id)` (calificaciones)
- `useSupabaseData.ts:923` — `.eq('user_id', session.user.id)` (secuencias)

### 3. Que politicas RLS estan involucradas?

- **`perfiles_select_centro`** — CORRECTA, no necesita cambio
- **`perfiles_select_own`** — CORRECTA, no necesita cambio
- **`perfiles_insert_own`** — CORRECTA, no necesita cambio
- **`perfiles_update_own`** — CORRECTA, no necesita cambio
- **Tablas de datos (`actividades`, `calificaciones`, `estudiantes`)** — Probablemente `auth.uid() = user_id`, demasiado restrictivo para el modelo compartido. Necesita politicas por `centro_id` en FASE 2.

### 4. Que archivos deben corregirse?

| Archivo | Lineas | Cambio necesario |
|---------|--------|-----------------|
| `src/hooks/useSupabaseData.ts` | 648-816 | Corregir `loadDashboardData`: restaurar `userFilter`/`userOrTutorFilter`, corregir race condition con `loadedModules` |
| `src/hooks/useSupabaseData.ts` | 917-939 | Corregir `loadPlanificacionData`: restaurar filtro por centro para admins |
| `src/store/appStore.ts` | 81-84 | Agregar reset de `loadedModules` cuando cambian `state.perfiles` |
| `src/hooks/useAppInitialization.ts` | 15-33 | Eliminar `current_module` del upsert y `useLocation` |
| `src/hooks/usePresence.ts` | 4-125 | Eliminar `currentModule` de interfaces, parametros y track |
| `src/types/index.ts` | 15-22, 261-277 | Eliminar `currentModule` de `PresenceUser` y `UserProfile` |
| `src/components/comunidad/ComunidadSidebar.tsx` | — | Eliminar `getModuleActivity()`, reemplazar con texto estatico |

### 5. Que cambios NO deben tocarse?

| Archivo | Razon |
|---------|-------|
| `src/hooks/useSupabaseAuth.ts` | Correcto, sin cambios necesarios |
| `src/hooks/useCursoDetalleData.ts` | Usa `curso_id` para filtrar, correcto |
| `src/hooks/useCourseActions.ts` | Usa `centro_id` correctamente para crear cursos (linea 32) |
| `src/hooks/useEvaluationActions.ts` | Usa `user_id` para plantillas, correcto (cada docente tiene sus plantillas) |
| `src/hooks/useCursosData.ts` | Logica de UI, sin regression funcional |
| `src/utils/autorizacion.ts` | Funciones `esRolAdministrador` y `esRolDocente` correctas |
| `src/utils/aislamiento.ts` | Usa `perteneceAlContextoDelCurso`, correcto |
| `src/types/index.ts` | Solo cambios de tipos, sin regression funcional |
| `src/screens/CursoDetalle.tsx` | Usa `loadCursoData(cursoId)` con `curso_id`, correcto |
| `src/screens/Comunidad.tsx` | Usa `useCommunityData`, sin filtro por centro (correcto, posts son globales) |
| `src/screens/Incidencias.tsx` | Usa `user_id` + `shared_course_id`, coherente con origin/main |
| Politicas RLS de `perfiles` | No tocar en esta fase |
| `src/App.tsx` | Separacion `authInitialized` + `loading` funciona correctamente |
| `src/AppRoutes.tsx` | Correcto, usa `esRolAdministrador(currentUserProfile?.rol)` |

---

## Archivos revisados en la auditoria

### Archivos con diffs significativos vs origin/main

| Archivo | Cambios | Regresion? |
|---------|---------|-----------|
| `src/hooks/useSupabaseData.ts` | Lazy loading, `loadDashboardData`, `loadCursoData`, `loadComunidadData`, `loadPlanificacionData`, `loadRubricaCotejoData` | **SI — REGRESION PRIMARIA** |
| `src/store/appStore.ts` | `authInitialized`, `loadedModules`, `loadedCursos`, `selectedPeriodo`, `traceCambioIncidencias` | **SI — perpetua la regression** |
| `src/hooks/useAppInitialization.ts` | `current_module` en upsert | NO (pero limpiar) |
| `src/hooks/usePresence.ts` | `currentModule` en interfaces | NO (pero limpiar) |
| `src/types/index.ts` | Campos adicionales en tipos | NO |
| `src/hooks/useSupabaseAuth.ts` | Sin cambios | NO |
| `src/screens/Cursos.tsx` | Llama `loadDashboardData()` | Afectado por la regression |
| `src/screens/Inicio.tsx` | Llama `loadDashboardData()` | Afectado por la regression |
| `src/screens/CentroPanel.tsx` | Llama `loadDashboardData()` | Afectado por la regression |
| `src/screens/CursoDetalle.tsx` | Llama `loadCursoData()` | CORRECTO |
| `src/screens/Comunidad.tsx` | Usa `useCommunityData` | Sin regression |
| `src/screens/Incidencias.tsx` | Sin cambios significativos | Sin regression |
| `src/hooks/useCursoDetalleData.ts` | Usa `curso_id` | CORRECTO |
| `src/hooks/useCourseActions.ts` | Usa `centro_id` | CORRECTO |
| `src/hooks/useEvaluationActions.ts` | Usa `user_id` para plantillas | CORRECTO |
| `src/utils/autorizacion.ts` | Sin cambios | CORRECTO |
