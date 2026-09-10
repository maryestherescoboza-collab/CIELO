import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';

export function LandingFooter() {
  return (
    <footer className="bg-[#F3EDE7] border-t border-[rgba(46,51,48,0.08)]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Layout principal: Logo + Enlaces */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* Columna izquierda: Marca y descripción */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="flex items-center gap-2.5 w-fit group">
              <img 
                src={logo} 
                alt="CIELO" 
                className="w-10 h-10 object-contain" 
              />
              <span className="text-[#2E3330] font-black text-lg tracking-tight">
                CIELO
              </span>
            </Link>
            <p className="text-[#5F665E] text-sm leading-relaxed max-w-sm">
              Plataforma integral para la gestión y evaluación por competencias en República Dominicana.
            </p>
          </div>

          {/* Columna derecha: Enlaces organizados */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            
            {/* Producto */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#2E3330] mb-4">
                Producto
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a 
                    href="#descubrir" 
                    className="text-[#5F665E] hover:text-[#2E3330] transition-colors text-sm"
                  >
                    Características
                  </a>
                </li>
                <li>
                  <a 
                    href="#planes" 
                    className="text-[#5F665E] hover:text-[#2E3330] transition-colors text-sm"
                  >
                    Planes
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#2E3330] mb-4">
                Legal
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link 
                    to="/privacidad" 
                    className="text-[#5F665E] hover:text-[#2E3330] transition-colors text-sm"
                  >
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/terminos" 
                    className="text-[#5F665E] hover:text-[#2E3330] transition-colors text-sm"
                  >
                    Términos
                  </Link>
                </li>
              </ul>
            </div>

            {/* Acceso */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#2E3330] mb-4">
                Acceso
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link 
                    to="/login" 
                    className="text-[#5F665E] hover:text-[#2E3330] transition-colors text-sm"
                  >
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Barra inferior: Copyright */}
        <div className="mt-14 pt-6 border-t border-[rgba(46,51,48,0.08)]">
          <p className="text-[#8A918A] text-xs text-center">
            &copy; {new Date().getFullYear()} CIELO. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
