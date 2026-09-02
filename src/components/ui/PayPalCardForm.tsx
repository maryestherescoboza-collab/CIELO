import { useState, useEffect } from 'react';
import { 
  PayPalScriptProvider, 
  PayPalCardFieldsProvider, 
  PayPalNumberField, 
  PayPalExpiryField, 
  PayPalCVVField,
  usePayPalCardFields
} from '@paypal/react-paypal-js';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

interface PayPalCardFormProps {
  planType: 'mensual' | 'anual';
  onSuccess: (subscriptionId: string) => void;
  onError: (err: any) => void;
  onCancel: () => void;
}

const SubmitButton = ({ isProcessing, onProcess }: { isProcessing: boolean, onProcess: () => void }) => {
  const { cardFieldsForm } = usePayPalCardFields();
  
  const submitHandler = async () => {
    if (!cardFieldsForm) return;
    onProcess();
    try {
      await cardFieldsForm.submit();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button
      type="button"
      disabled={isProcessing}
      onClick={submitHandler}
      className="flex-1 px-4 py-2 bg-(--primary) text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : "Procesar Pago"}
    </button>
  );
};

export function PayPalCardForm({ planType, onSuccess, onError, onCancel }: PayPalCardFormProps) {
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardFieldsError, setCardFieldsError] = useState<string | null>(null);
  
  const clientId = "Af-mNy8fqCu4n5dP2W3m2LJ55jeeuUzp7Dfzq9SLtVXpBookh4wYuG7hrCtefhv2EQheWLCRLW6f6iv-";

  useEffect(() => {
    async function fetchToken() {
      try {
        const { data, error } = await supabase.functions.invoke('paypal-generate-client-token');
        if (error) throw error;
        if (data?.client_token) {
          setClientToken(data.client_token);
        } else {
          throw new Error('No se recibió el token del cliente');
        }
      } catch (error: any) {
        console.error("Error al obtener client_token:", error);
        setCardFieldsError("Error de comunicación. Intenta nuevamente.");
      } finally {
        setLoadingToken(false);
      }
    }
    fetchToken();
  }, []);

  const createCardSubscription = async (setupTokenId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('paypal-card-subscription', {
        body: { setup_token: setupTokenId, plan_type: planType }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      onSuccess(data.subscription_id);
    } catch (error: any) {
      console.error("Error en paypal-card-subscription:", error);
      onError(error);
      setIsProcessing(false);
    }
  };

  const handleApprove = async (data: any) => {
    if (data.vaultSetupToken) {
      await createCardSubscription(data.vaultSetupToken);
    } else {
      onError(new Error("No se pudo obtener el token de configuración de la tarjeta."));
      setIsProcessing(false);
    }
  };

  if (loadingToken) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-(--primary) mb-4" />
        <p className="text-sm text-(--ink-soft)">Iniciando pago seguro...</p>
      </div>
    );
  }

  if (!clientToken) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-rose-500 mb-4">{cardFieldsError || "Error al inicializar"}</p>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-(--ink-soft) hover:text-(--ink)">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-(--border-soft) mt-4">
      <h4 className="text-lg font-semibold text-(--ink) mb-4">Ingresa tu Tarjeta</h4>
      
      {cardFieldsError && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-md border border-rose-200">
          {cardFieldsError}
        </div>
      )}

      <PayPalScriptProvider options={{ 
        clientId, 
        components: "card-fields", 
        intent: "subscription",
        vault: true,
        dataClientToken: clientToken
      }}>
        <PayPalCardFieldsProvider
          createOrder={() => Promise.resolve("")} // Fake return for typings
          onApprove={handleApprove}
          onError={(err: any) => {
            console.error("PayPal Card Fields Error:", err);
            setCardFieldsError("No pudimos procesar la tarjeta. Por favor verifica tus datos.");
            setIsProcessing(false);
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-(--ink-soft)">Número de tarjeta</label>
              <PayPalNumberField 
                style={{
                  input: {
                    "font-size": "14px",
                    "font-family": "Inter, sans-serif",
                    "color": "#1F2937"
                  }
                }}
                className="p-3 border border-(--border-soft) rounded-md h-12"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-(--ink-soft)">Vencimiento</label>
                <PayPalExpiryField 
                  style={{
                    input: {
                      "font-size": "14px",
                      "font-family": "Inter, sans-serif",
                      "color": "#1F2937"
                    }
                  }}
                  className="p-3 border border-(--border-soft) rounded-md h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-(--ink-soft)">CVV</label>
                <PayPalCVVField 
                  style={{
                    input: {
                      "font-size": "14px",
                      "font-family": "Inter, sans-serif",
                      "color": "#1F2937"
                    }
                  }}
                  className="p-3 border border-(--border-soft) rounded-md h-12"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-(--background) border border-(--border-soft) text-(--ink-soft) rounded-md text-sm font-medium hover:bg-(--linen) disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              
              <SubmitButton isProcessing={isProcessing} onProcess={() => setIsProcessing(true)} />
            </div>
          </div>
        </PayPalCardFieldsProvider>
      </PayPalScriptProvider>
    </div>
  );
}
