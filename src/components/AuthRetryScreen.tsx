interface AuthRetryScreenProps {
  onRetry: () => void;
  retrying?: boolean;
}

export default function AuthRetryScreen({ onRetry, retrying = false }: AuthRetryScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-(--border-soft) shadow-md rounded-(--radius-lg) px-8 py-7 flex flex-col items-center text-center">
        <p className="text-sm font-black text-(--ink)">Parece que está tardando un poco más de lo habitual.</p>
        <p className="text-xs font-bold text-(--ink-soft) mt-2">Inténtalo nuevamente más tarde.</p>
        <p className="text-xs font-bold text-(--ink-soft) mt-1.5">Tómate un momento, tus datos están seguros.</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-5 w-full py-3 bg-[#689C63] hover:bg-[#689C63]/90 text-white rounded-xl font-black text-xs tracking-widest shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 uppercase"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}