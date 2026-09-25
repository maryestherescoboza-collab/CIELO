import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 group">
          <img src={logo} alt="CIELO Logo" className="w-16 h-16 object-contain" />
          <span className="text-[9px] font-bold text-slate-500 bg-[#E6E1D8]/40 border border-slate-350/20 px-1.5 py-0.5 rounded-full select-none capitalize tracking-normal leading-none">Beta</span>
        </Link>
        
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => {
              document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:block text-[11px] font-bold text-[#5F665E] uppercase tracking-widest hover:text-[#2E3330] transition-colors"
          >
            Planes
          </button>
          <div className="flex items-center gap-2">
            <Link 
              to="/login"
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-transparent text-[#2E3330] text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-black/5 hover:-translate-y-0.5 transition-all"
            >
              Iniciar Sesión
            </Link>
            <Link 
              to="/auth?plan=individual"
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#DEAE4D] text-[#2E3330] text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-[#C99C44] hover:-translate-y-0.5 transition-all"
            >
              Comenzar prueba gratis
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
