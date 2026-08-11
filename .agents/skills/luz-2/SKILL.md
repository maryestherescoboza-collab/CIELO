---
name: luz 2
description: Agente maestro para aplicar el Sistema Visual - Píldoras CIELO. Especialista en crear interfaces compactas, claras y elegantes utilizando controles tipo píldora, reduciendo el espacio vertical y asegurando un lenguaje visual editorial y cálido sin romper funcionalidad.
---

# 22. SISTEMA VISUAL — PÍLDORAS CIELO

CIELO debe utilizar un lenguaje visual basado en controles compactos con forma de píldora.

El objetivo es conseguir una interfaz:

* compacta;
* clara;
* cálida;
* elegante;
* editorial;
* consistente;
* fácil de escanear;
* sin desperdicio de espacio.

## 22.1 ELEMENTOS QUE DEBEN UTILIZAR ESTILO PÍLDORA

Aplicar el estilo de píldora, cuando corresponda, a:

* botones;
* botones secundarios;
* filtros;
* chips;
* etiquetas;
* badges;
* selectores;
* opciones de selección;
* controles de estado;
* tabs cuando visualmente funcionen como opciones;
* acciones compactas;
* indicadores interactivos.

NO convertir automáticamente en píldoras:

* tarjetas;
* tablas;
* inputs de texto largos;
* textareas;
* modales;
* contenedores;
* paneles;
* áreas de contenido;
* filas de tablas;
* elementos que estructuralmente necesiten otra geometría.

La forma debe responder a la función del componente.

---

# 22.2 GEOMETRÍA DE LAS PÍLDORAS

La configuración visual objetivo es:

```css
border-radius: 9999px;
height: aproximadamente 36px;
padding: 8px 16px;
```

El padding horizontal puede oscilar aproximadamente entre:

```text
16px – 20px
```

según la longitud del contenido.

El contenido debe quedar:

* perfectamente centrado verticalmente;
* perfectamente centrado horizontalmente cuando corresponda;
* sin espacios internos excesivos;
* sin alturas innecesariamente grandes.

El ancho debe adaptarse automáticamente al contenido.

NO establecer un ancho fijo para una píldora salvo que exista una razón funcional.

Preferir:

```text
width: fit-content
```

o el comportamiento equivalente mediante Tailwind/flex.

---

# 22.3 TEXTO DE LAS PÍLDORAS

El texto debe ser:

* claramente legible;
* visualmente centrado;
* compacto;
* suficientemente contrastado.

Configuración de referencia:

```css
line-height: 1;
font-weight: 600;
```

Puede utilizarse:

```css
letter-spacing: 0.08em;
text-transform: uppercase;
```

cuando corresponda al lenguaje visual del componente.

IMPORTANTE:

No utilizar `text-transform: uppercase` indiscriminadamente.

No convertir automáticamente textos largos, nombres propios, nombres de estudiantes o contenido pedagógico a mayúsculas.

La legibilidad tiene prioridad.

---

# 22.4 TAMAÑO DE TEXTO

Las píldoras NO deben utilizar texto microscópico para conseguir un aspecto compacto.

Evitar:

```text
8px
9px
10px
11px
```

como tamaño de texto normal.

Una píldora debe ser compacta por su geometría y espaciado, no porque su texto sea ilegible.

---

# 22.5 ESTADOS DE LAS PÍLDORAS

Los controles deben conservar claramente sus estados:

* normal;
* hover;
* activo;
* seleccionado;
* deshabilitado;
* focus;
* error cuando corresponda.

Los estados deben utilizar los tokens de color de CIELO.

No crear colores nuevos para cada componente si existe un token equivalente.

---

# 22.6 PÍLDORAS Y TABLAS

En tablas densas, utilizar píldoras para:

* filtros;
* estados;
* acciones;
* indicadores;
* selección;
* categorías.

NO convertir cada celda de una tabla en una píldora.

El objetivo es aumentar la capacidad de lectura de la tabla, no llenarla de elementos visuales.

---

# 23. ESPACIADO GLOBAL

Reducir progresivamente el espacio vertical excesivo entre componentes.

Objetivo:

> Reducir aproximadamente entre un 15 % y un 20 % el espacio vertical innecesario.

Revisar especialmente:

* padding de tarjetas;
* márgenes entre títulos y contenido;
* separación entre filtros;
* separación entre botones;
* espacios entre secciones;
* altura de encabezados;
* espacios vacíos dentro de cards;
* espacios antes y después de tablas;
* separación entre formularios.

NO aplicar una reducción matemática ciega del 15–20 % a todo el frontend.

Primero determinar qué espacios son realmente desperdiciados.

Debe mantenerse suficiente separación para:

* lectura;
* jerarquía visual;
* accesibilidad;
* interacción;
* comprensión de grupos relacionados.

---

# 23.1 PRINCIPIO DE DENSIDAD

CIELO debe aprovechar mejor el espacio disponible.

Si una sección puede ocupar menos espacio sin perder claridad:

REDUCIRLA.

Si reducirla provoca:

* texto ilegible;
* botones difíciles de utilizar;
* elementos demasiado juntos;
* pérdida de jerarquía;

NO reducirla.

La meta es:

> mayor densidad de información útil, no mayor densidad visual indiscriminada.

---

# 24. LENGUAJE VISUAL CIELO

El diseño debe transmitir una combinación de:

### Papelería artesanal

Sensación de materiales impresos, papel, cuaderno, fichas y trabajo editorial.

### Ilustración editorial

Composición limpia, jerarquía tipográfica y elementos cuidadosamente organizados.

### Minimalismo

Pocos elementos visuales innecesarios.

### Paleta suave

Colores suaves y ligeramente desaturados.

### Calidez

La interfaz debe sentirse humana, educativa y acogedora.

### Elegancia

La interfaz debe verse refinada sin parecer corporativa o tecnológica.

---

# 24.1 LO QUE DEBE EVITARSE

NO utilizar como lenguaje visual predominante:

* sombras pronunciadas;
* sombras pesadas;
* efectos glassmorphism;
* fondos translúcidos tipo vidrio;
* neomorfismo;
* gradientes;
* bordes gruesos;
* efectos 3D;
* brillos;
* glow;
* animaciones exageradas;
* efectos tecnológicos agresivos;
* interfaces excesivamente oscuras;
* exceso de elementos flotantes.

Las sombras, si existen, deben ser:

* suaves;
* discretas;
* de baja intensidad.

---

# 24.2 BORDES

Preferir:

* bordes finos;
* bordes suaves;
* bajo contraste;
* colores derivados de los tokens de CIELO.

Evitar:

```text
border-2
border-4
```

como estilo predominante.

Los bordes gruesos solamente deben utilizarse cuando tengan una función clara de estado o accesibilidad.

---

# 24.3 SOMBRAS

Las tarjetas y componentes deben utilizar sombras discretas.

Prioridad:

1. borde suave;
2. separación mediante fondo;
3. sombra ligera solamente cuando sea necesaria.

No utilizar `shadow-xl` o equivalentes como estilo general de tarjetas.

---

# 24.4 ANIMACIONES

Las animaciones deben ser:

* breves;
* discretas;
* funcionales.

No utilizar:

* rebotes;
* zoom exagerado;
* movimientos constantes;
* efectos de entrada llamativos;
* transiciones decorativas excesivas.

Una interacción debe sentirse fluida, no animada por obligación.

---

# 25. PRIORIDAD ENTRE REGLAS

Cuando exista conflicto entre estética y funcionalidad, utilizar esta prioridad:

1. Funcionalidad.
2. Legibilidad.
3. Accesibilidad.
4. Responsive.
5. Jerarquía de información.
6. Densidad eficiente.
7. Consistencia del sistema de diseño.
8. Estética.

Nunca sacrificar los primeros puntos para conseguir los últimos.

---

# 26. REGLA ESPECIAL PARA LA DENSIDAD VISUAL

No solucionar el exceso de contenido visible haciendo:

```text
texto más pequeño
botones más pequeños
filas más pequeñas
padding mínimo
```

La solución preferida es:

```text
mejor distribución
mejor agrupación
menos espacio desperdiciado
mejor ancho de columnas
mejor jerarquía
scroll localizado
componentes compactos
```

---

# 27. CONSISTENCIA

Una vez establecido el sistema de píldoras, no crear diez variantes visuales diferentes sin justificación.

Crear una pequeña familia coherente:

* primaria;
* secundaria;
* neutral;
* seleccionada;
* éxito;
* advertencia;
* error;
* deshabilitada.

Todas deben compartir:

* geometría;
* altura aproximada;
* tipografía;
* alineación;
* radio;
* comportamiento.

Lo que cambia principalmente debe ser:

* color;
* estado;
* peso visual.

---

# 28. IMPLEMENTACIÓN

Antes de crear nuevas clases, comprobar si ya existe un sistema global.

Si no existe, crear componentes/utilidades reutilizables para evitar repetir estilos en cada pantalla.

Ejemplo conceptual:

```text
CieloPill
CieloButton
CieloFilter
CieloBadge
CieloSelect
```

No crear componentes artificialmente si una utilidad global de Tailwind o una clase existente resuelve correctamente el problema.

La arquitectura debe seguir siendo simple.

---

# 29. REGLA DE VALIDACIÓN VISUAL

Después de implementar este sistema, comprobar módulo por módulo:

### Píldoras

* ¿Todas tienen geometría consistente?
* ¿El texto es legible?
* ¿La altura es aproximadamente 36px?
* ¿El ancho se adapta al contenido?
* ¿Hay espacio innecesario?
* ¿Los estados son distinguibles?

### Espaciado

* ¿Se redujo espacio vacío innecesario?
* ¿El contenido sigue respirando?
* ¿Las secciones siguen claramente diferenciadas?

### Estética

* ¿La interfaz se siente cálida?
* ¿Se percibe editorial?
* ¿Los colores son suaves?
* ¿Hay exceso de sombras?
* ¿Hay gradientes?
* ¿Hay efectos tecnológicos agresivos?

### Funcionalidad

* ¿Los botones siguen ejecutando exactamente las mismas acciones?
* ¿Los filtros siguen funcionando?
* ¿Los selectores siguen funcionando?
* ¿Las tablas siguen funcionando?
* ¿Los formularios siguen funcionando?

Si la respuesta funcional no es afirmativa:

DETENER LA REFACTORIZACIÓN Y CORREGIR EL PROBLEMA ANTES DE CONTINUAR.
