# FASE 1 — RESULTADO

**Fecha:** 2026-09-09
**Estado:** COMPLETADA

---

## 1. Veredicto

```
R0 NO CONFIRMADO
```

---

## 2. Estado de BD antes (según archivos SQL)

### Tabla `tareas_institucionales`

```sql
CREATE TABLE IF NOT EXISTS public.tareas_institucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    prioridad TEXT DEFAULT 'normal',
    fecha_limite TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Políticas RLS (versión `migration_gestion_institucional.sql`)

| Política | Operación | USING | WITH CHECK |
|----------|-----------|-------|------------|
| `tareas_inst_select` | SELECT | `centro_id = public.get_user_centro_id() OR EXISTS (SELECT 1 FROM centro_roles cr WHERE cr.centro_id = tareas_institucionales.centro_id AND cr.user_id = auth.uid())` | — |
| `tareas_inst_insert` | INSERT | — | `EXISTS (SELECT 1 FROM centro_roles cr WHERE cr.centro_id = centro_id AND cr.user_id = auth.uid() AND cr.rol IN ('director', 'administrador'))` |
| `tareas_inst_manage` | UPDATE | `EXISTS (SELECT 1 FROM centro_roles cr WHERE cr.centro_id = centro_id AND cr.user_id = auth.uid() AND cr.rol IN ('director', 'administrador'))` | — |
| `tareas_inst_delete` | DELETE | `EXISTS (SELECT 1 FROM centro_roles cr WHERE cr.centro_id = centro_id AND cr.user_id = auth.uid() AND cr.rol IN ('director', 'administrador'))` | — |

### Función auxiliar `get_user_centro_id()`

```sql
CREATE OR REPLACE FUNCTION public.get_user_centro_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT centro_id FROM public.perfiles WHERE user_id = auth.uid() LIMIT 1;
$$;
```

---

## 3. Modelo de autorización confirmado

```
usuario
  → auth.uid()
    → perfiles.user_id
      → perfiles.centro_id
        → centro_roles.centro_id + user_id + rol
          → tareas_institucionales.centro_id
```

**Cadena de validación:**
1. El usuario se autentica (`auth.uid()`)
2. Se obtiene su `centro_id` desde `perfiles` (via `get_user_centro_id()`)
3. Se verifica su rol en `centro_roles` (para operaciones de escritura)
4. El `centro_id` de la tarea debe coincidir con el centro del usuario

---

## 4. Matriz de pruebas antes (análisis estático)

| Actor | Centro | Tarea | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|-------|--------|--------|--------|--------|
| Director | A | A | ✅ permitido | ✅ permitido | ✅ permitido | ✅ permitido |
| Director | A | B | ❌ denegado | ❌ denegado | ❌ denegado | ❌ denegado |
| Administrador | A | A | ✅ permitido | ✅ permitido | ✅ permitido | ✅ permitido |
| Administrador | A | B | ❌ denegado | ❌ denegado | ❌ denegado | ❌ denegado |
| Docente | A | A | ✅ permitido | ❌ denegado | ❌ denegado | ❌ denegado |
| Docente | A | B | ❌ denegado | ❌ denegado | ❌ denegado | ❌ denegado |
| Sin relación | — | A | ❌ denegado | ❌ denegado | ❌ denegado | ❌ denegado |

---

## 5. Vulnerabilidad

**NO CONFIRMADA**

### Análisis de la hipótesis R0

La hipótesis R0 afirmaba que existía una expresión tautológica `cr.centro_id = cr.centro_id` en las políticas de `tareas_institucionales`.

**Evidencia encontrada:**

| Fuente | Expresión real | ¿Tautológica? |
|--------|---------------|----------------|
| `migration_gestion_institucional.sql:56,68,79` | `cr.centro_id = centro_id` | **NO** |
| `migration_tareas_institucionales.sql:85` | `cr.centro_id::text = centro_id::text` | **NO** |

**Explicación:**

En el contexto de una política RLS sobre `tareas_institucionales`:
- `cr.centro_id` = columna de la tabla `centro_roles` (alias `cr` en la subconsulta)
- `centro_id` (sin prefijo) = columna de la tabla actual `tareas_institucionales`

La expresión `cr.centro_id = centro_id` relaciona correctamente:
- El centro del rol del usuario (`centro_roles.centro_id`)
- Con el centro de la tarea (`tareas_institucionales.centro_id`)

**Conclusión:** La expresión **NO es tautológica** y **SÍ garantiza aislamiento por centro**.

### Inconsistencia en documentación

El informe `INFORME_AUDITORIA_FRONTEND_FASE_05.md:248` menciona:
> "referencia la política con `cr.centro_id = cr.centro_id`"

Sin embargo, los archivos SQL reales contienen `cr.centro_id = centro_id` (sin el segundo `cr.`).

**Posibles causas de la inconsistencia:**
1. El informe se basó en una versión anterior de la política
2. Error de transcripción en la documentación
3. La política en la BD es diferente a la de los archivos SQL (no verificable sin acceso directo)

---

## 6. Cambio realizado

**NINGUNO**

No se modificaron políticas, tablas, funciones ni código.

**Razón:** R0 no fue confirmado con evidencia de los archivos SQL disponibles.

---

## 7. Rollback

**No aplica** — no se realizaron cambios.

---

## 8. Matriz de pruebas después

**Idéntica a la matriz "antes"** — no hubo cambios.

---

## 9. Comparación antes/después

| Criterio | Resultado |
|----------|-----------|
| Permisos legítimos conservados | SÍ (no hubo cambios) |
| Acceso cross-center bloqueado | SÍ (políticas correctas) |
| UPDATE cross-center bloqueado | SÍ (políticas correctas) |
| DELETE cross-center bloqueado | SÍ (políticas correctas) |
| Riesgo de cambio de centro mediante UPDATE | NO (políticas correctas) |

---

## 10. Archivos modificados

```
Código frontend: ninguno.
Políticas RLS: ninguna.
Archivos SQL: ninguno.
Documentación: solo este archivo (docs/auditoria-escalabilidad-fase-1.md).
```

---

## 11. Hallazgos adicionales

### H1: Frontend carga tareas sin filtro explícito

**Ubicación:** `src/hooks/useSupabaseData.ts:958`

```typescript
supabase.from('tareas_institucionales').select('*'),
```

**Análisis:** Esto es **correcto** porque RLS se encarga de filtrar por centro. La política `tareas_inst_select` garantiza que cada usuario solo vea las tareas de su centro.

### H2: DELETE usa acceso directo a la tabla

**Ubicación:** `src/hooks/useTareaActions.ts:155-158`

```typescript
const { error } = await supabase
    .from('tareas_institucionales')
    .delete()
    .eq('id', tareaId);
```

**Análisis:** Esto es **correcto** porque:
1. La política `tareas_inst_delete` verifica que el usuario sea director/administrador del centro
2. RLS garantiza que solo pueda eliminar tareas de su centro

### H3: Creación usa RPC SECURITY DEFINER

**Ubicación:** `src/hooks/useTareaActions.ts:23`

```typescript
const { data: rpcData, error: rpcError } = await supabase.rpc('crear_tarea_institucional', {...});
```

**Análisis:** Correcto — la RPC `crear_tarea_institucional` es `SECURITY DEFINER` y valida internamente que el usuario sea director/administrador del centro.

### H4: Inconsistencia en documentación

El informe `INFORME_AUDITORIA_FRONTEND_FASE_05.md` menciona una expresión tautológica que no existe en los archivos SQL.

**Recomendación:** Verificar directamente en la BD qué políticas están aplicadas ejecutando:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tareas_institucionales';
```

---

## 12. Recomendación para Fase 2

La Fase 1 no encontró vulnerabilidades en `tareas_institucionales`. Sin embargo, se recomienda:

1. **Verificación directa en BD:** Ejecutar la consulta SQL del hallazgo H4 para confirmar que las políticas aplicadas coinciden con las de los archivos SQL.

2. **Reducir consultas sin filtro:** El frontend carga `tareas_institucionales` con `SELECT *` sin filtro explícito. Aunque RLS protege los datos, sería más eficiente filtrar por centro en el frontend para reducir el payload.

3. **Auditar otras tablas:** Las tablas `eventos`, `grupos`, `calendario_minerd` también se cargan sin filtro explícito (hallazgo S3 del informe anterior). Deberían auditarse en la Fase 2.

4. **Revisar la política SELECT:** La política actual permite ver tareas si el usuario tiene cualquier rol en el centro (incluso si no es director/administrador). Esto podría ser intencional (para que los docentes vean tareas asignadas) o un problema de diseño. Verificar con el propietario del proyecto.

---

## Conclusión

**R0 NO ESTÁ CONFIRMADO** según la evidencia disponible en los archivos SQL.

Las políticas RLS de `tareas_institucionales` son correctas y garantizan aislamiento por centro. La expresión `cr.centro_id = centro_id` no es tautológica y relaciona correctamente el centro del usuario con el centro de la tarea.

**No se realizó ningún cambio.** La Fase 1 se considera completada en Estado B.

---

*Documento generado el 2026-09-09 como parte de la auditoría de escalabilidad y seguridad de CIELO.*
