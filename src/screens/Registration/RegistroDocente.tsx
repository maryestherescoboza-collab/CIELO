import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Search, ArrowRight, Loader2, Check, Lock } from 'lucide-react';
import type { Centro } from '../../types';

interface Props {
  onAuthSuccess: () => void;
}

export default function RegistroDocente({ onAuthSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [centros, setCentros] = useState<Centro[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<Centro | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  const onboardingPlan = localStorage.getItem('onboardingPlan') || 'individual';

  // Debounce search
  useEffect(() => {
    if (search.trim().length > 2) {
      const timer = setTimeout(() => {
        searchCentros(search.trim());
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCentros([]);
    }
  }, [search]);

  const searchCentros = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('centros')
        .select('*')
        .ilike('nombre', `%${query}%`)
        .limit(5);
        
      if (error) throw error;
      setCentros((data as Centro[]) || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCentro = (c: Centro) => {
    setSelectedCentro(c);
    if (c.afiliado && c.estado === 'activo') {
      // Scenario C
      setStep(2);
    } else {
      // Scenario B
      handleJoinNonAffiliated(c.id);
    }
  };

  const handleCreateNewCentro = async () => {
    // Scenario A
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const { data: newCentro, error: cErr } = await supabase
        .from('centros')
        .insert({
          nombre: search,
          created_by: session.user.id,
          estado: 'pendiente',
          afiliado: false
        })
        .select()
        .single();
      
      if (cErr) throw cErr;

      const subType = onboardingPlan === 'individual' ? 'individual' : 'promocional';
      await assignCentroAndSub(session.user.id, newCentro.id, subType);
      setStep(3); // success
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJoinNonAffiliated = async (centroId: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      await assignCentroAndSub(session.user.id, centroId, 'promocional');
      setStep(3); // success
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!selectedCentro) return;
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      // Verify code
      const { data: codigos, error: codErr } = await supabase
        .from('codigos_acceso_centro')
        .select('*')
        .eq('centro_id', selectedCentro.id)
        .eq('codigo', codigo)
        .eq('estado', 'activo');
        
      if (codErr) throw codErr;
      if (!codigos || codigos.length === 0) {
        throw new Error("Código inválido o expirado");
      }

      const subType = onboardingPlan === 'individual' ? 'individual' : null;
      await assignCentroAndSub(session.user.id, selectedCentro.id, subType); 
      setStep(3);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const assignCentroAndSub = async (userId: string, centroId: string, subType: string | null) => {
    const { error: profileError } = await supabase
      .from('perfiles')
      .update({ centro_id: centroId })
      .eq('user_id', userId);
    if (profileError) throw profileError;

    if (subType) {
      const { error: subError } = await supabase
        .from('suscripciones')
        .insert({
          tipo: subType,
          estado: subType === 'individual' ? 'pendiente' : 'activa',
          user_id: userId
        });
      if (subError) throw subError;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mx-auto mb-6">
          <User size={32} />
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Unirse a un Centro</h2>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-slate-500 text-center mb-6">
              Busca tu centro educativo para conectarte con tus colegas.
            </p>
            
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Escribe el nombre del centro..."
              />
            </div>
            
            {search.trim().length > 2 && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {centros.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => handleSelectCentro(c)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-700">{c.nombre}</div>
                      <div className="text-xs text-slate-500">
                        {c.afiliado ? 'Institución Afiliada' : 'Centro Independiente'}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
                
                {centros.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No se encontró el centro.
                  </div>
                )}
                
                <button 
                  onClick={handleCreateNewCentro}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium border-t border-slate-200 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  + Registrar "{search}" como nuevo centro
                </button>
              </div>
            )}

            {onboardingPlan === 'individual' && (
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    await assignCentroAndSub(session.user.id, null as any, 'individual');
                    setStep(3);
                  } catch(e) {
                    setError('Error al saltar este paso');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full mt-4 text-center text-slate-400 hover:text-slate-600 text-xs font-bold uppercase transition-colors"
              >
                Omitir y continuar como docente independiente
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-slate-500 text-center mb-6">
              <b>{selectedCentro?.nombre}</b> es una institución afiliada. Ingresa el código provisto por dirección para acceder.
            </p>
            
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-widest"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="CÓDIGO-ACCESO"
              />
            </div>
            
            <button 
              onClick={handleVerifyCode}
              disabled={loading || codigo.length < 4}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verificar y Unirse'}
            </button>
            <button 
              onClick={() => { setStep(1); setSelectedCentro(null); setCodigo(''); }}
              className="w-full mt-2 text-slate-500 hover:text-slate-700 text-sm font-medium py-2"
            >
              Volver atrás
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-800 mb-2">¡Casi listo!</h3>
              <p className="text-green-700 text-sm">
                Tu cuenta ha sido configurada exitosamente.
              </p>
            </div>
            
            {onboardingPlan === 'individual' ? (
              <button 
                onClick={() => {
                  setLoading(true);
                  // Simular redirección Tilopay
                  setTimeout(() => {
                    alert('Redirigiendo a pasarela de pago Tilopay para el plan INDIVIDUAL...');
                    setLoading(false);
                    onAuthSuccess();
                  }, 1500);
                }}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-[#7A8D69] hover:bg-[#6C7E5C] text-white font-bold py-3.5 px-4 rounded-xl transition-all"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Ir a Pagar (Tilopay)'}
              </button>
            ) : (
              <button 
                onClick={onAuthSuccess}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all"
              >
                Ir a mi panel principal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
