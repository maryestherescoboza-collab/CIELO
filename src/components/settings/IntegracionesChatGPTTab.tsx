import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CieloPill } from '../ui/CieloPill';
import { CIELO_MCP_DEFAULT_ENDPOINT, CIELO_MCP_PERMISOS } from '../../mcp/types';
import { 
  Bot, 
  Copy, 
  Check, 
  ShieldCheck, 
  Key, 
  AlertTriangle,
  Layers
} from 'lucide-react';

interface Props {
  session: any;
}

export const IntegracionesChatGPTTab: React.FC<Props> = ({ session }) => {
  const [token, setToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  useEffect(() => {
    // Si el usuario tiene una sesión activa, obtener su access_token
    if (session?.access_token) {
      setToken(session.access_token);
    }
    // Recuperar fecha de última conexión guardada localmente
    const lastConn = localStorage.getItem('cielo_mcp_last_connected');
    if (lastConn) {
      setConnectedAt(lastConn);
    }
  }, [session]);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    localStorage.setItem('cielo_mcp_last_connected', new Date().toISOString());
    setConnectedAt(new Date().toISOString());
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(CIELO_MCP_DEFAULT_ENDPOINT);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2500);
  };

  const handleRevocar = async () => {
    if (window.confirm('¿Deseas revocar la clave de conexión para ChatGPT? Deberás volver a autorizar tu cuenta en ChatGPT para reanudar el acceso.')) {
      localStorage.removeItem('cielo_mcp_last_connected');
      setConnectedAt(null);
      // Forzar refresco de sesión en Supabase para invalidar el token anterior
      await supabase.auth.refreshSession();
      alert('Acceso revocado exitosamente.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white border border-(--border-soft) rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#537BAC]/10 border border-[#537BAC]/20 flex items-center justify-center text-[#537BAC] shrink-0 mt-0.5">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-(--ink) tracking-tight">Integración Oficial con ChatGPT</h3>
                <CieloPill variant="neutral" className="px-2.5 py-0.5 text-[10px] bg-[#689C63]/10 text-[#4E7649] border-[#689C63]/25 font-bold">
                  MCP v2024-11-05
                </CieloPill>
              </div>
              <p className="text-xs text-(--ink-soft) mt-1 leading-relaxed max-w-2xl">
                Conecta tu cuenta docente de CIELO con ChatGPT mediante el protocolo oficial MCP (Model Context Protocol). Podrás consultar tus cursos, revisar el progreso de tus estudiantes, preparar actividades y obtener reportes mediante lenguaje natural.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Estado</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${connectedAt ? 'bg-[#689C63]' : 'bg-slate-300'}`} />
              <span className="text-xs font-bold text-(--ink)">
                {connectedAt ? 'Conexión activa' : 'Listo para conectar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Conexión y Credenciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Endpoint MCP */}
        <div className="bg-white border border-(--border-soft) rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={16} className="text-[#537BAC]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-(--ink)">Endpoint del Servidor MCP</h4>
            </div>
            <p className="text-xs text-(--ink-soft) mb-3">
              Dirección oficial de la Edge Function en Supabase compatible con ChatGPT MCP y Custom Actions.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all select-all">
              {CIELO_MCP_DEFAULT_ENDPOINT}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleCopyEndpoint}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#537BAC] hover:text-[#3B5B84] transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[#537BAC]/10"
            >
              {copiedEndpoint ? <Check size={14} className="text-[#689C63]" /> : <Copy size={14} />}
              <span>{copiedEndpoint ? 'Endpoint Copiado' : 'Copiar Endpoint'}</span>
            </button>
          </div>
        </div>

        {/* Token Personal del Docente */}
        <div className="bg-white border border-(--border-soft) rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-[#EB8847]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-(--ink)">Token Personal de Conexión</h4>
            </div>
            <p className="text-xs text-(--ink-soft) mb-3">
              Token de sesión seguro vinculado exclusivamente a tu cuenta docente y a los cursos de tu centro escolar.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all select-all">
              {token ? `${token.substring(0, 32)}••••••••••••••••••••••••••••••••` : 'Iniciando sesión...'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            {connectedAt ? (
              <button
                onClick={handleRevocar}
                className="text-[11px] font-bold text-[#DB5B48] hover:underline cursor-pointer"
              >
                Revocar acceso
              </button>
            ) : <span />}
            <button
              onClick={handleCopyToken}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-(--primary) text-white hover:bg-(--primary)/90 transition-all cursor-pointer px-4 py-2 rounded-xl shadow-xs active:scale-98"
            >
              {copiedToken ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedToken ? 'Token Copiado' : 'Copiar Token para ChatGPT'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permisos Concedidos y Reglas de Seguridad */}
      <div className="bg-white border border-(--border-soft) rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-[#689C63]" />
          <h4 className="text-sm font-black text-(--ink) tracking-tight">Permisos y Garantías de Aislamiento</h4>
        </div>
        <p className="text-xs text-(--ink-soft) mb-4">
          La integración MCP opera bajo el principio de privilegio mínimo y la arquitectura de aislamiento por centro de CIELO:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {CIELO_MCP_PERMISOS.map((permiso, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-[#689C63] mt-1.5 shrink-0" />
              <span>{permiso}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Política de confirmación explícita (Human-in-the-loop):</span>
            <p className="text-amber-800/90 leading-relaxed">
              ChatGPT nunca creará actividades ni registrará calificaciones a espaldas del docente. Toda operación de escritura generará una vista previa y requerirá que respondas afirmativamente en el chat antes de persistir los datos en Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Pasos de Configuración en ChatGPT */}
      <div className="bg-white border border-(--border-soft) rounded-2xl p-6 shadow-xs">
        <h4 className="text-sm font-black text-(--ink) tracking-tight mb-3">Cómo conectar CIELO en ChatGPT</h4>
        <ol className="space-y-3 text-xs text-(--ink-soft) list-decimal list-inside leading-relaxed">
          <li>
            <strong className="text-slate-800">Copia tu Endpoint y Token:</strong> Haz clic en los botones de copia arriba.
          </li>
          <li>
            <strong className="text-slate-800">En ChatGPT:</strong> Ve a <em>Explore GPTs</em> → <em>Create</em> (o a la configuración de tu conector MCP / Custom Action).
          </li>
          <li>
            <strong className="text-slate-800">Configurar Autenticación:</strong> Selecciona tipo de autenticación <strong>API Key / Bearer</strong> y pega tu token personal de CIELO.
          </li>
          <li>
            <strong className="text-slate-800">Configurar Servidor:</strong> En la URL del servidor, introduce el Endpoint de CIELO MCP.
          </li>
          <li>
            <strong className="text-slate-800">Comenzar a interactuar:</strong> Pídele a ChatGPT tareas como: <em>"¿Cuáles son mis cursos activos?", "Muestra el listado de 1ro Secundaria A"</em> o <em>"Genera el reporte de competencias para el período P1"</em>.
          </li>
        </ol>
      </div>
    </div>
  );
};

