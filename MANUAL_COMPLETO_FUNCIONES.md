# Manual del Usuario e Interfaces — CIELO

**Nombre del Sistema:** CIELO  
**Tipo:** Plataforma SaaS Educativa (Sistema de Evaluación por Competencias)  
**Autora:** Mary Esther Martínez Escoboza  
**Destino:** Registro de Soporte Material ante la Oficina Nacional de Derecho de Autor (ONDA)  

## 1. Alcance
Este manual documenta, en detalle, las funciones de la interfaz y módulos de la plataforma **CIELO** (Sistema de Evaluación por Competencias):
- Módulos y pantallas.
- Botones, controles y su comportamiento.
- Funciones principales de interfaz y de lógica.
- Flujo de datos y sincronización con Supabase.

Base analizada:
- `src/App.tsx`
- `src/components/*`
- `src/screens/*`
- `src/hooks/useSupabaseData.ts`
- `src/types/index.ts`
- `src/lib/supabase.ts`
- `electron/main.ts`

---

## 2. Mapa general del programa

### 2.1 Navegacion principal (barra inferior)
Pantallas disponibles:
1. Inicio
2. Cursos
3. Indicadores
4. Incidencias
5. Planificacion
6. Comunidad
7. Rubrica
8. Cotejo
9. Estudiante
10. Cerrar (redirige a inicio)

### 2.2 Estado global principal (`AppState`)
Entidades principales:
- Cursos
- Estudiantes
- Actividades
- Calificaciones
- Recuperaciones
- Secuencias
- Incidencias
- Eventos
- Posts
- Rubrica (descriptores, niveles, evaluaciones)
- Cotejo (criterios, evaluaciones)
- Plantillas
- Curso detalle (tabla unificada de evaluacion)
- Perfil docente y notificaciones

### 2.3 Flujo de datos
1. `useSupabaseData` carga sesion y datos.
2. `App.tsx` concentra handlers CRUD y sincronizacion.
3. Cada pantalla recibe handlers y estado via props.
4. Los cambios se reflejan en estado local y en Supabase.
5. Realtime y refresco silencioso mantienen datos actualizados.

---

## 3. Arquitectura tecnica

### 3.1 Frontend
- React + TypeScript + Vite.
- Pantallas en `src/screens`.
- Componentes reutilizables en `src/components`.

### 3.2 Desktop
- Electron con ventana principal:
  - 1200x800
  - Menu oculto
  - Titulo: `Evaluacion por competencias - Dashboard`

### 3.3 Backend
- Supabase:
  - Auth
  - Tablas academicas y comunitarias
  - Storage bucket `avatars`
  - Realtime para `posts`, `notificaciones`, `curso_detalle`

---

## 4. Capa global: `App.tsx` (funciones de negocio)

`App.tsx` es el orquestador central. Aqui viven las funciones de negocio del sistema.

### 4.1 Sesion y presencia
- `updatePresence`: actualiza `perfiles.last_seen` y `current_module` cada 60s.
- `DOCENTE` (memo): deriva nombre docente desde el email.

### 4.2 Perfil e institucion
- `handleUpdateInstituto(nombre)`: guarda nombre de instituto en perfil.
- `handleUpdateBio(bio)`: guarda biografia de perfil.
- `handleUploadAvatar(file)`: sube avatar a storage y guarda URL publica.

### 4.3 Cursos
- `handleAddCurso(c)`: crea curso.
- `handleDeleteCurso(id)`: elimina curso y limpia estudiantes del curso en estado.
- `handleSaveCurso(c)`: actualiza curso.

### 4.4 Estudiantes
- `handleAddEstudiante(cursoId, nombre, apellido)`: crea estudiante individual.
- `handleUpdateEstudiante(e)`: actualiza estudiante.
- `handleDeleteEstudiante(id)`: elimina estudiante.
- `handleAddEstudiantesBulk(cursoId, ests)`: carga masiva de estudiantes.

### 4.5 Calificaciones y recuperaciones
- `handleSaveCalificaciones(califs, recs, cursoIdOverride?)`:
  - Expande calificaciones por competencia BC.
  - Upsert en `calificaciones` y `recuperaciones`.
  - Recalcula BC/puntaje/riesgo de estudiantes.
  - Sincroniza cambios al backend.

### 4.6 Actividades
- `handleAddActividad(a)`: crea actividad + crea evento calendario.
- `handleUpdateActividad(a)`: actualiza actividad.
- `handleDeleteActividad(id)`: elimina actividad.

### 4.7 Indicadores
- `handleSaveIndicadores(cursoId, actividadId, evaluaciones)`:
  - Convierte niveles a puntajes.
  - Guarda en `calificaciones`.
  - Sincroniza detalle en `curso_detalle`.
- `handleUpdateNivelesPuntaje(nps)`: persiste niveles y puntajes.

### 4.8 Incidencias
- `handleAddIncidencia(inc)`: crea incidencia y marca estudiante en riesgo.
- `handleDeleteIncidencia(id)`: elimina incidencia.

### 4.9 Planificacion
- `handleAddSecuencia(seq)`: crea secuencia.
- `handleUpdateSecuencia(sec)`: actualiza secuencia.
- `handleDeleteSecuencia(id)`: elimina secuencia.

### 4.10 Comunidad
- `handleTogglePostLike(postId)`: alterna like/unlike en posts.
- `handleAddPost(newPost)`: crea post.
- `handleImportResource(tipo, resourceData)`: importa recurso como plantilla.

### 4.11 Rubrica y Cotejo
- `handleUpdateCursoDetalle(evalData)`: upsert en tabla unificada `curso_detalle`.
- `handleSaveRubrica(er)`: guarda rubrica y sincroniza calificacion legacy.
- `handleUpdateDescriptor(descriptors)`: guarda descriptores de rubrica.
- `handleSaveCotejo(eval_)`: guarda cotejo y sincroniza calificacion legacy.
- `handleUpdateCriterios(criterios)`: guarda criterios de cotejo.
- `handleSavePlantilla(tipo, nombre, datos)`: crea plantilla (limite 5 por tipo).
- `handleDeletePlantilla(id)`: elimina plantilla.

### 4.12 Operaciones globales
- `handleResetSchoolYear()`: elimina datos del ciclo escolar y resetea estructuras base.
- `handleNavigate(screen, extra?)`: cambia pantalla y curso seleccionado.
- `renderScreen()`: renderiza modulo activo.

---

## 5. Hook de datos: `useSupabaseData`

### 5.1 Funciones principales
- `fetchData(isSilent=false)`:
  - Carga tablas en paralelo.
  - Mapea snake_case -> camelCase.
  - Calcula `likedByMe`.
- `syncUpsert(table, data)`:
  - Convierte a snake_case.
  - Agrega `user_id`.
  - Ejecuta upsert.
- `syncDelete(table, idOrFilter)`:
  - Elimina por id o por filtro objeto.
- `refresh`: alias de `fetchData`.

### 5.2 Realtime y refresco
- Intervalo silencioso cada 120s.
- Suscripciones realtime:
  - `posts`
  - `notificaciones` del usuario
  - `curso_detalle` del usuario

---

## 6. Estructura global visual: `Layout`

### 6.1 Botones y controles globales
1. Boton tema (`onToggleDark`)
2. Boton alertas/pendientes (abre panel lateral de alertas)
3. Items de tareas pendientes (toggle completado)
4. Avatar y bloque docente (abre perfil)
5. Navegacion inferior (10 items)

### 6.2 Panel de perfil (drawer)
Botones:
1. Cerrar panel (`X`)
2. Cambiar avatar (overlay con icono camara)
3. Editar bio (lapiz)
4. `Cancelar` edicion bio
5. `Guardar` bio
6. `Reiniciar ano` (confirmacion + borrado global)
7. `Cerrar sesion` (confirmacion + signout)

Funciones:
- `toggleTask`
- `saveBio`
- `handleAvatarChange`
- `getTagsFromBio` (extrae tags desde URLs en bio)

---

## 7. Modulo Auth (`screens/Auth.tsx`)

### 7.1 Objetivo
Inicio de sesion y registro docente.

### 7.2 Botones y comportamiento
1. `LOGIN`: activa modo login.
2. `REGISTRO`: activa modo registro.
3. `PUBLICA`: seleccion tipo institucion publica.
4. `PRIVADA`: seleccion tipo institucion privada.
5. `Asignaturas` (selector desplegable): abre/cierra lista.
6. Cada asignatura en lista: seleccion multiple.
7. `Crear mi cuenta` / `Ingresar al sistema`:
   - Registro: valida campos, crea usuario, crea/actualiza perfil.
   - Login: autentica y continua.
8. `Problemas con el acceso?`: boton visual sin accion implementada.

### 7.3 Funciones
- `checkInstitution(name)`: busca institucion y cursos existentes.
- `toggleAsignatura(asig)`: agrega/quita materia.
- `handleAuth(e)`: flujo completo login/registro.

---

## 8. Modulo Inicio (`screens/Inicio.tsx`)

### 8.1 Objetivo
Dashboard principal del docente.

### 8.2 Secciones funcionales
- Saludo + instituto editable.
- KPIs: estudiantes, actividades, promedio, cursos.
- Desempeno por competencia (BC1..BC4).
- Portafolio Google Drive (placeholder).
- Estudiantes en riesgo.
- Calendario mensual.
- Proximos eventos.
- Asistente IA (Noether).

### 8.3 Botones
1. `Nueva Actividad` (header): abre modal de actividad.
2. Calendario:
   - Flecha izquierda (mes anterior)
   - Flecha derecha (mes siguiente)
   - Cada dia (filtra eventos por fecha)
3. `Vincular` (Portafolio Google Drive): sin accion implementada.
4. En riesgo:
   - `Perfil` (abre modulo Estudiante)
   - `Curso` (abre Curso Detalle del estudiante)
5. IA:
   - `Consultar Noether`
   - Cerrar respuesta (`X`)
6. Modal actividad:
   - Cerrar (`X`)
   - Botones BC1..BC4 (multi seleccion)
   - `Cancelar`
   - `Generar Actividad`

### 8.4 Funciones
- `avgBC(bc)`
- `handleCreate()`
- `handleConsultarNoether()`:
  - Construye prompt contextual.
  - Llama API Gemini.
  - Muestra respuesta y errores.

Nota:
- La API key esta hardcodeada en este modulo.

---

## 9. Modulo Cursos (`screens/Cursos.tsx`)

### 9.1 Objetivo
Gestion de cursos y acceso a registros.

### 9.2 Botones
1. `Nuevo Curso`
2. `Configurar mi primer curso` (estado vacio)
3. Boton eliminar curso (icono basurero)
4. Editor dias:
   - Click en dias para abrir editor
   - Botones de dias (Lun..Sab)
   - `Cerrar editor`
5. `Calificaciones del ano escolar`
6. `Abrir Registro Academico`
7. Modal:
   - Cerrar (`X`)
   - Dias de clase (toggles)
   - Colores (seleccion visual)
   - `Descartar`
   - `Confirmar Curso`

### 9.3 Funciones
- `handleCreate()`
- `toggleDia(d)`

---

## 10. Modulo Curso Detalle (`screens/CursoDetalle.tsx`)

### 10.1 Objetivo
Registro academico operativo por curso y periodo.

### 10.2 Funciones clave
- Calculo por competencia y promedio:
  - `calcBC`
  - `calcPromedio`
  - `getDestaca`
- Edicion en celda:
  - `startEdit`
  - `commitEdit`
  - `handleKey`
- Persistencia:
  - `handleSave`
- Asignacion multi-BC en actividad:
  - `toggleBc`

### 10.3 Botones y controles
1. `Volver` (flecha izquierda) a Cursos.
2. Checkbox `Soy Tutor Oficial`.
3. `Vincular Equipo` (visible si tutor oficial).
4. Selector de periodo (P1..P4).
5. Buscador estudiante.
6. Boton ocultar/mostrar calificaciones (ojo).
7. `Guardar Registro`.
8. En tarjetas BC:
   - Lapiz para editar descripcion BC.
9. `Nueva Actividad` (creacion rapida "Sin nombre").
10. Tabla:
   - Botones BC por actividad (mapea actividad a BC multiples).
   - Eliminar actividad.
   - Editar nombre actividad y fecha.
   - Editar nombre/apellido estudiante inline.
   - Pegado multilinea en nombre (crea estudiantes en lote).
   - Eliminar estudiante.
   - Celdas de nota y recuperacion editables.
11. Footer:
   - `Inscribir Estudiante` (crea estudiante base "Nuevo estudiante").
12. Modal `Vincular Equipo`:
   - Select por area curricular.
   - `Cerrar y Guardar`.

### 10.4 Modales presentes pero no activados por boton visible
Existen estados/modales para:
- `showAddEst` (Nuevo Estudiante modal)
- `showAddAct` (Nueva Actividad modal)

En la vista actual no hay boton directo que cambie esos estados a `true`.

---

## 11. Modulo Indicadores (`screens/Indicadores.tsx`)

### 11.1 Objetivo
Evaluar por niveles de logro (1-4) y convertir a puntajes.

### 11.2 Botones
1. `Terminar Evaluacion`
2. Select `Curso`
3. Select `Actividad` con opcion `- Nueva Actividad`
4. Por cada estudiante: botones redondos `4`, `3`, `2`, `1`
5. Modal nueva actividad:
   - Cerrar (`X`)
   - `Cancelar`
   - `Crear actividad`

### 11.3 Funciones
- `normalizeLevels`
- `getNearestLevel`
- `handleLevelSelection(estudianteId, nivel)`
- `handleFinishEvaluation()`
- `handleCreateActivity()`

---

## 12. Modulo Incidencias (`screens/Incidencias.tsx`)

### 12.1 Objetivo
Registrar y gestionar incidencias disciplinarias/academicas.

### 12.2 Botones
1. Busqueda estudiantes (resultados clicables).
2. Quitar estudiante seleccionado (basurero).
3. Categoria:
   - Conducta
   - Academico
   - Salud
   - Otro
4. Gravedad:
   - Primera Vez
   - Recurrente
   - Persistente
5. Medidas institucionales (toggles):
   - Llamado verbal
   - Nota a padres
   - Orientacion
   - Compromiso
   - Reconocimiento
   - Servicio
   - Direccion
6. `Formalizar Incidencia`
7. Historial:
   - Boton exportacion (abre Google Sheets)
   - Boton eliminar incidencia por fila

### 12.3 Funciones
- `toggleAccion`
- `toggleEstudiante`
- `handleSubmit`

---

## 13. Modulo Planificacion (`screens/Planificacion.tsx`)

### 13.1 Objetivo
Gestion de secuencias didacticas y visualizacion en modo lector/presentacion.

### 13.2 Botones
1. `Nueva secuencia`
2. Tarjeta secuencia (abre visor)
3. En visor:
   - Select estado: Pendiente / En progreso / Completada
   - `Modo presentacion` / `Salir de presentacion`
   - Eliminar secuencia (si handler disponible)
   - Cerrar visor (`X`)
4. Modal nueva planificacion:
   - Cerrar (`X`)
   - `Cancelar`
   - `Publicar secuencia`

### 13.3 Funciones
- `handleCreate`
- `handleCloseViewer`
- `togglePresentation`

---

## 14. Modulo Comunidad (`screens/Comunidad.tsx`)

### 14.1 Objetivo
Publicar, explorar y reutilizar recursos pedagogicos.

### 14.2 Controles
- Filtros por tag/asignatura.
- Busqueda de posts.
- Feed principal.
- Instrumentos destacados.
- Sidebar:
  - Top colaboradores
  - Docentes conectados

### 14.3 Botones feed
1. Filtros `Todos`, `Matematicas`, `Espanol`, etc.
2. `Like` (manzana).
3. `Ver` recurso (ojo).
4. `Usar` recurso (add_circle) cuando tipo != general.
5. Avatar/autor clicable (abre perfil via evento global).

### 14.4 Botones instrumentos destacados
1. `Ver` recurso
2. `Usar` recurso

### 14.5 Modales
1. Preview recurso:
   - `Cerrar`
   - `Importar Recurso`
2. Confirmacion importacion:
   - `Confirmar Importacion`
   - `Cancelar`

### 14.6 Funciones
- `getRemainingDays`
- `handleUseResource`
- `getTipoLabel`
- `getTipoColor`
- `getModuleActivity`

---

## 15. Componente PostComposer (`components/PostComposer.tsx`)

### 15.1 Objetivo
Componer y publicar post (general o con recurso).

### 15.2 Botones
Estado colapsado:
1. `Idea`
2. `Secuencia`
3. `Rubrica`

Estado expandido:
1. Boton icono imagen (sin handler funcional)
2. Boton icono archivo (sin handler funcional)
3. `Descartar`
4. `Publicar Ahora`

Controles:
- Select categoria de post.
- Select asignatura.
- Select recurso vinculado (si tipo != general).

### 15.3 Funcion
- `handleShare()`:
  - Construye contenido final.
  - Adjunta `recursoDatos` si aplica.
  - Publica via `onAddPost`.

---

## 16. Modulo Rubrica (`screens/Rubrica.tsx`)

### 16.1 Objetivo
Evaluar por rubrica multicriterio, individual o grupal.

### 16.2 Funciones clave
- Estructura:
  - `normalizeDescriptors`
  - `toRichHtml`
- Edicion rich text:
  - `syncInlineToolbar`
  - `applyInlineFormat`
- Evaluacion:
  - `handleSelect`
  - `handleAvatarClick`
  - `calcPuntajeTotalWithSelection`
  - `handleSave`
  - `handleFinalizeGroupEvaluation`
- Plantillas:
  - `handleLoadTemplate`
  - `handleSaveTemplate`
- Pegado masivo:
  - `handleRubricaPaste` (tablas TSV/Excel)

### 16.3 Botones y controles
Sidebar:
1. Colapsar/expandir sidebar.
2. Select curso.
3. Select actividad.
4. Select plantilla.
5. `Guardar como Plantilla`.
6. En modo colapsado: acceso rapido Plantillas.

Header:
1. Boton principal `Finalizar Evaluacion` (o multi alumnos).
2. `Cancelar` asignacion activa.

Seleccion de estudiantes:
1. Toggle `Auto-avance Estudiante`.
2. Avatar de estudiante (seleccion/asignacion por lote).

Tabla rubrica:
1. Click en celda de nivel para activar seleccion.
2. Toolbar inline:
   - `B` negrita
   - `I` italica
   - 3 botones de color
3. Edicion inline de texto por descriptor/nivel.
4. Inputs editables de nombre nivel y puntaje.

Parte final:
1. `Finalizar Registro` (resumen).

---

## 17. Modulo Cotejo (`screens/Cotejo.tsx`)

### 17.1 Objetivo
Evaluacion por lista de cotejo con niveles configurables.

### 17.2 Funciones clave
- `calcPuntajeWithRespuestas`
- `handleSave`
- `handleFinalizeGroupEvaluation`
- `handleSelectCell`
- `handleAvatarClick`

### 17.3 Botones y controles
Sidebar:
1. Colapsar/expandir.
2. Select curso.
3. Select actividad.
4. Select plantilla.
5. Eliminar plantilla seleccionada.
6. `Guardar como Plantilla`.
7. `Nuevo Criterio`.
8. En modo colapsado: accesos Plantillas y Nuevo Criterio.

Header:
1. Boton principal `Finalizar Evaluacion`.
2. `Cancelar` asignacion activa.

Seleccion de estudiantes:
1. Toggle `Auto-avance Estudiante`.
2. Avatares de estudiantes.

Tabla:
1. Seleccion de nivel por criterio.
2. Boton eliminar criterio por fila.
3. Edicion inline de titulo y descripcion de criterio.
4. Edicion inline de etiqueta y puntaje de niveles.

Zona de acciones:
1. `Criterio` (abre modal nuevo criterio).
2. `Guardar`.

Modal nuevo criterio:
1. Cerrar (`X`)
2. `Cancelar`
3. `Confirmar`

---

## 18. Modulo Estudiante (`screens/Estudiante.tsx`)

### 18.1 Objetivo
Vista individual del estudiante: perfil, metricas, fortalezas y registro oficial.

### 18.2 Botones
1. `Volver a Cursos`
2. Selector de estudiante.
3. `Ver Curso`
4. Habilidades:
   - `+ Anadir`
   - `Anadir`
   - `X` cancelar input
5. Evidencias:
   - `Subir Archivo` (placeholder visual sin handler)
6. Selector de periodo:
   - P1
   - P2
   - P3
   - P4

### 18.3 Funciones
- `handleStudentChange`
- `handleAnadirHabilidad` (nombre en codigo: `handleAñadirHabilidad`)
- `renderGradesCells(area)` para tabla oficial consolidada.

---

## 19. Modulo Calificaciones Anuales (`screens/CalificacionesAnuales.tsx`)

### 19.1 Objetivo
Consolidado anual por estudiante con campos complementivos/extraordinarios/especiales.

### 19.2 Botones
1. `Volver a Cursos`
2. `Imprimir Reporte`
3. `Exportar PDF` (sin handler funcional)

### 19.3 Inputs manuales
Por estudiante:
- C.E.C
- C.E.EX
- C.F (especial)
- C.E (especial)

### 19.4 Funciones
- `calculatePC(bc)`
- `handleManualInput(estId, field, value)`
- `handlePrint()`

---

## 20. Catalogo tecnico de funciones por modulo

Resumen de funciones declaradas en el codigo (principales):

### 20.1 App (negocio global)
- `computeEstudianteBCs`
- `handleUpdateInstituto`
- `handleUpdateBio`
- `handleUploadAvatar`
- `handleAddCurso`
- `handleDeleteCurso`
- `handleSaveCurso`
- `handleAddEstudiante`
- `handleUpdateEstudiante`
- `handleDeleteEstudiante`
- `handleAddEstudiantesBulk`
- `handleSaveCalificaciones`
- `handleAddActividad`
- `handleUpdateActividad`
- `handleDeleteActividad`
- `handleSaveIndicadores`
- `handleUpdateNivelesPuntaje`
- `handleAddIncidencia`
- `handleDeleteIncidencia`
- `handleAddSecuencia`
- `handleUpdateSecuencia`
- `handleDeleteSecuencia`
- `handleTogglePostLike`
- `handleAddPost`
- `handleImportResource`
- `handleUpdateCursoDetalle`
- `handleSaveRubrica`
- `handleUpdateDescriptor`
- `handleSaveCotejo`
- `handleUpdateCriterios`
- `handleSavePlantilla`
- `handleDeletePlantilla`
- `handleResetSchoolYear`
- `handleNavigate`
- `renderScreen`

### 20.2 Datos/sincronizacion
- `fetchData`
- `syncUpsert`
- `syncDelete`

### 20.3 UI global
- Layout: `toggleTask`, `saveBio`, `handleAvatarChange`

### 20.4 Auth
- `checkInstitution`
- `toggleAsignatura`
- `handleAuth`

### 20.5 Inicio
- `avgBC`
- `handleCreate`
- `handleConsultarNoether`

### 20.6 Cursos
- `handleCreate`
- `toggleDia`

### 20.7 CursoDetalle
- `getCalif`, `setCalif`
- `getRec`, `setRec`
- `calcBC`, `calcPromedio`, `getDestaca`
- `toggleBc`
- `startEdit`, `commitEdit`, `handleKey`
- `handleSave`

### 20.8 Indicadores
- `normalizeLevels`
- `getLevelScore`
- `getNearestLevel`
- `handleLevelSelection`
- `handleFinishEvaluation`
- `handleCreateActivity`

### 20.9 Incidencias
- `toggleAccion`
- `toggleEstudiante`
- `handleSubmit`

### 20.10 Planificacion
- `handleCreate`
- `handleCloseViewer`
- `togglePresentation`

### 20.11 Comunidad
- `handleUseResource`
- `getTipoLabel`, `getTipoColor`
- `getModuleActivity`

### 20.12 Rubrica
- `handleSelect`
- `handleAvatarClick`
- `handleSave`
- `handleFinalizeGroupEvaluation`
- `handleLoadTemplate`
- `handleSaveTemplate`
- `handleRubricaPaste`
- `applyInlineFormat`

### 20.13 Cotejo
- `calcPuntajeWithRespuestas`
- `handleSave`
- `handleFinalizeGroupEvaluation`
- `handleSelectCell`
- `handleAvatarClick`

### 20.14 Estudiante
- `handleStudentChange`
- `handleAnadirHabilidad`
- `renderGradesCells`

### 20.15 Calificaciones anuales
- `calculatePC`
- `handleManualInput`
- `handlePrint`

---

## 21. Componentes existentes sin uso directo en flujo actual

1. `StudentSelectionModal.tsx`
- Diseñado para evaluacion multiple seleccionando estudiantes.
- Incluye seleccion total, chips de seleccion y confirmacion.
- No esta conectado en ninguna pantalla activa.

2. `AutoGrowTextarea.tsx`
- Textarea con auto crecimiento.
- No esta referenciado actualmente en otras vistas.

---

## 22. Comportamientos actuales importantes (operativos)

1. `Exportar PDF` en Calificaciones Anuales:
- Boton presente, sin accion implementada.

2. `Vincular` en Portafolio Google Drive (Inicio):
- Boton presente, sin logica conectada.

3. Botones de media en PostComposer (imagen/archivo):
- Botones visuales sin flujo de carga implementado.

4. En Auth existe logica para vincular curso existente (`selectedCourseId`):
- No hay control visible en el formulario para seleccionar curso.

5. En CursoDetalle existen modales de alta (`showAddEst`, `showAddAct`) que no se disparan con boton visible en esta version.

---

## 23. Recomendacion de uso operativo (flujo sugerido)

1. Registrar curso y estudiantes en `Cursos`.
2. Definir y revisar actividades en `Curso Detalle`.
3. Evaluar rapidamente en `Indicadores`.
4. Usar `Rubrica` o `Cotejo` para evaluaciones cualitativas detalladas.
5. Registrar eventos de conducta en `Incidencias`.
6. Revisar analitica y alertas en `Inicio`.
7. Consolidar reportes en `Calificaciones Anuales`.
8. Compartir instrumentos en `Comunidad`.

---

## 24. Tablas y recursos Supabase usados por el programa

Tablas consultadas o actualizadas:
- `perfiles`
- `cursos`
- `estudiantes`
- `actividades`
- `calificaciones`
- `recuperaciones`
- `secuencias`
- `incidencias`
- `eventos`
- `posts`
- `post_likes`
- `notificaciones`
- `docentes`
- `descriptores_rubrica`
- `niveles_puntaje`
- `evaluaciones_rubrica`
- `criterios_cotejo`
- `evaluaciones_cotejo`
- `plantillas`
- `curso_detalle`
- `instituciones` (registro en Auth)

Storage:
- Bucket `avatars` para foto de perfil docente.

Auth:
- `supabase.auth.signUp`
- `supabase.auth.signInWithPassword`
- `supabase.auth.signOut`

---

## 25. Referencias de archivos clave
- `src/App.tsx`
- `src/hooks/useSupabaseData.ts`
- `src/components/Layout.tsx`
- `src/screens/Auth.tsx`
- `src/screens/Inicio.tsx`
- `src/screens/Cursos.tsx`
- `src/screens/CursoDetalle.tsx`
- `src/screens/Indicadores.tsx`
- `src/screens/Incidencias.tsx`
- `src/screens/Planificacion.tsx`
- `src/screens/Comunidad.tsx`
- `src/components/PostComposer.tsx`
- `src/screens/Rubrica.tsx`
- `src/screens/Cotejo.tsx`
- `src/screens/Estudiante.tsx`
- `src/screens/CalificacionesAnuales.tsx`
- `src/types/index.ts`
- `electron/main.ts`
