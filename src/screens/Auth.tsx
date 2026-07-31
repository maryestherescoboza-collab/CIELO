import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, User, Building2, BookOpen, Check, ArrowRight } from 'lucide-react';
import type { Curso } from '../types';
import logo from '../assets/logo.png';
import { ASIGNATURAS_CATALOGO } from '../constants/asignaturas';

interface AuthProps {
  onAuthSuccess: () => void;
}

// Lista removida, se usa ASIGNATURAS_CATALOGO importado

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreDocente, setNombreDocente] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [tipoInstitucion, setTipoInstitucion] = useState<'publica' | 'privada' | ''>('publica');
  const [asignaturasSeleccionadas, setAsignaturasSeleccionadas] = useState<string[]>([]);
  const [showAsignaturas, setShowAsignaturas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password recovery states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // New state for institution and course linking
  const [existingCourses, setExistingCourses] = useState<Curso[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [asignaturasPorCurso] = useState<Record<number, string[]>>({});
  const [institucionesDisponibles, setInstitucionesDisponibles] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkId = params.get('vincular');
    if (linkId) {
      setIsSignUp(true);
      setSelectedCourseId(Number(linkId));

      // Fetch the institution for this course and auto-fill it
      supabase.from('cursos').select('user_id').eq('id', linkId).single().then(({ data }) => {
        if (data && data.user_id) {
          supabase.from('perfiles').select('institucion, tipo_institucion').eq('user_id', data.user_id).single().then(({ data: profileData }) => {
            if (profileData) {
              if (profileData.institucion) setInstitucion(profileData.institucion);
              if (profileData.tipo_institucion) setTipoInstitucion(profileData.tipo_institucion as any);
            }
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isSignUp && institucionesDisponibles.length === 0) {
      Promise.all([
        supabase.from('centros').select('nombre'),
        supabase.from('perfiles').select('instituto, institucion')
      ]).then(([{ data: instData }, { data: perfData }]) => {
        const names = new Set<string>();
        if (instData) {
          instData.forEach(i => { if (i.nombre) names.add(i.nombre.trim()); });
        }
        if (perfData) {
          perfData.forEach(p => {
            if (p.instituto) names.add(p.instituto.trim());
            if (p.institucion) names.add(p.institucion.trim());
          });
        }
        setInstitucionesDisponibles(Array.from(names).filter(Boolean));
      }).catch(err => {
        console.error('Error fetching institutions:', err);
      });
    }
  }, [isSignUp, institucionesDisponibles.length]);

  useEffect(() => {
    if (isSignUp && institucion.trim().length > 3) {
      const timer = setTimeout(() => {
        checkInstitution(institucion.trim());
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setExistingCourses([]);
      if (!new URLSearchParams(window.location.search).get('vincular')) {
        setSelectedCourseId(null);
      }
    }
  }, [institucion, isSignUp]);

  const checkInstitution = async (name: string) => {
    try {
      const { data: profiles, error: profileErr } = await supabase
        .from('perfiles')
        .select('user_id, institucion')
        .ilike('institucion', name);

      if (profileErr) throw profileErr;

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.user_id);
        const { data: courses, error: courseErr } = await supabase
          .from('cursos')
          .select('*')
          .in('user_id', userIds);

        if (courseErr) throw courseErr;

        const mappedCourses: Curso[] = (courses || []).map((c: any) => ({
          ...c,
          diasSemana: c.dias_semana || [],
          configuracionEvaluacion: c.configuracion_evaluacion
        }));

        setExistingCourses(mappedCourses);
      } else {
        setExistingCourses([]);
      }
    } catch (err) {
      console.error("Error checking institution:", err);
    } finally {
      // isVerifying check removed
    }
  };

  const toggleAsignatura = (asig: string) => {
    setAsignaturasSeleccionadas(prev =>
      prev.includes(asig) ? prev.filter(a => a !== asig) : [...prev, asig]
    );
  };


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Validaciones previas requeridas
        if (!nombreDocente.trim()) throw new Error('Por favor ingresa tu nombre completo.');
        if (!institucion.trim()) throw new Error('Por favor ingresa el nombre de tu centro educativo.');
        if (!tipoInstitucion) throw new Error('Por favor selecciona el tipo de institución.');
        if (asignaturasSeleccionadas.length === 0) throw new Error('Por favor selecciona al menos una asignatura.');

        // Evitar duplicados ignorando mayúsculas, minúsculas y espacios múltiples
        const normalizedInput = institucion.trim().replace(/\s+/g, ' ');
        const existingMatch = institucionesDisponibles.find(
          name => name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedInput.toLowerCase()
        );
        const finalInstitucionName = existingMatch ? existingMatch : normalizedInput;

        // 1. Crear el usuario en Auth (Supabase maneja la unicidad del email internamente)
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nombre_docente: nombreDocente.trim(),
              institucion: finalInstitucionName,
              tipo_institucion: tipoInstitucion
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('No se pudo crear el usuario.');

        // 2. Registrar o buscar el Centro Educativo en la tabla centros
        let finalCentroId: string | null = null;
        try {
          const { data: matchedCentros } = await supabase.from('centros').select('id, nombre');
          const existingCentroMatch = matchedCentros?.find(
            c => c.nombre.trim().replace(/\s+/g, ' ').toLowerCase() === finalInstitucionName.toLowerCase()
          );

          if (existingCentroMatch) {
            finalCentroId = existingCentroMatch.id;
          } else {
            const { data: newCentro } = await supabase.from('centros').insert({
              nombre: finalInstitucionName,
              tanda: 'Jornada Extendida',
              created_by: authData.user.id
            }).select('id').single();
            if (newCentro) finalCentroId = newCentro.id;
          }
        } catch (cErr) {
          console.error("Error al registrar centro educativo:", cErr);
        }

        // 3. Insertar el Perfil linking to centro_id
        const { error: profileError } = await supabase.from('perfiles').upsert({
          user_id: authData.user.id,
          id: authData.user.id,
          nombre: nombreDocente.trim(), // Campo canónico
          nombre_docente: nombreDocente.trim(), // Campo heredado/redundante en uso
          centro_id: finalCentroId,
          tipo_institucion: tipoInstitucion,
          asignaturas: asignaturasSeleccionadas,
          avatar_color: '#3b82f6' // Color base sin lógica visual innecesaria
        }, { onConflict: 'user_id' });

        if (profileError) {
          throw new Error(`Error al crear el perfil de usuario: ${profileError.message}`);
        }

        // 4. Vincular a curso como co-docente si corresponde
        if (selectedCourseId) {
          const course = existingCourses.find(c => c.id === selectedCourseId);
          if (course) {
            const subjects = asignaturasPorCurso[selectedCourseId] || asignaturasSeleccionadas;

            const { error: linkError } = await supabase.from('curso_docentes').insert([{
              curso_id: selectedCourseId,
              docente_id: authData.user.id,
              rol: 'co-docente',
              asignatura: subjects.join(', ') || 'General'
            }]);

            if (linkError) {
              console.warn("Error vinculando docente al curso:", linkError.message);
            }
          }
        }

        alert('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        const msg = String((err as any).message);
        if (msg.includes('already registered')) {
          setError('El correo electrónico ya se encuentra registrado.');
        } else {
          setError(msg);
        }
      } else {
        setError('Ocurrió un error inesperado durante el proceso.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    setError(null);
    setForgotSuccess(null);

    const API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';
    console.log(`[Auth.tsx] Intentando enviar solicitud de recuperación a: ${API_URL}/api/auth/forgot-password`);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      console.log(`[Auth.tsx] Respuesta del servidor recibida. Status: ${response.status}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar tu solicitud.');
      }

      setForgotSuccess(data.message || 'Si existe una cuenta asociada a este correo electrónico, recibirás instrucciones para restablecer tu contraseña.');
    } catch (err: any) {
      console.error("[Auth.tsx] Error capturado en handleForgotPassword:", err);
      if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch') || err.message?.toLowerCase().includes('fetch failed')) {
        setError(`Error de Conexión: No se pudo establecer conexión con el servidor de autenticación en ${API_URL}. Asegúrese de que el backend esté corriendo en el puerto 3001.`);
      } else {
        setError(err.message || 'No se pudo enviar la solicitud de recuperación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-6 bg-white font-sans text-[#3E3838]">
      <main className="w-full max-w-sm py-8 flex flex-col gap-6">
        {/* Brand Identity */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 flex items-center justify-center mb-3">
            <img alt="Brand Logo" className="w-full h-full object-contain" src={logo} />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold tracking-tight text-[#716868] max-w-[280px] mx-auto">
              Portafolio docente enfocado en la evaluación por competencias
            </p>
          </div>
        </div>

        {/* Unified Auth Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative">
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="mb-1">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#3E3838]">Recuperar Contraseña</h2>
                <p className="text-[9px] font-bold text-[#3E3838]/60 uppercase tracking-wider mt-1">
                  Ingresa tu correo para recibir instrucciones.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-[10px] font-bold text-[#D45050] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                  {error}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-[#689C63]/5 border border-[#689C63]/15 rounded-xl text-[10px] font-bold text-[#689C63] flex items-center gap-2">
                  <span className="w-1 h-1 bg-[#689C63] rounded-full"></span>
                  {forgotSuccess}
                </div>
              )}

              {!forgotSuccess && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                      <input
                        type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                        placeholder="nombre@ejemplo.com"
                      />
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        Enviar Instrucciones
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setForgotSuccess(null); }}
                className="w-full text-center text-[9px] font-black text-[#3E3838]/50 hover:text-[#689C63] transition-colors uppercase tracking-widest pt-1"
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <>
              {/* Card Header Logic Toggle */}
              <div className="flex border-b border-slate-100 mb-5 pb-1">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${!isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  INICIAR SESIÓN
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className={`flex-1 pb-2 text-[9px] font-black tracking-widest transition-all ${isSignUp ? 'border-b-2 border-[#689C63] text-[#689C63]' : 'text-[#3E3838]/40 hover:text-[#3E3838]'}`}
                >
                  REGISTRARSE
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                  <div className="p-3 bg-[#D45050]/5 border border-[#D45050]/15 rounded-xl text-[10px] font-bold text-[#D45050] flex items-center gap-2">
                    <span className="w-1 h-1 bg-[#D45050] rounded-full"></span>
                    {error}
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                        <input
                          type="text" required value={nombreDocente} onChange={(e) => setNombreDocente(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                          placeholder="Ej. María Elena"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Centro educativo</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3E3838]/40" />
                        <input
                          type="text" required value={institucion} onChange={(e) => setInstitucion(e.target.value)}
                          list="instituciones-registradas"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                          placeholder="Nombre del centro educativo"
                        />
                        <datalist id="instituciones-registradas">
                          {institucionesDisponibles.map(inst => (
                            <option key={inst} value={inst} />
                          ))}
                        </datalist>
                        {institucion.trim() && !institucionesDisponibles.some(name => name.trim().replace(/\s+/g, ' ').toLowerCase() === institucion.trim().replace(/\s+/g, ' ').toLowerCase()) && (
                          <p className="text-[8px] font-bold text-[#689C63] uppercase tracking-widest ml-1 mt-1">
                            Nuevo centro: "{institucion.trim()}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Asignaturas</label>
                      <button type="button" onClick={() => setShowAsignaturas(!showAsignaturas)} className="w-full text-left px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#689C63] flex items-center justify-between">
                        <span className="truncate">{asignaturasSeleccionadas.length === 0 ? 'Elegir asignaturas...' : `${asignaturasSeleccionadas.length} seleccionadas`}</span>
                        <BookOpen size={14} className="text-[#3E3838]/30" />
                      </button>
                      {showAsignaturas && (
                        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                          {ASIGNATURAS_CATALOGO.map(asig => (
                            <button key={asig.id} type="button" onClick={() => toggleAsignatura(asig.id)} className={`flex items-center gap-2 p-1.5 rounded-lg text-[10px] font-bold transition-all ${asignaturasSeleccionadas.includes(asig.id) ? 'bg-white text-[#689C63] shadow-sm' : 'text-[#3E3838]/50 hover:bg-white/50'}`}>
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${asignaturasSeleccionadas.includes(asig.id) ? 'bg-[#689C63] border-[#689C63]' : 'border-slate-300'}`}>
                                {asignaturasSeleccionadas.includes(asig.id) && <Check size={8} className="text-white" />}
                              </div>
                              {asig.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {existingCourses.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Curso a Vincular (Opcional)</label>
                        <div className="relative">
                          <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3E3838]/40" />
                          <select
                            className="w-full appearance-none pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                            value={selectedCourseId || ''}
                            onChange={e => setSelectedCourseId(e.target.value ? parseInt(e.target.value, 10) : null)}
                          >
                            <option value="">No vincular a ningún curso</option>
                            {existingCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} - {c.asignatura}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#689C63]" />
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                      placeholder="nombre@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] font-black text-[#3E3838]/60 uppercase tracking-widest">Contraseña</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3E3838]/40" />
                    <input
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#689C63] focus:ring-2 focus:ring-[#689C63]/10 outline-none text-xs font-semibold text-[#3E3838] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  className="w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-[9px] tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? 'Crear mi cuenta' : 'Ingresar al sistema'}
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </form>

              <footer className="mt-5 pt-4 border-t border-slate-100 text-center flex flex-col gap-2">
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); }}
                    className="text-[9px] font-black text-[#689C63] hover:text-[#689C63]/90 transition-colors tracking-widest uppercase"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
                <button className="text-[9px] font-black text-[#3E3838]/40 hover:text-[#3E3838] transition-colors tracking-widest uppercase">
                  ¿Necesitas soporte?
                </button>
              </footer>
            </>
          )}
        </div>

        {/* Brand Meta */}
        <p className="text-center text-[8px] font-black text-[#3E3838]/30 uppercase tracking-[0.25em]">CIELO • 2026</p>
      </main>
    </div>
  );
}
