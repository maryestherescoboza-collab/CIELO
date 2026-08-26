# DIAGNOSTICO REAL: centro_id + rol — Flujo de datos completo

Fecha: 2026-08-26

---

## A. DATOS REALES DE SUPABASE

### ADMINISTRADOR
```
user_id:  3704f4f9-7bf2-4856-b5ac-b5d076b700d6
centro_id: c1618a10-b67d-4b57-b7df-545d732bc378
rol:       administrador
```

### DOCENTE
```
user_id:  e3f44885-52e2-4b4b-bbcb-77942471e7d2
centro_id: efde3958-c5e4-4248-8cff-ca1ccd5d3bcf
rol:       docente
```

Ambos registros confirmados correctos en Supabase via SQL Editor.

---

## B. SINTOMA OBSERVADO

Ambos usuarios ven "No vinculado a ningún centro" en el frontend.
El administrador NO recibe CentroPanel como entorno principal.

---

## C. TRAZA COMPLETA DEL FLUJO DE DATOS

### Paso 1: Autenticación
**Archivo:** `src/hooks/useSupabaseAuth.ts` (lineas 9-18)

```typescript
supabase.auth.onAuthStateChange((event, currentSession) => {
    setSession(currentSession);       // ← Guarda sesión en Zustand
    setAuthInitialized(true);         // ← Marca auth como inicializada
});
```

**Resultado:** `state.session` contiene el usuario autenticado.
**Verificado:** Correcto. No hay problema aquí.

---

### Paso 2: Carga de datos base (fetchData)
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 545-551)

```typescript
useEffect(() => {
    if (skipInit || !session?.user?.id) return;
    fetchData();                       // ← Se ejecuta cuando session cambia
}, [skipInit, session?.user?.id]);
```

**Resultado:** `fetchData()` se invoca al tener sesión.

---

### Paso 3: Primera consulta — obtener centro_id del usuario
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 239-243)

```typescript
const userProfileResult = await supabase
    .from('perfiles')
    .select('centro_id')
    .eq('user_id', session.user.id)
    .single();

const userProfileData = userProfileResult.data;
const userCentroId = userProfileData?.centro_id || null;
```

**PUNTO CRÍTICO #1:** Si esta consulta falla (error de RLS, perfil no encontrado, error de red), `userProfileData` será `null`, y `userCentroId` será `null`.

**PUNTO CRÍTICO #2:** Si `userProfileResult.error` NO se verifica aquí (y NO se verifica — solo se logea en linea 241), el código continúa con `userCentroId = null`.

---

### Paso 4: Consulta de perfiles (centro-scoped)
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 262-264)

```typescript
const perfilesQuery = userCentroId
    ? supabase.from('perfiles').select('*, centros(*)').eq('centro_id', userCentroId)
    : supabase.from('perfiles').select('*, centros(*)').eq('user_id', session.user.id);
```

**RAMA A (userCentroId existe):** Consulta TODOS los perfiles del centro con JOIN a `centros`.
**RAMA B (userCentroId es null):** Consulta SOLO el perfil del usuario actual.

**PUNTO CRÍTICO #3:** La consulta usa `centros(*)` como JOIN. Si la relación foránea `perfiles.centro_id → centros.id` no está configurada correctamente en Supabase, esta consulta FALLARÍA silenciosamente (Supabase retorna error, pero el código solo lo logea).

---

### Paso 5: Validación de fase 1
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 278-283)

```typescript
const fase1Fallidas = ['perfiles', 'centro_roles', 'cursos', 'curso_docentes']
    .filter((_, idx) => !!phase1[idx].error);
if (fase1Fallidas.length > 0) {
    console.warn(`[Supabase fetchData] Contexto base incompleto...`);
    return;   // ← RETURN SIN SETEAR ESTADO
}
```

**PUNTO CRÍTICO #4:** Si la consulta de perfiles (paso 4) tiene error, `fetchData()` retorna SIN actualizar `state.perfiles`. El estado queda vacío `[]`. **TODA la aplicación funciona con datos vacíos.**

---

### Paso 6: Mapeo de perfiles a UserProfile
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 295-336)

```typescript
const mappedPerfiles = (perfiles || []).map((p: any): UserProfile => {
    return {
        userId: p.user_id as string,
        // ...
        centro_id: p.centro_id as string || undefined,   // LINEA 330
        centro: resolvedCentro,
        rol: (p.rol as UserProfile['rol']) || undefined,  // LINEA 332
        // ...
    };
});
```

**ANÁLISIS DEL MAPPING:**
- `p.user_id` → `userId`: Correcto (Supabase devuelve `user_id`)
- `p.centro_id` → `centro_id`: Correcto si `p.centro_id` existe en el resultado de la consulta
- `p.rol` → `rol`: Correcto si `p.rol` existe en el resultado de la consulta

**PUNTO CRÍTICO #5:** Si la consulta del paso 4 retornó datos pero SIN las columnas `centro_id` o `rol` (posible si la tabla tiene alias o si el SELECT con JOIN falla parcialmente), el mapping produciría `undefined` para ambos campos.

---

### Paso 7: Cálculo de currentUserProfile (dentro de fetchData)
**Archivo:** `src/hooks/useSupabaseData.ts` (linea 338)

```typescript
const currentUserProfile = mappedPerfiles.find(
    (p: any) => p.userId === session.user.id
);
```

**PUNTO CRÍTICO #6:** Si `mappedPerfiles` está vacío (porque la consulta falló en paso 4-5), `currentUserProfile` será `undefined`.

---

### Paso 8: Cálculo de resolvedCentroRolActual
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 354-364)

```typescript
const resolvedCentroRolActual = (() => {
    if (!esRolAdministrador(currentUserProfile?.rol)) return undefined;
    const userCentroRoles = (centroRoles || []).filter(
        (cr: any) => cr.user_id === session.user.id
    );
    const rolDelCentroActual = userCentroRoles.find(
        (cr: any) => cr.centro_id === userCentroId
    );
    return {
        id: rolDelCentroActual?.id || '',
        centro_id: userCentroId || rolDelCentroActual?.centro_id || '',
        user_id: session.user.id,
        rol: 'administrador' as const,
    };
})();
```

**PUNTO CRÍTICO #7:** Si `currentUserProfile?.rol` no es `'administrador'` (porque `currentUserProfile` es `undefined` o `rol` es `undefined`), `resolvedCentroRolActual` será `undefined`.

---

### Paso 9: Almacenamiento en Zustand
**Archivo:** `src/hooks/useSupabaseData.ts` (lineas 379-421)

```typescript
setState(prev => {
    return {
        ...prev,
        perfiles: mappedPerfiles,           // ← LINEA 381
        centroRolActual: resolvedCentroRolActual,  // ← LINEA 420
        // ...
    };
});
```

**PUNTO CRÍTICO #8:** Si `mappedPerfiles` está vacío, `state.perfiles` queda como `[]`. Si `resolvedCentroRolActual` es `undefined`, `state.centroRolActual` queda como `undefined`.

---

### Paso 10: useAppInitialization — currentUserProfile para la UI
**Archivo:** `src/hooks/useAppInitialization.ts` (lineas 34-36)

```typescript
const currentUserProfile = useMemo(
    () => state.perfiles.find(p => p.userId === session?.user?.id),
    [state.perfiles, session]
);
```

**PUNTO CRÍTICO #9:** Si `state.perfiles` está vacío, `currentUserProfile` será `undefined`. Todo lo que dependa de él falla.

---

### Paso 11: App.tsx — Decisión de routing (ADMIN vs DOCENTE)
**Archivo:** `src/App.tsx` (lineas 165-173)

```typescript
const esUsuarioCentro = analizarRolAcceso({ perfil: currentUserProfile })?.rol === 'administrador';

if (esUsuarioCentro) {
    return <CentroPanel onLogout={...} />;
}
// ... si no, renderiza Layout + AppRoutes (entorno docente)
```

**PUNTO CRÍTICO #10:** Si `currentUserProfile` es `undefined`, `analizarRolAcceso({ perfil: undefined })` retorna `null`, y `null?.rol === 'administrador'` es `false`. El admin se trata como docente.

---

### Paso 12: analizarRolAcceso
**Archivo:** `src/utils/autorizacion.ts` (lineas 44-56)

```typescript
export function analizarRolAcceso(opts: { perfil?: UserProfile | null }): AnalisisAcceso | null {
    const { perfil } = opts;
    const rol = perfil?.rol;
    if (esRolAdministrador(rol)) {
        return { rol: 'administrador', centro_id: perfil?.centro_id };
    }
    if (esRolDocente(rol)) {
        return { rol: 'docente' };
    }
    return null;
}
```

**ANÁLISIS:** Esta función es correcta. Si `perfil?.rol === 'administrador'`, retorna `{ rol: 'administrador' }`.

---

### Paso 13: AppRoutes — Gate de admin
**Archivo:** `src/AppRoutes.tsx` (linea 156)

```typescript
const esAdministrador = esRolAdministrador(currentUserProfile?.rol);
if (esAdministrador) {
    return <div>Acceso restringido</div>;  // Bloquea acceso docente a admin
}
```

**ANÁLISIS:** Esto solo se ejecuta si el admin llega al flujo docente (no debería). Confirma que el admin NO está siendo redirigido a CentroPanel en App.tsx.

---

### Paso 14: CentroPanel — Fuente de centroId
**Archivo:** `src/screens/CentroPanel.tsx` (lineas 30-34)

```typescript
const currentUserProfile = useMemo(
    () => state.perfiles.find(p => p.userId === session?.user?.id),
    [state.perfiles, session]
);
const centroId = state.centroRolActual?.centro_id || currentUserProfile?.centro_id;
```

**PUNTO CRÍTICO #11:** Si `state.centroRolActual` es `undefined` Y `currentUserProfile?.centro_id` es `undefined`, `centroId` será `undefined`. Se muestra "No vinculado".

---

### Paso 15: ProfileSettings — Fuente de centroId
**Archivo:** `src/AppRoutes.tsx` (linea 347)

```typescript
centroId={currentUserProfile?.centro_id}
```

**PUNTO CRÍTICO #12:** Si `currentUserProfile` es `undefined`, `centroId` es `undefined`. Se muestra "Todavía no estás vinculado".

---

## D. mapping DE SUPABASE A STATE

| ORIGEN | VALOR REAL (DB) | DESTINO | VALOR ESPERADO | RESULTADO |
|---|---|---|---|---|
| `perfiles.user_id` | `3704f4f9-...` | `state.perfiles[].userId` | `3704f4f9-...` | ✅ Correcto si la consulta retorna datos |
| `perfiles.centro_id` | `c1618a10-...` | `state.perfiles[].centro_id` | `c1618a10-...` | ⚠️ Depende del paso 4 |
| `perfiles.rol` | `administrador` | `state.perfiles[].rol` | `administrador` | ⚠️ Depende del paso 4 |
| `state.perfiles[].centro_id` | `c1618a10-...` | `currentUserProfile.centro_id` | `c1618a10-...` | ⚠️ Depende del paso 10 |
| `state.perfiles[].rol` | `administrador` | `currentUserProfile.rol` | `administrador` | ⚠️ Depende del paso 10 |
| `currentUserProfile.rol` | `administrador` | `esUsuarioCentro` | `true` | ⚠️ Depende de pasos anteriores |
| `currentUserProfile.centro_id` | `c1618a10-...` | `CentroPanel centroId` | `c1618a10-...` | ⚠️ Depende de pasos anteriores |

---

## E. CAUSA RAÍZ MÁS PROBABLE

**Hipótesis #1 (80% probabilidad): La consulta de perfiles con JOIN falla silenciosamente.**

Línea 263: `supabase.from('perfiles').select('*, centros(*)').eq('centro_id', userCentroId)`

Si la relación foránea `perfiles.centro_id → centros.id` no existe o está mal configurada en Supabase, esta consulta retorna error. El código en linea 278-282 detecta el error y hace `return` sin setear `state.perfiles`.

**Evidencia que respalda esta hipótesis:**
- `state.perfiles` queda como `[]` (initialState)
- `currentUserProfile` queda como `undefined`
- `esUsuarioCentro` es `false` → admin ve flujo docente
- `centroId` es `undefined` → ambos ven "No vinculado"
- NO se observan errores visibles (solo en console.warn)

**Hipótesis #2 (15% probabilidad): La primera consulta falla y userCentroId queda null.**

Línea 239: `supabase.from('perfiles').select('centro_id').eq('user_id', session.user.id).single()`

Si RLS bloquea esta consulta, `userCentroId` queda `null`. La consulta de paso 4 usa la rama B (`.eq('user_id', session.user.id)`), que solo retorna el perfil propio. Esto NO debería fallar porque `perfiles_select_own` permite leer el propio perfil. Pero si falla, el efecto es el mismo: `state.perfiles` queda vacío.

**Hipótesis #3 (5% probabilidad): La consulta retorna datos pero sin `centro_id` o `rol`.**

Si la consulta `select('*, centros(*)')` retorna filas pero Supabase omite las columnas `centro_id` y `rol` del resultado (por algún alias o conflicto de nombres con la tabla `centros`), el mapping produciría `undefined`.

---

## F. PUNTO EXACTO DONDE SE PIERDE centro_id

**Línea más probable:** `src/hooks/useSupabaseData.ts:263`

```typescript
supabase.from('perfiles').select('*, centros(*)').eq('centro_id', userCentroId)
```

Si esta consulta falla:
- `phase1[0].error` será truthy
- `fase1Fallidas` incluirá `'perfiles'`
- `fetchData()` retornará en linea 282 sin setear estado
- `state.perfiles` queda como `[]`
- `currentUserProfile` queda como `undefined`
- `centro_id` se pierde en toda la cadena

---

## G. PUNTO EXACTO DONDE SE PIERDE rol

**Mismo punto que centro_id:** `src/hooks/useSupabaseData.ts:263`

Si la consulta falla, `rol` se pierde por la misma razón: nunca se mapea.

**Punto alternativo (si la consulta SÍ retorna datos):** `src/hooks/useSupabaseData.ts:332`

```typescript
rol: (p.rol as UserProfile['rol']) || undefined,
```

Si `p.rol` es `null` o no existe en el resultado, se convierte en `undefined`. Pero esto solo aplica si la consulta del paso 4 retorna datos incorrectos.

---

## H. ARCHIVOS QUE DEBERÍAN MODIFICARSE (si se confirma la causa raíz)

1. **`src/hooks/useSupabaseData.ts`** — Línea 263: Revisar si el JOIN `centros(*)` está causando el problema. Alternativa: eliminar el JOIN y hacer una consulta separada para centros.

2. **`src/hooks/useSupabaseData.ts`** — Línea 239: Agregar verificación explícita de error después de `.single()`. Actualmente solo logea pero no detiene el flujo.

3. **`src/hooks/useSupabaseData.ts`** — Línea 278-282: El guard de fase1 es correcto pero falla silenciosamente. Debería mostrar un error visible al usuario.

---

## I. ARCHIVOS QUE NO DEBERÍAN MODIFICARSE

- `src/utils/autorizacion.ts` — Correcto
- `src/App.tsx` — Correcto (usa currentUserProfile correctamente)
- `src/AppRoutes.tsx` — Correcto
- `src/components/Layout.tsx` — Correcto
- `src/screens/CentroPanel.tsx` — Correcto
- `src/store/appStore.ts` — Correcto
- `src/hooks/useAppInitialization.ts` — Correcto
- `src/hooks/useSupabaseAuth.ts` — Correcto
- `src/types/index.ts` — Correcto

---

## J. DIAGNÓSTICO DE VERIFICACIÓN

Para confirmar cuál hipótesis es correcta, agregar estos logs temporalmente en `src/hooks/useSupabaseData.ts`:

### Log 1 — Después de linea 241:
```typescript
console.log('[DIAG PERFIL] userProfileResult:', JSON.stringify(userProfileResult));
```

### Log 2 — Después de linea 264:
```typescript
console.log('[DIAG PERFIL] perfilesQuery definida, userCentroId:', userCentroId);
```

### Log 3 — Después de linea 276 (después de Promise.all):
```typescript
console.log('[DIAG PERFIL] phase1 resultados:', phase1.map((r, i) => ({
    idx: i, 
    hasData: !!r?.data, 
    hasError: !!r?.error, 
    dataLength: r?.data?.length,
    error: r?.error?.message
})));
```

### Log 4 — Después de linea 285:
```typescript
console.log('[DIAG PERFIL] perfiles raw:', JSON.stringify(perfiles?.slice(0, 2)));
```

### Log 5 — Después de linea 336:
```typescript
console.log('[DIAG PERFIL] mappedPerfiles:', JSON.stringify(mappedPerfiles.slice(0, 2).map(p => ({
    userId: p.userId, 
    centro_id: p.centro_id, 
    rol: p.rol
}))));
```

### Log 6 — Después de linea 338:
```typescript
console.log('[DIAG PERFIL] currentUserProfile:', JSON.stringify({
    userId: currentUserProfile?.userId,
    centro_id: currentUserProfile?.centro_id,
    rol: currentUserProfile?.rol
}));
```

### Log 7 — Después de linea 420:
```typescript
console.log('[DIAG PERFIL] centroRolActual:', JSON.stringify(resolvedCentroRolActual));
```

Con estos 7 logs se podrá identificar EXACTAMENTE dónde se pierde el dato.

---

## K. CONCLUSIÓN

El código de mapping y autorización es **correcto**. No hay errores lógicos en:
- El mapeo de `p.centro_id` → `centro_id`
- El mapeo de `p.rol` → `rol`
- `analizarRolAcceso`
- `esRolAdministrador`
- El routing en App.tsx

El problema está en la **cadena de consultas** de `fetchData()`. La causa más probable es que la consulta con JOIN `centros(*)` falla, provocando que toda la fase 1 sea descartada y `state.perfiles` quede vacío.

**La corrección NO resolvió el problema porque el race condition NO era la causa raíz.** La causa raíz es que `fetchData()` falla silenciosamente y nunca popula `state.perfiles`.
