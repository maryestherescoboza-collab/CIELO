---
description: Auditoría y optimización UI/UX con ArquitectoUI
---

# 🎨 Cómo aplicar el diseño ArquitectoUI

Este workflow utiliza el agente especializado en diseño premium para auditar y mejorar componentes.

## Pasos

### 1. Auditoría de Visual Hierarchy
Revisa el componente actual buscando saturación de información y ruido visual. 
- ¿El foco principal está claro?
- ¿Se cumple el sistema de rejilla 8pt?

### 2. Aplicación de constantes de diseño
// turbo
Asegúrate de que el archivo utiliza el sistema de colores oficial en `src/design-system.css` (o equivalente):
- Primary: `#D03817`
- Base: `#FEF0E7`
- Border-radius: 16-20px

### 3. Refactorización de Tablas
Si el componente tiene tablas, aplica las reglas:
- Elimina líneas duras.
- Agrupa por bloques.
- Fondos de fila suaves.

### 4. Pulido Premium
Aplica microinteracciones y feedback visual (hover elevation, transiciones 0.2s).
- Reduce el ruido visual en un 30-50%.
- Asegura legibilidad tipo Notion.

### 5. Finalización
Ejecuta `npm run dev` para validar visualmente.
