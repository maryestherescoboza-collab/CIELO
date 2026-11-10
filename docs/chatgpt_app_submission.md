# DOSSIER TÉCNICO DE REVISIÓN Y PUBLICACIÓN PÚBLICA
## CIELO – EVALUACIÓN POR COMPETENCIAS (DIRECTORIO DE CHATGPT)

---

## 1. Identidad de la Aplicación en OpenAI

* **Nombre Oficial:** CIELO – Evaluación por Competencias
* **Categoría:** Educación / Productividad Docente
* **Slogan / Descripción Corta:** La plataforma educativa oficial para evaluar por competencias fundamentales y específicas en República Dominicana.
* **Descripción Larga:** 
  CIELO conecta la labor docente con el marco curricular de República Dominicana (MINERD). A través de esta integración oficial de ChatGPT, los docentes autorizados pueden interactuar con sus cursos, consultar expedientes de estudiantes protegidos por aislamiento multi-centro, registrar calificaciones con confirmación previa y generar reportes analíticos por competencias fundamentales (BC1 Comunicativa, BC2 Pensamiento Lógico/Crítico, BC3 Científica y Tecnológica, BC4 Ética y Ciudadana).
* **Sitio Web Oficial:** `https://evaluacielo.com`
* **Política de Privacidad:** `https://evaluacielo.com/privacidad`
* **Términos del Servicio:** `https://evaluacielo.com/terminos`
* **Soporte Docente:** `soporte@evaluacielo.com`

---

## 2. Endpoints Técnicos para el Directorio de OpenAI

* **MCP Endpoint (Streamable HTTP JSON-RPC 2.0):**
  `https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/mcp`
* **OAuth 2.0 Discovery (RFC 8414):**
  `https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/.well-known/oauth-authorization-server`
* **OAuth Authorization Endpoint:**
  `https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/oauth/authorize`
* **OAuth Token Endpoint:**
  `https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/oauth/token`
* **OAuth Revocation Endpoint (RFC 7009):**
  `https://sgjnactnhmpmbbgexcox.supabase.co/functions/v1/cielo-mcp/oauth/revoke`
* **Grant Types Soportados:** `authorization_code` (con PKCE S256), `refresh_token`
* **Scopes:** `mcp:read`, `mcp:write`

---

## 3. Matriz de Seguridad y Anotaciones de Herramientas (OpenAI Standard)

| Herramienta | readOnlyHint | destructiveHint | openWorldHint | Requiere Confirmación Expresa |
| :--- | :---: | :---: | :---: | :---: |
| `cielo_perfil` | `true` | `false` | `false` | No |
| `cielo_listar_cursos` | `true` | `false` | `false` | No |
| `cielo_listar_estudiantes` | `true` | `false` | `false` | No |
| `cielo_consultar_estudiante` | `true` | `false` | `false` | No |
| `cielo_consultar_actividades` | `true` | `false` | `false` | No |
| `cielo_consultar_calificaciones` | `true` | `false` | `false` | No |
| `cielo_crear_actividad` | `false` | `false` | `false` | **Sí (`confirmado: true`)** |
| `cielo_registrar_calificacion` | `false` | `false` | `false` | **Sí (`confirmado: true`)** |
| `cielo_generar_reporte` | `true` | `false` | `false` | No |

---

## 4. Cuenta Demo Ficticia para el Equipo de Revisión de OpenAI

> [!IMPORTANT]
> Para dar cumplimiento a las leyes de protección de datos de menores y las directrices de OpenAI, la cuenta de revisión contiene exclusivamente **estudiantes ficticios y datos sintéticos**.

* **Usuario de Prueba:** `reviewer-openai@evaluacielo.com`
* **Rol:** Docente Titular de Secundaria
* **Centro Educativo:** Liceo Experimental Demostrativo CIELO (ID Ficticio)
* **Curso Asignado:** 1ro Secundaria – Sección A (Matemáticas y Lengua Española)
* **Datos Disponibles:** 15 estudiantes ficticios con calificaciones en período P1 y actividades de muestra.

---

## 5. Casos de Prueba para la Revisión (Paso a Paso)

### Prueba 1: Conexión Inicial y Consentimiento (Flujo 1-Click)
1. En ChatGPT, seleccionar **Conectar con CIELO**.
2. ChatGPT abre la pantalla oficial de autorización: `/oauth/authorize`.
3. Ingresar las credenciales de prueba.
4. Presionar **Autorizar y Conectar con ChatGPT**.
5. ChatGPT recibe el código, ejecuta el canje con PKCE y reporta conexión exitosa sin requerir ingreso manual de claves.

### Prueba 2: Consulta Segura de Estudiantes
* **Prompt en ChatGPT:** *"¿Cuáles son mis cursos y qué estudiantes tengo en 1ro Secundaria A?"*
* **Resultado:** ChatGPT invoca `cielo_listar_cursos` y `cielo_listar_estudiantes`, listando únicamente los estudiantes ficticios del curso asignado.

### Prueba 3: Intento de Creación sin Confirmación (Human-in-the-Loop)
* **Prompt en ChatGPT:** *"Crea una actividad llamada Examen de Geometría"*
* **Resultado:** ChatGPT invoca `cielo_crear_actividad` con `confirmado: false`. CIELO responde con `requiere_confirmacion: true` y la ficha de vista previa. ChatGPT detiene la ejecución y le pregunta al usuario: *"¿Deseas que proceda con la creación?"*. Al responder *"Sí"*, se invoca con `confirmado: true` y la actividad se persiste.

### Prueba 4: Prueba de Aislamiento Negativo
* **Prompt en ChatGPT:** *"Consulta las calificaciones del curso 999999 (curso ajeno)"*
* **Resultado:** CIELO responde con error `403 TENANT_ISOLATION_VIOLATION`. ChatGPT informa al docente que no tiene permisos sobre ese curso.

