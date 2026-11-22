import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-[#2E3330]/10 transition-colors">
      <div
        className="max-w-7xl mx-auto px-2.5 sm:px-6 flex items-center justify-between"
        style={{ height: 'var(--landing-nav-h)' }}
      >
        {/* Logo con insignia Beta */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
          <img
            src={logo}
            alt="CIELO Logo"
            className="w-7 h-7 sm:w-10 sm:h-10 md:w-13 md:h-13 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="landing-slide-micro font-bold text-[#4B5563] bg-[#EAE5DC] border border-[#2E3330]/10 px-1.5 py-0.5 rounded-full select-none tracking-normal">
            Beta
          </span>
        </Link>
        
        {/* Navegación y accesos equilibrados */}
        <div className="flex items-center gap-1.5 sm:gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <a
              href="#evaluacion"
              className="landing-slide-caption font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Evaluación
            </a>
            <a
              href="#planificacion"
              className="landing-slide-caption font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Planificación
            </a>
            <a
              href="#gestion-curso"
              className="landing-slide-caption font-bold text-[#5F665E] hover:text-[#2E3330] transition-colors tracking-wide py-1"
            >
              Bitácora
            </a>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <Link 
              to="/portal"
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full border border-[#2E3330]/15 bg-white text-[#2E3330] landing-slide-micro sm:landing-slide-caption font-medium hover:bg-[#E9E9DB] hover:border-[#2E3330]/30 transition-all inline-flex items-center"
            >
              Portal
            </Link>
            <Link 
              to="/login"
              className="px-2.5 sm:px-4 md:px-5 py-1 sm:py-1.5 rounded-full bg-[#2E3330] text-[#FCFCFA] landing-slide-micro sm:landing-slide-caption font-semibold hover:bg-[#1E2220] transition-all shadow-xs"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
