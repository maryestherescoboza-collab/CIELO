import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-6 h-22 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logo} alt="CIELO Logo" className="w-22 h-22 object-contain transition-transform group-hover:scale-105" />
          <span className="text-[11px] font-bold text-[#4B5563] bg-[#EAE5DC] border border-[#2E3330]/10 px-2.5 py-0.5 rounded-full select-none tracking-normal">
            Beta
          </span>
        </Link>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => {
              document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:block text-sm font-semibold text-[#3B423E] hover:text-[#2E3330] transition-colors"
          >
            Planes
          </button>
          <div className="flex items-center gap-2.5">
            <Link 
              to="/portal"
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border border-[rgba(46,51,48,0.18)] bg-white/80 text-[#2E3330] text-xs sm:text-sm font-medium hover:bg-black/5 hover:-translate-y-0.5 transition-all inline-flex items-center"
            >
              Portal Estudiantes
            </Link>
            <Link 
              to="/login"
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-transparent text-[#2E3330] text-xs sm:text-sm font-medium hover:bg-black/5 hover:-translate-y-0.5 transition-all"
            >
              Iniciar sesión
            </Link>
            <Link 
              to="/auth?plan=individual"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#DEAE4D] text-[#2E3330] text-xs sm:text-sm font-bold hover:bg-[#C99C44] hover:-translate-y-0.5 transition-all shadow-sm"
            >
              Comenzar prueba gratis
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
