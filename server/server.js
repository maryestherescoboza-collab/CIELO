import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from 'express-rate-limit';
import { getEmailHtml } from './emailTemplate.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de registro de peticiones (Logger)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms) - IP: ${req.ip}`);
  });
  next();
});

// Configuración de Seguridad y Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // En producción, cambiar por el dominio específico del frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Inicialización de cliente administrativo de Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let isSupabaseConfigured = true;
if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('COLOQUE_AQUI') || supabaseServiceKey === 'tu-service-role-key-secreta') {
  console.warn('⚠️ ADVERTENCIA CRÍTICA: Supabase URL o Service Role Key no configurada correctamente. El backend no podrá operar de forma administrativa.');
  isSupabaseConfigured = false;
}

// Cliente con service_role para operaciones administrativas en auth.users y RLS bypass
let supabaseAdmin;
try {
  supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder-project.supabase.co',
    supabaseServiceKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} catch (err) {
  console.error('❌ Error fatal al inicializar el cliente de Supabase Admin:', err.message);
  isSupabaseConfigured = false;
}

// Configuración de Nodemailer
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Correo electrónico: Configurado por SMTP.');
} else {
  console.log('ℹ️ Correo electrónico: Credenciales SMTP no configuradas. El servidor simulará el envío de correos por consola de forma segura.');
}

// Configuración de Limitadores de Petición (Rate Limiters)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 peticiones por IP
  message: { error: 'Demasiadas solicitudes de recuperación de contraseña desde esta dirección IP. Por favor intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const validateTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Demasiados intentos de validación de token. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de cambio de contraseña desde esta IP. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper para registrar auditoría de eventos
async function registrarAuditoria(userId, email, ip, evento, detalles) {
  try {
    await supabaseAdmin.from('auditoria_recuperacion').insert({
      user_id: userId || null,
      email: email || null,
      ip_address: ip,
      evento: evento,
      detalles: detalles || {}
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
  }
}

// Endpoints de API

/**
 * 1. Solicitar recuperación de contraseña (Olvidé mi contraseña)
 */
app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const responseMsg = 'Si existe una cuenta asociada a este correo electrónico, recibirás instrucciones para restablecer tu contraseña.';

  if (!isSupabaseConfigured) {
    console.error('[Configuration Error] No se puede ejecutar forgot-password porque Supabase no está configurado (Service Role Key faltante o inválido).');
    return res.status(500).json({ error: 'El servidor de autenticación no está configurado correctamente en el backend (Falta Service Role Key).' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Por favor proporciona una dirección de correo válida.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Control de abuso por usuario: máximo 3 envíos exitosos por correo cada 15 minutos
    const { data: enviosRecientes, error: countError } = await supabaseAdmin
      .from('auditoria_recuperacion')
      .select('id')
      .eq('email', cleanEmail)
      .eq('evento', 'solicitud_enviada')
      .gt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (!countError && enviosRecientes && enviosRecientes.length >= 3) {
      await registrarAuditoria(null, cleanEmail, ip, 'fuerza_bruta_detectada', { razon: 'Límite de solicitudes de correo excedido' });
      // Retornar mensaje estándar para evitar indicar si el correo existe o no
      return res.status(200).json({ message: responseMsg });
    }

    await registrarAuditoria(null, cleanEmail, ip, 'solicitud_intentada');

    // 1. Verificar si existe la cuenta asociada llamando a la función RPC
    const { data: userId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_email', { p_email: cleanEmail });

    if (rpcError) {
      console.error('Error en RPC get_user_id_by_email:', rpcError.message);
      throw rpcError;
    }

    // Si el usuario no existe, terminamos silenciosamente con el mismo mensaje
    if (!userId) {
      // Registrar evento indicando que el correo no está registrado (solo interno)
      await registrarAuditoria(null, cleanEmail, ip, 'solicitud_rechazada', { razon: 'El correo electrónico no pertenece a ningún usuario' });
      // Para simular el tiempo de procesamiento y evitar análisis de tiempos (timing attacks)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      return res.status(200).json({ message: responseMsg });
    }

    // 2. Revocar tokens de recuperación activos previos para este usuario
    const { error: revokeError } = await supabaseAdmin.rpc('revocar_tokens_activos', { p_user_id: userId });
    if (revokeError) console.error('Error al revocar tokens previos:', revokeError.message);

    // 3. Generar token criptográficamente seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    // 4. Guardar token en base de datos
    const { error: insertError } = await supabaseAdmin.from('recuperacion_tokens').insert({
      user_id: userId,
      token: token,
      expires_at: expiresAt.toISOString(),
      estado: 'activo'
    });

    if (insertError) {
      throw insertError;
    }

    // 5. Obtener nombre del docente para personalizar correo
    const { data: profile } = await supabaseAdmin
      .from('perfiles')
      .select('nombre, nombre_docente')
      .eq('user_id', userId)
      .maybeSingle();

    const nombreDocente = profile?.nombre || profile?.nombre_docente || 'Docente';

    // 6. Enviar Correo
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const emailHtml = getEmailHtml(resetUrl, nombreDocente);

    if (smtpConfigured) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Noether SaaS <no-reply@mi-saas.com>',
        to: cleanEmail,
        subject: 'Restablece tu contraseña - Portfolio Pro',
        html: emailHtml
      });
    } else {
      // Simulación en logs para pruebas locales
      console.log('\n======================================================');
      console.log(`✉️ [MOCK EMAIL SENT TO: ${cleanEmail}]`);
      console.log(`Asunto: Restablece tu contraseña - Portfolio Pro`);
      console.log(`Enlace de restablecimiento: ${resetUrl}`);
      console.log('======================================================\n');
    }

    // Registrar envío exitoso
    await registrarAuditoria(userId, cleanEmail, ip, 'solicitud_enviada', { token_id: token.substring(0, 8) + '...' });

    return res.status(200).json({ message: responseMsg });
  } catch (err) {
    console.error('Error en forgot-password endpoint:', err.message);
    // Retornamos el mismo mensaje estandarizado para no filtrar fallas del sistema
    return res.status(200).json({ message: responseMsg });
  }
});

/**
 * 2. Validar token de recuperación
 */
app.post('/api/auth/validate-token', validateTokenLimiter, async (req, res) => {
  const { token } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  if (!isSupabaseConfigured) {
    console.error('[Configuration Error] No se puede ejecutar validate-token porque Supabase no está configurado (Service Role Key faltante o inválido).');
    return res.status(500).json({ valid: false, error: 'El servidor de autenticación no está configurado correctamente en el backend (Falta Service Role Key).' });
  }

  if (!token || token.length < 20) {
    return res.status(400).json({ valid: false, error: 'Token no válido o ausente.' });
  }

  try {
    // Buscar token en base de datos
    const { data: record, error } = await supabaseAdmin
      .from('recuperacion_tokens')
      .select('*, profiles:perfiles(nombre, nombre_docente)')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;

    if (!record) {
      await registrarAuditoria(null, null, ip, 'token_invalido', { token_buscado: token.substring(0, 8) + '...', razon: 'Token no encontrado' });
      return res.status(400).json({ valid: false, error: 'El enlace de recuperación es inválido.' });
    }

    // Verificar si el token ya fue usado o revocado
    if (record.estado !== 'activo') {
      await registrarAuditoria(record.user_id, null, ip, 'token_invalido', { token_id: record.id, razon: `Token en estado '${record.estado}'` });
      return res.status(400).json({ valid: false, error: `Este enlace ya ha sido utilizado o ha sido invalidado.` });
    }

    // Verificar expiración
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    if (now > expiresAt) {
      // Actualizar estado del token a revocado automáticamente por expirar
      await supabaseAdmin.from('recuperacion_tokens').update({ estado: 'revocado' }).eq('id', record.id);
      await registrarAuditoria(record.user_id, null, ip, 'token_invalido', { token_id: record.id, razon: 'Token expirado' });
      return res.status(400).json({ valid: false, error: 'El enlace de recuperación ha expirado. Por favor solicita uno nuevo.' });
    }

    const prof = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;
    const nombreDocente = prof?.nombre || prof?.nombre_docente || 'Docente';

    await registrarAuditoria(record.user_id, null, ip, 'token_validado', { token_id: record.id });

    return res.status(200).json({
      valid: true,
      user_id: record.user_id,
      nombreDocente: nombreDocente
    });
  } catch (err) {
    console.error('Error al validar token:', err.message);
    return res.status(500).json({ valid: false, error: 'Error del servidor al validar el enlace.' });
  }
});

/**
 * 3. Restablecer contraseña con token válido
 */
app.post('/api/auth/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  if (!isSupabaseConfigured) {
    console.error('[Configuration Error] No se puede ejecutar reset-password porque Supabase no está configurado (Service Role Key faltante o inválido).');
    return res.status(500).json({ error: 'El servidor de autenticación no está configurado correctamente en el backend (Falta Service Role Key).' });
  }

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
  }

  // Validaciones de complejidad de contraseña
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'La contraseña no cumple con los requisitos de seguridad: debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.'
    });
  }

  try {
    // 1. Validar el token transaccionalmente
    const { data: record, error: selectError } = await supabaseAdmin
      .from('recuperacion_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!record || record.estado !== 'activo') {
      return res.status(400).json({ error: 'El token proporcionado no es válido o ya fue consumido.' });
    }

    const now = new Date();
    const expiresAt = new Date(record.expires_at);
    if (now > expiresAt) {
      await supabaseAdmin.from('recuperacion_tokens').update({ estado: 'revocado' }).eq('id', record.id);
      return res.status(400).json({ error: 'El token ha expirado. Solicita un nuevo correo de recuperación.' });
    }

    const userId = record.user_id;

    // 2. Cambiar la contraseña del usuario en Supabase Auth usando la API de administración
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (authError) {
      console.error('Error al actualizar contraseña en Supabase Auth:', authError.message);
      return res.status(500).json({ error: `No se pudo actualizar la contraseña en el sistema de autenticación: ${authError.message}` });
    }

    // 3. Marcar el token utilizado de forma inmediata como usado
    const { error: updateTokenErr } = await supabaseAdmin
      .from('recuperacion_tokens')
      .update({ estado: 'usado' })
      .eq('id', record.id);

    if (updateTokenErr) {
      console.error('Error al marcar token como usado:', updateTokenErr.message);
    }

    // 4. Invalidar cualquier otro token de recuperación del mismo usuario (prevención de fugas)
    const { error: revokeError } = await supabaseAdmin.rpc('revocar_tokens_activos', { p_user_id: userId });
    if (revokeError) {
      console.error('Error al revocar otros tokens remanentes:', revokeError.message);
    }

    // Registrar evento de restablecimiento exitoso
    await registrarAuditoria(userId, null, ip, 'contrasena_restablecida', { token_id: record.id });

    return res.status(200).json({ message: 'Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.' });
  } catch (err) {
    console.error('Error en reset-password:', err.message);
    return res.status(500).json({ error: 'Ocurrió un error inesperado al restablecer tu contraseña.' });
  }
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Autenticación de Noether corriendo en http://localhost:${PORT}`);
});
export default app;
