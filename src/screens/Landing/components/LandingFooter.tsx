import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingFooter() {
  return (
    <footer className="bg-[#1E293B] text-white py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="bg-white rounded-xl p-1">
              <img src={logo} alt="CIELO Logo" className="w-16 h-16 object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-xl tracking-tighter">CIELO</span>
              <span className="text-[9px] font-bold text-slate-300 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded-full select-none capitalize tracking-normal leading-none">Beta</span>
            </div>
          </Link>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
            Plataforma integral para la gestión y evaluación por competencias en República Dominicana.
          </p>
        </div>
        
        <div>
          <h4 className="font-black uppercase tracking-widest text-xs mb-6 text-slate-300">Producto</h4>
          <ul className="space-y-3">
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Características</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Planes</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Estadísticas</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-xs mb-6 text-slate-300">Legal</h4>
          <ul className="space-y-3">
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Privacidad</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Términos</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-xs font-medium">
          &copy; {new Date().getFullYear()} CIELO. Todos los derechos reservados.
        </p>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          CIELO está en Beta · Tu experiencia nos ayuda a mejorar
        </p>
      </div>
    </footer>
  );
}
