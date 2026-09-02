import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function SuscripcionPaypalCancelada() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-(--border-soft) text-center">
        <XCircle size={48} className="text-rose-500 mb-6 mx-auto" />
        <h2 className="text-xl font-bold text-(--ink) mb-2">Pago Cancelado</h2>
        <p className="text-(--ink-soft) text-sm mb-6">
          Has cancelado el proceso de pago en PayPal. No se ha realizado ningún cargo y tu suscripción no se ha activado.
        </p>
        <button 
          onClick={() => navigate('/suscripcion')}
          className="px-6 py-2 bg-(--primary) text-white font-semibold rounded-lg hover:opacity-90 cursor-pointer"
        >
          Volver a planes
        </button>
      </div>
    </div>
  );
}
