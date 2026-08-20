import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import logo from '../assets/logo.png';

const ConfirmarCorreo = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando tu cuenta, por favor espera...');

    useEffect(() => {
        const verifyOtp = async () => {
            const token_hash = searchParams.get('token_hash');
            const type = searchParams.get('type') as any;

            if (!token_hash || !type) {
                setStatus('error');
                setMessage('Enlace inválido o incompleto. Asegúrate de copiar el enlace completo desde tu correo.');
                return;
            }

            try {
                const { error } = await supabase.auth.verifyOtp({
                    token_hash,
                    type
                });

                if (error) {
                    throw error;
                }

                setStatus('success');
                setMessage('¡Tu cuenta ha sido verificada exitosamente!');
                
                // Redirigir al dashboard tras 3 segundos
                setTimeout(() => {
                    navigate('/');
                }, 3000);
                
            } catch (error: any) {
                setStatus('error');
                console.error("Error al verificar OTP:", error);
                
                // Si el error indica que el token expiró
                if (error.message?.includes('expired') || error.message?.includes('used')) {
                    setMessage('El enlace ha expirado o ya fue utilizado. Si ya habías verificado tu cuenta, puedes intentar iniciar sesión. Si no, solicita un nuevo enlace.');
                } else {
                    setMessage('Hubo un problema al verificar tu correo. Intenta iniciar sesión o solicita un nuevo enlace de confirmación.');
                }
            }
        };

        verifyOtp();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <img src={logo} alt="CIELO" className="h-12 w-auto mx-auto mb-8" />
                
                <div className="flex justify-center mb-6">
                    {status === 'loading' && (
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center animate-in zoom-in">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center animate-in zoom-in">
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                    )}
                </div>

                <h2 className={`text-xl font-bold mb-3 ${
                    status === 'loading' ? 'text-slate-800' : 
                    status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                    {status === 'loading' ? 'Confirmando...' : 
                     status === 'success' ? '¡Todo listo!' : 'No pudimos verificar'}
                </h2>
                
                <p className="text-slate-600 mb-8 leading-relaxed">
                    {message}
                </p>

                {status !== 'loading' && (
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        {status === 'success' ? 'Ir al inicio' : 'Volver al inicio de sesión'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ConfirmarCorreo;
