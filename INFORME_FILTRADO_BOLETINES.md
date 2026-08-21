# Informe: Filtrado de datos en los boletines (CIELO)

> Documento técnico que explica **cómo** y **dónde** se filtran los datos desde que son consultados hasta que se generan e imprimen los boletines de calificaciones.

---

## 1. Resumen ejecutivo

El sistema **CIELO** no realiza consultas declarativas (SQL/QL) para filtrar los datos de los boletines. Todo el filtrado se ejecuta **en memoria** mediante operaciones de arreglo (`Array.prototype.filter` / `.find`) sobre el estado global de la aplicación (`AppState`), que se obtiene a través del store `useAppStore`.

El flujo de filtrado se compone de **3 capas consecutivas**:

| Capa | Archivo | Qué filtra |
|------|---------|------------|
| 1. Vista administrativa | `src/components/centro/CentroBoletines.tsx` | Cursos del centro y estudiantes del curso seleccionado |
| 2. Render/impresión | `src/screens/PrintBoletines.tsx` y `src/components/centro/BoletinesPrintOverlay.tsx` | Estudiantes a imprimir y plantilla por grado |
| 3. Cálculo de notas | `src/utils/boletines.ts` | Actividades, calificaciones y recuperaciones por asignatura/periodo/competencia |

El criterio clave que atraviesa todas las capas es el **`sharedCourseId`**: un curso puede compartir estudiantes, actividades, calificaciones y recuperaciones con otros cursos (asignaturas duales), por lo que el filtrado involucra siempre un **OR** entre `cursoId` y `sharedCourseId`.

---

## 2. Datos de origen

Todas las fuentes provienen del estado global (`AppState`):

| Colección | Tipo relevante | Campos usados en el filtrado |
|-----------|----------------|------------------------------|
| `state.cursos` | `Curso` | `id`, `cent
roId`, `sharedCourseId`, `grado`, `userId` |
| `state.estudiantes` | `Estudiante` | `cursoId`, `sharedCourseId`, `numeroLista` |
| `state.actividades` | `Actividad` | `cursoId`, `sharedCourseId`, `asignatura`, `periodo`, `bcAsignados`, `nombre` |
| `state.calificaciones` | `CalificacionActividad` | `estudianteId`, `asignatura`, `actividadId`, `periodo` |
| `state.recuperaciones` | `RecuperacionBC` | `estudianteId`, `asignatura`, `periodo`, `bc` |
| `state.perfiles` | — | `userId` (para el nombre del docente titular) |

---

## 3. Capa 1 — Vista administrativa (`CentroBoletines.tsx`)

### 3.1 Filtrado de cursos del centro

`src/components/centro/CentroBoletines.tsx:16-27`

```ts
const cursosCentro = (state.cursos || [])
    .filter(c => c.centroId === centroId)          // (1) solo cursos del centro
    .filter(c => {                                  // (2) deduplicar por sharedCourseId
        const key = c.sharedCourseId || String(c.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    })
    .sort(...);
```

- **(1)** Se conservan únicamente los cursos cuya `centroId` coincide con el centro activo.
- **(2)** Cuando varios cursos comparten el mismo `sharedCourseId` (p. ej. "Matemática" y "Lengua" del mismo grupo), se muestra **uno solo** en el selector. La primera ocurrencia gana.

### 3.2 Filtrado de estudiantes del curso seleccionado

`src/components/centro/CentroBoletines.tsx:37-45`

```ts
const estudiantesCurso = state.estudiantes.filter(e =>
    e.cursoId === selectedCurso.id ||
    (selectedCurso.sharedCourseId && e.sharedCourseId === selectedCurso.sharedCourseId)
);
```

Incluye a todo estudiante matriculado directamente en el curso **o** compartido vía `sharedCourseId`. El conteo mostrado ("Estudiantes") proviene de este arreglo.

---

## 4. Capa 2 — Render e impresión

### 4.1 `PrintBoletines.tsx` (ruta `/print-boletines/:cursoId`)

`src/screens/PrintBoletines.tsx:24-32`

- **Curso**: `state.cursos.find(c => c.id === cursoId)` tomado del parámetro de la URL.
- **Estudiantes**: mismo criterio de la capa 1, ordenados por `numeroLista`:

```ts
state.estudiantes
    .filter(e => e.cursoId === cursoId || (curso?.sharedCourseId && e.sharedCourseId === curso.sharedCourseId))
    .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));
```

### 4.2 `BoletinesPrintOverlay.tsx` (overlay desde el panel del centro)

`src/components/centro/BoletinesPrintOverlay.tsx:25` — aplica el **mismo** filtro `cursoId`/`sharedCourseId`.

### 4.3 Selección de plantilla por grado

`src/screens/PrintBoletines.tsx:49-59` — se elige la plantilla de boletín según `curso.grado`:

| Grado detectado | Plantilla |
|-----------------|-----------|
| `1` | `Boletin1ero` |
| `2` | `Boletin2do` |
| `3` | `Boletin3ero` |
| `4` | `Boletin4to` |
| `5` | `Boletin5to` |
| `6` | `Boletin6to` |
| otro / sin curso | `Boletin2do` (fallback) |

### 4.4 Guardas de renderizado

- Si `curso` no existe → mensaje de error en pantalla.
- Si `estudiantes.length === 0` → pantalla "No hay estudiantes matriculados en este curso".

---

## 5. Capa 3 — Cálculo de notas (`src/utils/boletines.ts`)

La función `computeStudentGrades(estudiantes, state, cursoId, curso)` procesa **por estudiante → por asignatura → por periodo (P1–P4) → por competencia (BC1–BC4)**.

### 5.1 Filtrado de actividades de la asignatura

`src/utils/boletines.ts:44-47`

```ts
const activities = state.actividades.filter(a =>
    (a.cursoId === cursoId ||
     (curso?.sharedCourseId && state.cursos.find(cx => cx.id === a.cursoId)?.sharedCourseId === curso.sharedCourseId)) &&
    a.asignatura === asig.id
);
```

- El curso de la actividad debe ser el curso actual **o** compartir `sharedCourseId` con el curso del boletín.
- La actividad debe pertenecer a la asignatura del catálogo que se está calculando (`ASIGNATURAS_CATALOGO`).

### 5.2 Filtrado de calificaciones y recuperaciones

`src/utils/boletines.ts:49-57`

```ts
const qualifications = state.calificaciones.filter(c =>
    c.estudianteId === est.id && c.asignatura === asig.id);
const recoveries = state.recuperaciones.filter(r =>
    r.estudianteId === est.id && r.asignatura === asig.id);
```

Solo se toman las calificaciones/recuperaciones **del estudiante** y **de la asignatura** en proceso.

### 5.3 Filtrado por periodo, competencia y tipo (el más fino)

`src/utils/boletines.ts:62-66`

```ts
const periodBCActs = activities.filter(a =>
    a.periodo === p &&                 // (1) periodo P1/P2/P3/P4
    a.nombre !== 'Recuperación' &&     // (2) excluye actividades de recuperación
    a.bcAsignados?.includes(bc));      // (3) la actividad trabaja esa competencia BC
```

1. Solo actividades del periodo evaluativo actual.
2. Las actividades cuyo nombre es literalmente `'Recuperación'` **no** participan en el cálculo del promedio regular (se gestionan por separado vía `recuperaciones`).
3. La actividad debe tener la competencia en su arreglo `bcAsignados`.

### 5.4 Asociación calificación → actividad

`src/utils/boletines.ts:68-69`

```ts
const rawScores = periodBCActs
    .map(a => qualifications.find(q => q.actividadId === a.id)?.puntaje ?? 0);
```

La calificación se enlaza por `actividadId`; si no existe, se asume `0`.

### 5.5 Cálculo final e incorporación de recuperaciones

`src/utils/boletines.ts:71-76`

```ts
const avg = periodBCActs.length ? Math.round(suma / periodBCActs.length) : null;
const rec = recoveries.find(r => r.periodo === p && Number(r.bc) === bcNum)?.puntaje ?? null;
const finalBCScore = (rec !== null && (avg === null || avg < 70)) ? rec : avg;
```

- **PC (promedio de competencia)**: se calcula solo si **los 4 periodos** tienen nota (`hasAllPeriods`), promediando P1–P4.
- **Calificación Final del Área (C.F.)**: se calcula solo si las **4 competencias** tienen PC, promediando los 4.
- **Recuperación**: reemplaza al promedio únicamente cuando el promedio es `null` o `< 70`.

---

## 6. Reglas de negocio que condicionan el filtrado

1. **Curso compartido**: el OR `cursoId || sharedCourseId` se replica en estudiantes, actividades y overlay. Es la regla que conecta asignaturas duales del mismo grupo.
2. **Exclusión de recuperaciones del promedio regular**: el filtro `a.nombre !== 'Recuperación'` evita que notas de recuperación inflen el promedio de actividades.
3. **Validez condicional de agregados**:
   - PC requiere 4/4 periodos con nota.
   - C.F. requiere 4/4 competencias con PC.
   - Esto significa que un faltante en un periodo "desactiva" silenciosamente los promedios superiores.
4. **Orden de impresión**: `numeroLista` ascendente.

---

## 7. Diagrama de flujo

```
Panel del centro (CentroBoletines)
   │  filtro: centroId + dedupe sharedCourseId
   ▼
Selección de curso
   │  filtro estudiantes: cursoId OR sharedCourseId
   ▼
Descargar boletines
   ▼
BoletinesPrintOverlay ──►  PrintBoletines (/print-boletines/:id)
   │                             │
   │                             ├─ Plantilla por grado
   │                             └─ computeStudentGrades()
   │                                   │ actividades: curso/shared + asignatura + periodo + BC + no-Recup
   │                                   │ calificaciones: estudiante + asignatura
   │                                   │ recuperaciones: estudiante + asignatura (+ lógica <70)
   │                                   ├─ PC (si 4 periodos)
   │                                   └─ C.F. (si 4 competencias)
   ▼
Boletín impreso
```

---

## 8. Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/components/centro/CentroBoletines.tsx` | Filtro de cursos/estudiantes y lanzador de descarga |
| `src/components/centro/BoletinesPrintOverlay.tsx` | Overlay de impresión (filtro de estudiantes) |
| `src/screens/PrintBoletines.tsx` | Vista de impresión (plantilla por grado + estudiantes) |
| `src/utils/boletines.ts` | `computeStudentGrades`: filtrado fino y cálculo |
| `src/templates/boletines/types.ts` | Interfaz `BoletinTemplateProps` (contrato de la plantilla) |
| `src/templates/boletines/Boletin{1ero..6to}.tsx` | Plantillas de impresión por grado |
| `src/types/index.ts` | Tipos `Curso`, `Estudiante`, `Actividad`, `CalificacionActividad`, `RecuperacionBC`, `BCKey` |
| `src/AppRoutes.tsx` | Ruta `/print-boletines/:cursoId` |

---

## 9. Observaciones y posibles mejoras

- **Centralizar el criterio de pertenencia a curso** en una única utilidad (p. ej. `perteneceAlCurso(curso, elemento)`) para evitar divergencias entre las 3 capas, que hoy repiten el mismo OR.
- **Los `sharedCourseId` se comparan en memoria** recorriendo `state.cursos` por cada actividad (`state.cursos.find(...)`), lo cual es `O(cursos × actividades)`; aceptable a esta escala, pero mejorable con un `Map`.
- **`a.nombre !== 'Recuperación'`** es una comparación frágil por texto; convendría usar `isRec` (campo booleano ya definido en `Actividad`).
- Los promedios que quedan `null` por datos incompletos no se muestran ni se advierten al usuario; podría añadirse indicación visual de "datos incompletos".