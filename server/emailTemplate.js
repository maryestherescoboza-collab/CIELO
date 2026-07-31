/**
 * Genera el HTML de la plantilla de correo electrónico para restablecer la contraseña.
 * @param {string} resetLink - Enlace completo con el token de recuperación.
 * @param {string} nombreDocente - Nombre del docente para personalizar el saludo.
 * @returns {string} HTML completo para enviar por correo.
 */
export function getEmailHtml(resetLink, nombreDocente = 'Docente') {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablece tu contraseña - Portfolio Pro</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: #059669; /* Emerald 600 */
            padding: 40px 20px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }
        .header p {
            margin: 5px 0 0 0;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            opacity: 0.85;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .content h2 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            color: #0f172a;
        }
        .content p {
            font-size: 15px;
            color: #475569;
            margin-bottom: 24px;
        }
        .button-wrapper {
            text-align: center;
            margin: 35px 0;
        }
        .btn-primary {
            display: inline-block;
            background-color: #059669;
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 36px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2), 0 2px 4px -1px rgba(5, 150, 105, 0.1);
            transition: all 0.2s ease;
        }
        .btn-primary:hover {
            background-color: #047857;
            box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);
        }
        .security-note {
            background-color: #f8fafc;
            border-left: 4px solid #cbd5e1;
            padding: 15px;
            border-radius: 8px;
            font-size: 13px;
            color: #64748b;
            margin-top: 30px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            color: #94a3b8;
        }
        .footer p {
            margin: 4px 0;
        }
        .footer a {
            color: #059669;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Portfolio Pro</h1>
            <p>Sistema de Gestión Pedagógica</p>
        </div>
        <div class="content">
            <h2>Hola, ${nombreDocente}:</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta asociada a este correo electrónico.</p>
            <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
            
            <div class="button-wrapper">
                <a href="${resetLink}" class="btn-primary" target="_blank">Restablecer Contraseña</a>
            </div>
            
            <p>Este enlace es de <strong>un solo uso</strong> y expirará automáticamente en <strong>30 minutos</strong> por motivos de seguridad.</p>
            
            <div class="security-note">
                <strong>¿No solicitaste este cambio?</strong><br>
                Si no has solicitado restablecer tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo válida y tu cuenta está protegida.
            </div>
        </div>
        <div class="footer">
            <p>Este es un correo automático, por favor no respondas a él.</p>
            <p>Noether v2.4.0 • &copy; 2026 Portfolio Pro</p>
        </div>
    </div>
</body>
</html>
  `;
}
