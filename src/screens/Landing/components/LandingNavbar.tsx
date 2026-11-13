import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#2E3330]/10 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-20 flex items-center justify-between">
        {/* Logo con insignia Beta */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 group">
          <img
            src={logo}
            alt="CIELO Logo"
            className="w-10 h-10 sm:w-18 sm:h-18 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-[9px] sm:text-[11px] font-bold text-[#4B5563] bg-[#EAE5DC] border border-[#2E3330]/10 px-2 py-0.5 rounded-full select-none tracking-normal">
            Beta
          </span>
        </Link>
        
        {/* Navegación y accesos equilibrados */}
        <div className="flex items-center gap-2 sm:gap-8">
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#evaluacion"
              className="text-xs font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Evaluación
            </a>
            <a
              href="#planificacion"
              className="text-xs font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Planificación
            </a>
            <a
              href="#gestion-curso"
              className="text-xs font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Bitácora
            </a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link 
              to="/portal"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#2E3330]/15 bg-white text-[#2E3330] text-[11px] sm:text-xs font-medium hover:bg-[#E9E9DB] hover:border-[#2E3330]/30 transition-all inline-flex items-center"
            >
              Portal
            </Link>
            <Link 
              to="/login"
              className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#2E3330] text-[#FCFCFA] text-[11px] sm:text-sm font-semibold hover:bg-[#1E2220] transition-all shadow-xs"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
