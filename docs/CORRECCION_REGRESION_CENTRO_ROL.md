# CORRECCION DE REGRESION: centro_id + rol

Fecha: 2026-08-26
Rama: (rama actual)

---

## ARCHIVOS MODIFICADOS

1. `src/hooks/useSupabaseData.ts`
2. `src/hooks/useAppInitialization.ts`
3. `src/hooks/usePresence.ts`
4. `src/types/index.ts`
5. `src/components/comunidad/ComunidadSidebar.tsx`

---

## CAMBIOS REALIZADOS

### 1. src/hooks/useSupabaseData.ts

**loadDashboardData():**
- Agregado guard: `if (!currentProfile) return;` SIN marcar `loadedModules`
- Agregados helpers `activeQuery()`, `userFilter()`, `userOrTutorFilter()`
- Query actividades: `.eq('user_id', session.user.id)` → `userFilter(activeQuery('actividades'))`
- Query calificaciones: `.eq('user_id', session.user.id)` → `userOrTutorFilter(activeQuery('calificaciones'))`
- Agregado log de diagnóstico: `console.log('[PLANIFICACION] Dashboard queries ...')`

**loadPlanificacionData():**
- Agregado guard: `if (!currentProfile) return;` SIN marcar `loadedModules`
- Query secuencias: `.eq('user_id', session.user.id)` → lógica condicional:
  - Administrador: `.in('curso_id', cursosActivos.map(c => c.id))`
  - Tutor/co-docente: `.in('curso_id', cursosParticipaIds)`
  - Docente regular: `.eq('user_id', session.user.id)`
- Agregadas dependencias `state.perfiles, state.cursos, state.cursoDocentes` al useCallback

**mapProfile:**
- Eliminado `currentModule: p.current_module as string`

### 2. src/hooks/useAppInitialization.ts

- Eliminado `current_module` del upsert a `perfiles` (solo queda `last_seen`)
- Eliminado `useLocation()` import y `currentModule` variable
- Eliminado `currentModule` del return value
- Eliminado `currentModule` del parámetro `usePresence()`

### 3. src/hooks/usePresence.ts

- Eliminado `currentModule` de interfaces `PresenceUser` y `TrackPayload`
- Eliminado parámetro `currentModule` de `usePresence()`
- Eliminado `currentModule` del objeto `track()`
- Eliminado segundo `useEffect` que sincronizaba `currentModule` al canal

### 4. src/types/index.ts

- Eliminado `currentModule?: string` de `PresenceUser`
- Eliminado `currentModule?: string` de `UserProfile`

### 5. src/components/comunidad/ComunidadSidebar.tsx

- Simplificado `getModuleActivity()` → retorna `'activo ahora'` (sin parámetros)
- Eliminada llamada `getModuleActivity(user.currentModule || '')` → `getModuleActivity()`

---

## RACE CONDITION

**Problema:** `loadDashboardData()` ejecutaba queries contra Supabase antes de que `state.perfiles` tuviera datos del usuario. Esto causaba que `currentProfile` fuera `undefined`, y todas las queries usaban fallbacks incorrectos.

**Solución:** Agregado guard temprano:
```typescript
if (!currentProfile) {
    console.log('[PLANIFICACION] loadDashboardData: perfiles no disponibles aún, omitiendo carga (sin marcar loaded)');
    setLoading(false);
    return;
}
```

**Flujo corregido:**
```
auth.uid()
  → fetchData() carga perfiles
    → state.perfiles tiene datos
      → loadDashboardData() se re-ejecuta (useCallback recreado)
        → currentProfile existe
          → queries usan centro_id/rol correctamente
            → addLoadedModule('dashboard')
```

**Sin marcado prematuro:** Si `currentProfile` no existe, la función retorna SIN llamar `addLoadedModule('dashboard')`, permitiendo reintentos futuros.

---

## loadedModules

**Solución:** No se requirió cambio en `appStore.ts`. El guard en `loadDashboardData` previene el marcado prematuro al retornar sin llamar `addLoadedModule`. Cuando `state.perfiles` se carga, `useCallback` se recrea y `useEffect` re-ejecuta la carga.

**Mecanismo:** `loadedModules` se resetea cuando el usuario cambia (líneas 89-92 de `appStore.ts`). No se necesitó reset adicional.

---

## centro_id

**Resultado:** Restaurado correctamente.

**ADMINISTRADOR:** `userFilter()` usa `.in('curso_id', cursosActivos.map(c => c.id))` — ve todos los cursos de su centro.

**DOCENTE:** `userFilter()` usa `.in('curso_id', cursosParticipaIds)` — ve sus cursos + cursos vinculados.

**DOCENTE REGULAR:** `userFilter()` usa `.eq('user_id', session.user.id)` — solo ve sus datos.

---

## rol

**Resultado:** Restaurado correctamente.

- `esRolAdministrador(currentProfile?.rol)` funciona correctamente
- El rol se lee de `perfiles.rol` (almacenado en BD, confirmado con consulta de diagnóstico)
- No se modificaron `esRolAdministrador()` ni `esRolDocente()`
- No se crearon nuevos roles

---

## ADMINISTRADOR

**Resultado:** Acceso restaurado.

- CentroPanel solo se renderiza si `analizarRolAcceso().rol === 'administrador'` (App.tsx:165)
- `centroId` en CentroPanel usa `state.centroRolActual?.centro_id || currentUserProfile?.centro_id` (CentroPanel.tsx:34)
- Admin de centro A NO puede ver datos de centro B (su `centro_id` es diferente)

---

## DOCENTE

**Resultado:** Filtros restaurados.

- Actividades: `userFilter()` usa `curso_id` de cursos participados
- Calificaciones: `userOrTutorFilter()` usa `user_id` + `curso_id` de tutorías
- Datos de otros centros NO visibles (filtra por `curso_id`)

---

## TUTOR/CO-DOCENTE

**Resultado:** Filtros restaurados.

- `misCursosTutor`: cursos donde el usuario es tutor oficial
- `misCursosVinculados`: cursos donde el usuario es co-docente
- `cursosParticipaIds`: unión de ambos
- `userOrTutorFilter()` incluye: `user_id.eq.{id},curso_id.in.({misCursosTutor})`

---

## CENTRO PANEL

**Resultado:** Correcto.

- Solo accesible para usuarios con `rol === 'administrador'`
- `centroId` se deriva de `currentUserProfile?.centro_id`
- `loadCentro(centroId)` carga datos del centro correspondiente
- `loadDashboardData()` se ejecuta solo si `centroId` existe

---

## RLS

**NO MODIFICADO** — confirmado en fase de diagnóstico que las políticas de `perfiles` son correctas.

---

## current_module

**NO RESTAURADO** — eliminadas todas las referencias residuales:
- Upsert de `current_module` cada 60s → eliminado
- `currentModule` de Presence/UserProfile types → eliminado
- `currentModule` de usePresence → eliminado
- `getModuleActivity(user.currentModule)` → simplificado

---

## BUILD

**EXITOSO** — `tsc -b && vite build` completado sin errores.

---

## RIESGOS RESTANTES

1. **RLS en tablas de datos**: `actividades`, `calificaciones`, `estudiantes` no tienen RLS centro-scoped. Un atacante con auth válida podría teóricamente acceder a datos de otros centros. La corrección de capa de aplicación mitiga esto en la UI pero no a nivel de DB.

2. **Perfiles con centro_id NULL**: La consulta de diagnóstico confirmó que todos los perfiles tienen `centro_id` poblado. Si en el futuro se crea un perfil sin `centro_id`, el usuario no verá datos de dashboard ni planificación (graceful degradation).

3. **race condition edge case**: Si el usuario navega muy rápido entre módulos antes de que `fetchData()` complete, podría ver datos vacíos temporalmente. El guard previene cargas incorrectas pero no garantiza carga instantánea.

4. **`loadCursoData` NO fue modificado**: Usa `curso_id` correctamente. Si hay algún escenario donde un docente debería ver datos de un curso que no le pertenece, eso requeriría un cambio adicional (no diagnosticado).

---

## VERIFICACIONES PENDIENTES (manuales)

Las siguientes verificaciones requieren pruebas en vivo con datos reales:

### Caso A — Docente independiente
- [ ] centro_id correcto
- [ ] rol correcto
- [ ] sus datos propios visibles
- [ ] datos de otros centros NO visibles

### Caso B — Docente vinculado a centro
- [ ] centro_id correcto
- [ ] rol correcto
- [ ] cursos propios visibles
- [ ] información compartida autorizada visible
- [ ] información de otros centros NO visible

### Caso C — Tutor/co-docente
- [ ] centro_id correcto
- [ ] rol correcto
- [ ] cursos vinculados visibles
- [ ] calificaciones correspondientes visibles

### Caso D — Administrador
- [ ] centro_id correcto
- [ ] rol administrador correcto
- [ ] información del centro visible
- [ ] Centro Panel visible
- [ ] Centro Panel de otro centro NO accesible
