import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src={logo} 
            alt="CIELO Logo" 
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform" 
          />
          <span className="text-[#2E3330] font-black text-xl tracking-tighter">CIELO</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/login"
            className="px-6 py-2.5 rounded-full bg-[#ADC762] text-white text-xs font-black uppercase tracking-widest hover:bg-[#6C7E5C] hover:-translate-y-0.5 transition-all shadow-sm"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}
