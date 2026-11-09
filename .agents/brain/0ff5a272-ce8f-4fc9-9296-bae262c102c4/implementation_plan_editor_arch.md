# Plan de Refactorización de Arquitectura de Editor.js

El objetivo es implementar estrictamente la arquitectura solicitada sin hacks ni IDs dinámicos temporales, asegurando que el ciclo de vida de Editor.js sea impecable.

## 1. `PlanClasesIndex.tsx` (NotasView)
- Controlará el estado local: `const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(notaIdUrl || null)`.
- Si `notaSeleccionadaId === null`, renderiza la lista de notas al 100% de ancho.
- Si `notaSeleccionadaId !== null`, renderiza el layout dividido: Lista (izq) y `PanelEditor` (der).
- Al seleccionar una nota, actualiza el estado y la URL. Al cerrar, actualiza el estado y la URL.

## 2. `NuevaNotaClase.tsx` (PanelEditor)
- Recibirá `notaId`.
- No destruirá/recreará `NotaEditor` de forma condicional mediante renderizados. Simplemente montará `<NotaEditor notaId={notaId} />` y le pasará el ID.
- Manejará el Título, InfoClase, Comentarios y Compartir de forma independiente (ya lo hace).

## 3. `NotaEditor.tsx`
- Cambiaremos su interfaz para recibir:
  `interface NotaEditorProps { notaId: string; }` (y callbacks opcionales si son necesarios para estado superior, pero la responsabilidad de cargar/guardar el JSON será interna o muy coordinada).
- **Ciclo de vida interno en `NotaEditor.tsx`**:
  - Un único `div` con `id="cielo-editorjs-container"`.
  - Cuando `notaId` cambia:
    1. Si hay una instancia previa de Editor.js, llamar a `await editor.isReady`, luego `editor.destroy()`, luego limpiar la referencia.
    2. Obtener el contenido de la nota desde Supabase (`getNota(notaId)`).
    3. Asegurar que el contenedor DOM existe.
    4. Crear una nueva instancia de `EditorJS`.
    5. Configurar el callback `onChange` para hacer `editor.save()` y luego `updateNotaContenido(notaId, data)`.

Este enfoque garantiza que **una y solo una** instancia de Editor.js interactúe con el contenedor DOM, esperando a que la instancia anterior se destruya por completo antes de crear la nueva, resolviendo la condición de carrera inherente a React 18 sin recurrir a IDs dinámicos.

## Preguntas para el usuario
- ¿Confirmas que `NotaEditor` asuma la responsabilidad directa de interactuar con el store de Zustand para cargar (`getNota`) y guardar (`updateNotaContenido`) el JSON, liberando a `NuevaNotaClase` de esta responsabilidad específica sobre los bloques?
