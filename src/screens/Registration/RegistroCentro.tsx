import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, ArrowRight, Loader2, Check } from 'lucide-react';

interface Props {
  onAuthSuccess: () => void;
}

export default function RegistroCentro({ onAuthSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [codigoCentro, setCodigoCentro] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegisterCenter = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No hay sesión activa. Por favor regístrate primero.");
      }

      // Crear centro (estado = pendiente por defecto en la BD)
      const { data: centroData, error: centroError } = await supabase
        .from('centros')
        .insert({
          nombre,
          telefono,
          codigo_centro: codigoCentro,
          created_by: session.user.id
        })
        .select()
        .single();

      if (centroError) throw centroError;

      // Actualizar perfil del docente con el centro_id
      const { error: profileError } = await supabase
        .from('perfiles')
        .update({ centro_id: centroData.id })
        .eq('user_id', session.user.id);

      if (profileError) throw profileError;

      // Crear suscripción institucional pendiente
      const { error: subError } = await supabase
        .from('suscripciones')
        .insert({
          tipo: 'institucional',
          estado: 'pendiente',
          centro_id: centroData.id
        });

      if (subError) throw subError;

      // Avanzar al paso de Tilopay o finalizar
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mx-auto mb-6">
          <Building2 size={32} />
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Registrar Centro Institucional</h2>
        <p className="text-slate-500 text-center mb-8">
          {step === 1 ? 'Completa los datos de tu institución para configurar el entorno colaborativo.' : '¡Centro registrado con éxito!'}
        </p>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Centro</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Instituto Politécnico"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Código (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={codigoCentro}
                  onChange={e => setCodigoCentro(e.target.value)}
                  placeholder="Código del centro"
                />
              </div>
            </div>

            <button 
              onClick={handleRegisterCenter}
              disabled={loading || nombre.trim().length < 3}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>Crear Centro <ArrowRight size={20} /></>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-6">
            <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-800 mb-2">¡Centro Creado!</h3>
              <p className="text-green-700 text-sm">
                Tu centro se ha creado correctamente y tienes una suscripción pendiente.
              </p>
            </div>
            
            <button 
              onClick={() => {
                setLoading(true);
                // Simular redirección a Tilopay
                setTimeout(() => {
                  alert('Redirigiendo a pasarela de pago Tilopay para el plan INSTITUCIONAL...');
                  setLoading(false);
                  onAuthSuccess();
                }, 1500);
              }}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-[#7A8D69] hover:bg-[#6C7E5C] text-white font-bold py-3.5 px-4 rounded-xl transition-all"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Pagar Suscripción Institucional (Tilopay)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
