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
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#5F665E] uppercase tracking-widest hover:text-[#2E3330] transition-colors"
          >
            Planes
          </button>
          <Link 
            to="/login"
            className="px-6 py-2.5 rounded-full bg-[#BFC9A6] text-[#1d4431] text-xs font-black uppercase tracking-widest hover:bg-[#A9B492] hover:-translate-y-0.5 transition-all shadow-[0_4px_12px_rgba(191,201,166,0.3)]"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}
