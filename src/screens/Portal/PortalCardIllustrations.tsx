import React from 'react';

interface IllustrationProps {
  className?: string;
}

/**
 * 1. LENGUA ESPAÑOLA (N.º 001) - "El Tomo del Cronista"
 * Temática: Comunicación, libros, narrativa y expresión.
 * Ilustración: Gran libro antiguo abierto iluminado con páginas ondeantes,
 * pluma de ave dorada trazando letras mágicas flotantes ('A', 'Ω', '✍'),
 * tintero de cristal con tinta zafiro brillante, sobre fondo azul noche estrellado.
 */
export const IlusLenguaEspanola: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-lengua" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="60%" stopColor="#172554" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
      <linearGradient id="gold-lengua" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
      <linearGradient id="glow-page" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FEF9C3" />
        <stop offset="100%" stopColor="#FDE68A" />
      </linearGradient>
      <radialGradient id="portal-light" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Fondo azul profundo con resplandor */}
    <rect width="240" height="160" fill="url(#bg-lengua)" />
    <circle cx="120" cy="85" r="75" fill="url(#portal-light)" />

    {/* Destellos y constelaciones de fondo */}
    <circle cx="45" cy="30" r="1.5" fill="#93C5FD" opacity="0.8" />
    <circle cx="70" cy="20" r="2" fill="#FDE047" opacity="0.9" />
    <circle cx="185" cy="25" r="1.5" fill="#93C5FD" opacity="0.8" />
    <circle cx="210" cy="45" r="2" fill="#FDE047" opacity="0.7" />
    <circle cx="30" cy="65" r="1.2" fill="#BFDBFE" opacity="0.6" />
    <line x1="45" y1="30" x2="70" y2="20" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
    <line x1="185" y1="25" x2="210" y2="45" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />

    {/* Arco arquitectónico de biblioteca */}
    <path d="M20 150 V50 Q120 10 220 50 V150" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />

    {/* Pedestal / Mesa de lectura */}
    <ellipse cx="120" cy="138" rx="85" ry="16" fill="#0F172A" stroke="#1E1E24" strokeWidth="2" />
    <ellipse cx="120" cy="136" rx="80" ry="14" fill="#1E293B" />

    {/* Libro Abierto Magno */}
    {/* Cubierta inferior */}
    <path d="M52 118 Q120 132 188 118 L194 126 Q120 142 46 126 Z" fill="#7C2D12" stroke="#1E1E24" strokeWidth="2" />
    {/* Páginas izquierdas */}
    <path d="M50 115 Q85 110 118 120 L118 80 Q85 70 48 76 Z" fill="url(#glow-page)" stroke="#1E1E24" strokeWidth="2" />
    <path d="M54 112 Q85 107 116 118 L116 78 Q85 68 52 74 Z" fill="#FEF08A" stroke="#1E1E24" strokeWidth="1.2" />
    {/* Páginas derechas */}
    <path d="M122 120 Q155 110 190 115 L192 76 Q155 70 122 80 Z" fill="url(#glow-page)" stroke="#1E1E24" strokeWidth="2" />
    <path d="M124 118 Q155 107 186 112 L188 74 Q155 68 124 78 Z" fill="#FEF08A" stroke="#1E1E24" strokeWidth="1.2" />
    {/* Lomo y cintillo marcador dorado */}
    <path d="M120 78 V134" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
    <path d="M120 80 Q130 95 124 136 L120 130 L116 136 Q118 95 120 80 Z" fill="url(#gold-lengua)" stroke="#1E1E24" strokeWidth="1" />

    {/* Líneas de texto mágicas en las páginas */}
    <line x1="62" y1="84" x2="105" y2="82" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    <line x1="60" y1="91" x2="108" y2="89" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="60" y1="98" x2="98" y2="96" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="132" y1="84" x2="175" y2="82" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="132" y1="91" x2="180" y2="89" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="134" y1="98" x2="168" y2="96" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />

    {/* Tintero de cristal con tinta mágica azul */}
    <rect x="180" y="112" width="22" height="20" rx="4" fill="#0284C7" stroke="#1E1E24" strokeWidth="2" />
    <rect x="184" y="106" width="14" height="6" rx="2" fill="#0369A1" stroke="#1E1E24" strokeWidth="1.5" />
    <ellipse cx="191" cy="122" rx="7" ry="4" fill="#38BDF8" opacity="0.8" />

    {/* Pluma de ave estilográfica dorada trazando palabras */}
    <g transform="rotate(-32 155 45)">
      <path d="M150 15 Q165 45 155 95 L153 105 L151 95 Q145 45 150 15 Z" fill="url(#gold-lengua)" stroke="#1E1E24" strokeWidth="2" />
      <path d="M152 20 V95" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M153 105 L153 115" stroke="#1E1E24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="153" cy="116" r="2.5" fill="#38BDF8" />
    </g>

    {/* Letras y símbolos flotantes luminosos */}
    <text x="82" y="52" fill="#FDE047" fontSize="16" fontWeight="bold" fontFamily="serif" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>A</text>
    <text x="148" y="44" fill="#93C5FD" fontSize="15" fontWeight="bold" fontFamily="serif">Ω</text>
    <text x="114" y="32" fill="#FDE047" fontSize="14" fontWeight="bold" fontFamily="sans-serif">¿?</text>
    <circle cx="98" cy="46" r="1.5" fill="#FDE047" />
    <circle cx="138" cy="50" r="1.5" fill="#60A5FA" />
  </svg>
);

/**
 * 2. MATEMÁTICA (N.º 002) - "El Núcleo Geométrico"
 * Temática: Geometría, números, lógica y patrones.
 * Ilustración: Icosaedro tridimensional flotante en el centro con aristas luminosas,
 * compás de oro, espiral áurea de Fibonacci, cuadrícula isométrica y fórmulas matemáticas.
 */
export const IlusMatematica: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-mate" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#064E3B" />
        <stop offset="60%" stopColor="#022C22" />
        <stop offset="100%" stopColor="#0B1311" />
      </linearGradient>
      <linearGradient id="gem-mate" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="50%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="gold-mate" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* Fondo verde esmeralda y cuadrícula de coordenadas */}
    <rect width="240" height="160" fill="url(#bg-mate)" />
    
    {/* Cuadrícula isométrica vectorial */}
    <g stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.25">
      <line x1="20" y1="160" x2="120" y2="0" />
      <line x1="60" y1="160" x2="160" y2="0" />
      <line x1="100" y1="160" x2="200" y2="0" />
      <line x1="220" y1="160" x2="120" y2="0" />
      <line x1="180" y1="160" x2="80" y2="0" />
      <line x1="140" y1="160" x2="40" y2="0" />
      <line x1="0" y1="80" x2="240" y2="80" />
      <line x1="0" y1="120" x2="240" y2="120" />
      <line x1="0" y1="40" x2="240" y2="40" />
    </g>

    {/* Espiral Áurea de Fibonacci luminosa */}
    <path 
      d="M120 75 Q135 75 135 90 Q135 110 110 110 Q75 110 75 75 Q75 30 130 30 Q195 30 195 95" 
      stroke="#34D399" 
      strokeWidth="1.5" 
      strokeDasharray="4 2" 
      opacity="0.6" 
      fill="none" 
    />

    {/* Halo central */}
    <circle cx="120" cy="78" r="55" fill="#10B981" opacity="0.15" />

    {/* Poliedro Icosaedro 3D Flotante */}
    {/* Cara central */}
    <polygon points="120,40 155,68 140,110 100,110 85,68" fill="#10B981" stroke="#1E1E24" strokeWidth="2.5" />
    {/* Facetas interiores con sombreado dinámico */}
    <polygon points="120,40 120,78 85,68" fill="#34D399" stroke="#1E1E24" strokeWidth="1.5" />
    <polygon points="120,40 155,68 120,78" fill="#6EE7B7" stroke="#1E1E24" strokeWidth="1.5" />
    <polygon points="155,68 140,110 120,78" fill="#059669" stroke="#1E1E24" strokeWidth="1.5" />
    <polygon points="140,110 100,110 120,78" fill="#047857" stroke="#1E1E24" strokeWidth="1.5" />
    <polygon points="100,110 85,68 120,78" fill="#065F46" stroke="#1E1E24" strokeWidth="1.5" />

    {/* Vértices brillantes */}
    <circle cx="120" cy="40" r="3" fill="#A7F3D0" stroke="#1E1E24" strokeWidth="1.2" />
    <circle cx="155" cy="68" r="3" fill="#A7F3D0" stroke="#1E1E24" strokeWidth="1.2" />
    <circle cx="140" cy="110" r="3" fill="#A7F3D0" stroke="#1E1E24" strokeWidth="1.2" />
    <circle cx="100" cy="110" r="3" fill="#A7F3D0" stroke="#1E1E24" strokeWidth="1.2" />
    <circle cx="85" cy="68" r="3" fill="#A7F3D0" stroke="#1E1E24" strokeWidth="1.2" />
    <circle cx="120" cy="78" r="3" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="1.2" />

    {/* Compás de precisión dorado a la derecha */}
    <g transform="translate(165, 82) rotate(-18)">
      <path d="M15 0 L5 50" stroke="url(#gold-mate)" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 0 L25 50" stroke="url(#gold-mate)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="15" cy="0" r="4.5" fill="#FDE047" stroke="#1E1E24" strokeWidth="2" />
      <path d="M8 25 Q15 28 22 25" stroke="#FDE047" strokeWidth="1.5" fill="none" />
    </g>

    {/* Escuadra geométrica a la izquierda */}
    <g transform="translate(38, 92) rotate(14)">
      <polygon points="0,35 45,35 0,0" fill="#FDE047" stroke="#1E1E24" strokeWidth="2" />
      <polygon points="8,28 32,28 8,10" fill="#064E3B" stroke="#1E1E24" strokeWidth="1.5" />
      <line x1="8" y1="35" x2="8" y2="31" stroke="#1E1E24" strokeWidth="1" />
      <line x1="16" y1="35" x2="16" y2="31" stroke="#1E1E24" strokeWidth="1" />
      <line x1="24" y1="35" x2="24" y2="31" stroke="#1E1E24" strokeWidth="1" />
      <line x1="32" y1="35" x2="32" y2="31" stroke="#1E1E24" strokeWidth="1" />
    </g>

    {/* Glifos matemáticos flotantes */}
    <text x="42" y="44" fill="#34D399" fontSize="15" fontWeight="bold" fontFamily="serif">π</text>
    <text x="184" y="45" fill="#34D399" fontSize="16" fontWeight="bold" fontFamily="serif">∑</text>
    <text x="110" y="24" fill="#FDE047" fontSize="15" fontWeight="bold" fontFamily="serif">∞</text>
    <text x="68" y="142" fill="#6EE7B7" fontSize="11" fontFamily="monospace">f(x)=x²</text>
  </svg>
);

/**
 * 3. CIENCIAS SOCIALES (N.º 003) - "La Esfera de las Eras"
 * Temática: Historia, mapas, territorio y ciudadanía.
 * Ilustración: Globo terráqueo vintage con meridiano de latón, rosa de los vientos,
 * columnas clásicas de la civilización y pergamino con rutas de expedición.
 */
export const IlusCienciasSociales: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-soc" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#78350F" />
        <stop offset="60%" stopColor="#451A03" />
        <stop offset="100%" stopColor="#1C0C04" />
      </linearGradient>
      <linearGradient id="gold-soc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <radialGradient id="sun-soc" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#78350F" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Fondo terracota cálido */}
    <rect width="240" height="160" fill="url(#bg-soc)" />
    <circle cx="120" cy="78" r="70" fill="url(#sun-soc)" />

    {/* Líneas de mapa náutico antiguo de fondo */}
    <g stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35">
      <circle cx="120" cy="78" r="62" />
      <line x1="20" y1="78" x2="220" y2="78" />
      <line x1="120" y1="10" x2="120" y2="146" />
      <line x1="45" y1="20" x2="195" y2="136" />
      <line x1="45" y1="136" x2="195" y2="20" />
    </g>

    {/* Columnas clásicas griegas en los laterales */}
    {/* Columna Izquierda */}
    <g transform="translate(18, 48)">
      <rect x="0" y="0" width="16" height="5" rx="1" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="1.5" />
      <rect x="2" y="5" width="12" height="75" fill="#FDE68A" stroke="#1E1E24" strokeWidth="1.5" />
      <line x1="6" y1="5" x2="6" y2="80" stroke="#D97706" strokeWidth="1" />
      <line x1="10" y1="5" x2="10" y2="80" stroke="#D97706" strokeWidth="1" />
      <rect x="0" y="80" width="16" height="6" rx="1" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="1.5" />
    </g>
    {/* Columna Derecha */}
    <g transform="translate(206, 48)">
      <rect x="0" y="0" width="16" height="5" rx="1" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="1.5" />
      <rect x="2" y="5" width="12" height="75" fill="#FDE68A" stroke="#1E1E24" strokeWidth="1.5" />
      <line x1="6" y1="5" x2="6" y2="80" stroke="#D97706" strokeWidth="1" />
      <line x1="10" y1="5" x2="10" y2="80" stroke="#D97706" strokeWidth="1" />
      <rect x="0" y="80" width="16" height="6" rx="1" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="1.5" />
    </g>

    {/* Globo Terráqueo Histórico en el Centro */}
    {/* Base y soporte de latón */}
    <path d="M120 125 V146" stroke="url(#gold-soc)" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="120" cy="147" rx="35" ry="8" fill="url(#gold-soc)" stroke="#1E1E24" strokeWidth="2" />
    {/* Anillo meridiano */}
    <path d="M78 78 A46 46 0 1 0 162 78" stroke="url(#gold-soc)" strokeWidth="4" strokeLinecap="round" fill="none" />

    {/* Esfera del mundo */}
    <circle cx="120" cy="78" r="42" fill="#0284C7" stroke="#1E1E24" strokeWidth="2.5" />
    {/* Continentes */}
    <path d="M96 68 Q106 60 114 66 Q122 72 118 84 Q110 92 100 88 Q92 80 96 68 Z" fill="#22C55E" stroke="#1E1E24" strokeWidth="1.2" />
    <path d="M126 56 Q136 54 145 62 Q150 74 142 82 Q130 84 126 74 Z" fill="#22C55E" stroke="#1E1E24" strokeWidth="1.2" />
    <path d="M130 88 Q142 86 148 96 Q144 104 135 106 Q128 100 130 88 Z" fill="#22C55E" stroke="#1E1E24" strokeWidth="1" />
    {/* Paralelos y meridianos de la esfera */}
    <ellipse cx="120" cy="78" rx="42" ry="14" stroke="#7DD3FC" strokeWidth="1" fill="none" opacity="0.6" />
    <ellipse cx="120" cy="78" rx="20" ry="42" stroke="#7DD3FC" strokeWidth="1" fill="none" opacity="0.6" />

    {/* Rosa de los Vientos en la esquina superior */}
    <g transform="translate(68, 26)">
      <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <polygon points="12,4 14,10 20,12 14,14 12,20 10,14 4,12 10,10" fill="#B45309" />
      <circle cx="12" cy="12" r="2.5" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="0.8" />
    </g>

    {/* Reloj de arena del tiempo a la derecha */}
    <g transform="translate(162, 28) scale(0.9)">
      <polygon points="0,0 20,0 10,15 20,30 0,30 10,15" fill="#FEF3C7" stroke="#1E1E24" strokeWidth="1.5" />
      <polygon points="4,24 16,24 10,17" fill="#F59E0B" />
      <polygon points="7,4 13,4 10,9" fill="#F59E0B" />
      <line x1="0" y1="0" x2="20" y2="0" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1="30" x2="20" y2="30" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 4. CIENCIAS DE LA NATURALEZA (N.º 004) - "El Matraz de la Creación"
 * Temática: Organismos, experimentación y naturaleza.
 * Ilustración: Matraz Erlenmeyer con líquido turquesa bioluminiscente burbujeante,
 * brote de hoja botánica verde viva, doble hélice de ADN flotante y modelo atómico orbital.
 */
export const IlusCienciasNaturaleza: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-nat" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0E7490" />
        <stop offset="60%" stopColor="#083344" />
        <stop offset="100%" stopColor="#04151D" />
      </linearGradient>
      <linearGradient id="liquid-nat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0891B2" />
      </linearGradient>
      <radialGradient id="glow-nat" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#083344" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Fondo cian oscuro con aura luminosa */}
    <rect width="240" height="160" fill="url(#bg-nat)" />
    <circle cx="120" cy="88" r="65" fill="url(#glow-nat)" />

    {/* Órbitas atómicas de fondo */}
    <g transform="translate(120, 88)" stroke="#67E8F9" strokeWidth="1" opacity="0.35">
      <ellipse rx="75" ry="24" transform="rotate(30)" fill="none" strokeDasharray="4 2" />
      <ellipse rx="75" ry="24" transform="rotate(-30)" fill="none" strokeDasharray="4 2" />
      <ellipse rx="75" ry="24" transform="rotate(90)" fill="none" strokeDasharray="4 2" />
      <circle cx="65" cy="-20" r="3" fill="#A5F3FC" />
      <circle cx="-60" cy="30" r="2.5" fill="#34D399" />
    </g>

    {/* Cadena de ADN flotante a la derecha */}
    <g transform="translate(182, 35)">
      <path d="M0 0 Q10 25 0 50 Q-10 75 0 100" stroke="#38BDF8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M12 0 Q2 25 12 50 Q22 75 12 100" stroke="#34D399" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="0" y1="15" x2="12" y2="15" stroke="#FDE047" strokeWidth="2" />
      <line x1="2" y1="35" x2="10" y2="35" stroke="#F43F5E" strokeWidth="2" />
      <line x1="0" y1="65" x2="12" y2="65" stroke="#FDE047" strokeWidth="2" />
      <line x1="2" y1="85" x2="10" y2="85" stroke="#F43F5E" strokeWidth="2" />
    </g>

    {/* Hojas botánicas vivas a la izquierda */}
    <g transform="translate(35, 60)">
      {/* Tallo */}
      <path d="M18 75 Q15 40 30 15" stroke="#15803D" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Hoja 1 */}
      <path d="M18 55 Q5 45 8 32 Q25 35 22 50 Z" fill="#22C55E" stroke="#1E1E24" strokeWidth="1.8" />
      <line x1="12" y1="42" x2="20" y2="52" stroke="#15803D" strokeWidth="1.2" />
      {/* Hoja 2 */}
      <path d="M25 35 Q40 22 36 10 Q20 16 23 30 Z" fill="#4ADE80" stroke="#1E1E24" strokeWidth="1.8" />
      {/* Gota de rocío brillante */}
      <circle cx="16" cy="38" r="2.5" fill="#A7F3D0" />
    </g>

    {/* Matraz de Laboratorio Erlenmeyer Central */}
    {/* Base y cuerpo de vidrio */}
    <path 
      d="M108 50 V70 L80 125 C75 135 84 145 96 145 H144 C156 145 165 135 160 125 L132 70 V50 Z" 
      fill="rgba(255,255,255,0.08)" 
      stroke="#1E1E24" 
      strokeWidth="2.5" 
    />
    {/* Cuello y borde superior */}
    <rect x="104" y="44" width="32" height="7" rx="3" fill="#E0F2FE" stroke="#1E1E24" strokeWidth="2" />

    {/* Líquido burbujeante interior */}
    <path 
      d="M87 120 C95 116 105 124 120 120 C135 116 145 124 153 120 L158 128 C162 135 155 143 144 143 H96 C85 143 78 135 82 128 Z" 
      fill="url(#liquid-nat)" 
      stroke="#06B6D4" 
      strokeWidth="1.5" 
    />

    {/* Burbujas mágicas flotando hacia arriba */}
    <circle cx="114" cy="132" r="3.5" fill="#CFFAFE" />
    <circle cx="128" cy="126" r="4.5" fill="#CFFAFE" />
    <circle cx="120" cy="105" r="3" fill="#A5F3FC" stroke="#0891B2" strokeWidth="1" />
    <circle cx="124" cy="85" r="2.5" fill="#A5F3FC" stroke="#0891B2" strokeWidth="1" />
    <circle cx="116" cy="65" r="3.5" fill="#67E8F9" stroke="#0891B2" strokeWidth="1" />
    <circle cx="122" cy="40" r="2" fill="#E0F2FE" />

    {/* Reflejos de brillo de cristal */}
    <path d="M92 120 L114 74" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <line x1="148" y1="135" x2="152" y2="128" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/**
 * 5. LENGUAS EXTRANJERAS (INGLÉS) (N.º 005) - "El Nexo Global"
 * Temática: Comunicación y diversidad lingüística.
 * Ilustración: Torre de reloj icónica (Big Ben) bajo cielo cósmico, globo con rutas aéreas,
 * bocadillos de diálogo multilenguaje ('HELLO!', 'WORLD', 'TALK'), ondas sonoras.
 */
export const IlusIngles: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-ing" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5B21B6" />
        <stop offset="60%" stopColor="#3B0764" />
        <stop offset="100%" stopColor="#18022B" />
      </linearGradient>
      <linearGradient id="gold-ing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <radialGradient id="glow-ing" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#3B0764" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Fondo púrpura / violeta cósmico */}
    <rect width="240" height="160" fill="url(#bg-ing)" />
    <circle cx="120" cy="80" r="70" fill="url(#glow-ing)" />

    {/* Ondas radiales de transmisión de voz */}
    <circle cx="120" cy="75" r="55" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
    <circle cx="120" cy="75" r="72" stroke="#A855F7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.3" />

    {/* Silueta Torre Big Ben a la izquierda */}
    <g transform="translate(42, 38)">
      {/* Aguja de la torre */}
      <polygon points="18,0 12,24 24,24" fill="url(#gold-ing)" stroke="#1E1E24" strokeWidth="1.5" />
      {/* Cuerpo superior de la campana */}
      <rect x="10" y="24" width="16" height="20" fill="#7C3AED" stroke="#1E1E24" strokeWidth="1.5" />
      {/* Esfera del reloj luminosa */}
      <circle cx="18" cy="34" r="6" fill="#FEF08A" stroke="#1E1E24" strokeWidth="1.2" />
      <line x1="18" y1="34" x2="18" y2="30" stroke="#1E1E24" strokeWidth="1" strokeLinecap="round" />
      <line x1="18" y1="34" x2="21" y2="34" stroke="#1E1E24" strokeWidth="1" strokeLinecap="round" />
      {/* Fuste de la torre con contrafuertes */}
      <rect x="8" y="44" width="20" height="75" fill="#6D28D9" stroke="#1E1E24" strokeWidth="1.5" />
      <line x1="13" y1="46" x2="13" y2="115" stroke="#4C1D95" strokeWidth="1.5" />
      <line x1="23" y1="46" x2="23" y2="115" stroke="#4C1D95" strokeWidth="1.5" />
    </g>

    {/* Globo terráqueo de conexiones en el centro */}
    <g transform="translate(100, 48)">
      <circle cx="36" cy="36" r="34" fill="#3B0764" stroke="#1E1E24" strokeWidth="2.5" />
      <ellipse cx="36" cy="36" rx="34" ry="12" stroke="#A855F7" strokeWidth="1" fill="none" opacity="0.7" />
      <ellipse cx="36" cy="36" rx="14" ry="34" stroke="#A855F7" strokeWidth="1" fill="none" opacity="0.7" />
      {/* Ruta de vuelo curva */}
      <path d="M10 50 Q36 10 65 30" stroke="#FDE047" strokeWidth="2" strokeDasharray="3 2" fill="none" />
      {/* Avión / Nave de comunicación */}
      <polygon points="65,30 58,26 62,32" fill="#FDE047" stroke="#1E1E24" strokeWidth="1" />
    </g>

    {/* Bocadillo de diálogo "HELLO!" en amarillo llamativo */}
    <g transform="translate(125, 25)">
      <path d="M0 8 C0 3.5 3.5 0 8 0 H68 C72.5 0 76 3.5 76 8 V24 C76 28.5 72.5 32 68 32 H24 L14 40 V32 H8 C3.5 32 0 28.5 0 24 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="2" />
      <text x="12" y="22" fill="#1E1E24" fontSize="13" fontWeight="900" fontFamily="sans-serif">HELLO!</text>
    </g>

    {/* Bocadillo de diálogo secundario "WORLD" en blanco */}
    <g transform="translate(142, 85)">
      <path d="M0 6 C0 2.5 2.5 0 6 0 H54 C57.5 0 60 2.5 60 6 V20 C60 23.5 57.5 26 54 26 H42 L34 32 V26 H6 C2.5 26 0 23.5 0 20 Z" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="2" />
      <text x="10" y="18" fill="#1E1E24" fontSize="11" fontWeight="800" fontFamily="sans-serif">WORLD</text>
    </g>

    {/* Cabina telefónica británica o icono de audio a la derecha */}
    <circle cx="210" cy="50" r="3" fill="#FDE047" />
    <circle cx="218" cy="70" r="2" fill="#C084FC" />
  </svg>
);

/**
 * 6. EDUCACIÓN FÍSICA (N.º 006) - "La Llama del Olimpo"
 * Temática: Movimiento, actividad física y bienestar.
 * Ilustración: Antorcha olímpica dorada con llama flamante estilizada,
 * cronómetro de precisión, pista de atletismo curvada en perspectiva y laurel de victoria.
 */
export const IlusEducacionFisica: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-ef" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#BE123C" />
        <stop offset="60%" stopColor="#881337" />
        <stop offset="100%" stopColor="#4C0519" />
      </linearGradient>
      <linearGradient id="fire-ef" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FEF08A" />
      </linearGradient>
      <linearGradient id="gold-ef" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* Fondo carmín atlético y líneas de velocidad */}
    <rect width="240" height="160" fill="url(#bg-ef)" />

    {/* Pista de atletismo en perspectiva curva */}
    <g stroke="#FB7185" strokeWidth="2" opacity="0.4">
      <path d="M0 160 Q120 100 240 140" fill="none" />
      <path d="M0 145 Q120 85 240 125" fill="none" strokeDasharray="6 4" />
      <path d="M0 130 Q120 70 240 110" fill="none" />
    </g>

    {/* Ráfagas de viento y velocidad dinámicas */}
    <path d="M20 40 H70" stroke="#FECDD3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <path d="M15 52 H55" stroke="#FECDD3" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <path d="M175 45 H225" stroke="#FECDD3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <path d="M185 58 H230" stroke="#FECDD3" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

    {/* Hojas de Laurel de Victoria en los costados */}
    <g transform="translate(45, 90)">
      <path d="M0 25 Q12 18 10 0 Q0 8 0 25 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <path d="M12 28 Q24 20 20 5 Q12 14 12 28 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <path d="M-10 28 Q-22 20 -18 5 Q-10 14 -10 28 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
    </g>
    <g transform="translate(195, 90)">
      <path d="M0 25 Q-12 18 -10 0 Q0 8 0 25 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <path d="M-12 28 Q-24 20 -20 5 Q-12 14 -12 28 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <path d="M10 28 Q22 20 18 5 Q10 14 10 28 Z" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
    </g>

    {/* Antorcha Olímpica Central */}
    {/* Mango de la antorcha */}
    <path d="M112 85 L116 148 H124 L128 85 Z" fill="url(#gold-ef)" stroke="#1E1E24" strokeWidth="2" />
    <line x1="117" y1="95" x2="119" y2="140" stroke="#92400E" strokeWidth="1.5" />
    <line x1="123" y1="95" x2="121" y2="140" stroke="#92400E" strokeWidth="1.5" />

    {/* Copa de la antorcha */}
    <path d="M102 85 C102 75 138 75 138 85 L132 94 H108 L102 85 Z" fill="url(#gold-ef)" stroke="#1E1E24" strokeWidth="2.2" />
    <ellipse cx="120" cy="85" rx="18" ry="5" fill="#78350F" stroke="#1E1E24" strokeWidth="1.5" />

    {/* Fuego Ardiente Estilizado de Videojuego */}
    <path 
      d="M120 15 C135 35 148 48 142 68 C138 80 128 84 120 84 C112 84 102 80 98 68 C92 48 108 38 120 15 Z" 
      fill="url(#fire-ef)" 
      stroke="#1E1E24" 
      strokeWidth="2.5" 
    />
    {/* Lengua interior de fuego blanco-amarillo */}
    <path 
      d="M120 38 C128 50 134 58 130 72 C127 79 122 81 120 81 C118 81 113 79 110 72 C106 58 114 50 120 38 Z" 
      fill="#FEF9C3" 
      stroke="#F59E0B" 
      strokeWidth="1.2" 
    />

    {/* Cronómetro de precisión flotante a la derecha */}
    <g transform="translate(155, 78) scale(0.9)">
      <rect x="15" y="-5" width="8" height="6" rx="2" fill="#E2E8F0" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="19" cy="18" r="18" fill="#F8FAFC" stroke="#1E1E24" strokeWidth="2.2" />
      <circle cx="19" cy="18" r="14" fill="#0F172A" />
      {/* Aguja del cronómetro */}
      <line x1="19" y1="18" x2="25" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="18" r="2" fill="#EF4444" />
      {/* Marcas de segundos */}
      <line x1="19" y1="6" x2="19" y2="8" stroke="#38BDF8" strokeWidth="1.5" />
      <line x1="31" y1="18" x2="29" y2="18" stroke="#38BDF8" strokeWidth="1.5" />
    </g>
  </svg>
);

/**
 * 7. EDUCACIÓN ARTÍSTICA (N.º 007) - "La Paleta del Creador"
 * Temática: Creatividad, música, pintura y composición.
 * Ilustración: Paleta clásica de pintor de madera con manchas de óleo brillantes,
 * pinceles con cerdas impregnadas de color, notas musicales danzando en el aire y mascarón teatral.
 */
export const IlusEducacionArtistica: React.FC<IllustrationProps> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bg-art" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C2410C" />
        <stop offset="60%" stopColor="#7C2D12" />
        <stop offset="100%" stopColor="#3C1004" />
      </linearGradient>
      <linearGradient id="wood-art" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
      <radialGradient id="glow-art" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FB923C" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#7C2D12" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Fondo naranja cálido / coral artístico */}
    <rect width="240" height="160" fill="url(#bg-art)" />
    <circle cx="120" cy="80" r="70" fill="url(#glow-art)" />

    {/* Pentagrama musical curvo en el cielo de la carta */}
    <g stroke="#FED7AA" strokeWidth="1" opacity="0.45" fill="none">
      <path d="M10 35 Q120 15 230 45" />
      <path d="M10 42 Q120 22 230 52" />
      <path d="M10 49 Q120 29 230 59" />
      <path d="M10 56 Q120 36 230 66" />
    </g>

    {/* Clave de Sol y Notas Musicales Danzantes */}
    <g transform="translate(25, 20)">
      {/* Nota musical doble */}
      <circle cx="10" cy="18" r="3.5" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <circle cx="24" cy="14" r="3.5" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      <line x1="13" y1="18" x2="13" y2="5" stroke="#1E1E24" strokeWidth="2" />
      <line x1="27" y1="14" x2="27" y2="2" stroke="#1E1E24" strokeWidth="2" />
      <line x1="13" y1="5" x2="27" y2="2" stroke="#1E1E24" strokeWidth="3" />
    </g>
    <g transform="translate(190, 22)">
      {/* Nota corchea simple */}
      <circle cx="12" cy="18" r="3.5" fill="#38BDF8" stroke="#1E1E24" strokeWidth="1.2" />
      <line x1="15" y1="18" x2="15" y2="5" stroke="#1E1E24" strokeWidth="2" />
      <path d="M15 5 Q24 7 20 15" stroke="#1E1E24" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>

    {/* Trazo curvo de pintura arcoíris fluido */}
    <path 
      d="M40 135 C70 90 120 115 150 70 C165 48 190 60 215 50" 
      stroke="#F43F5E" 
      strokeWidth="6" 
      strokeLinecap="round" 
      fill="none" 
      opacity="0.8" 
    />
    <path 
      d="M42 138 C72 93 122 118 152 73 C167 51 192 63 217 53" 
      stroke="#FBBF24" 
      strokeWidth="4" 
      strokeLinecap="round" 
      fill="none" 
      opacity="0.9" 
    />

    {/* Paleta de Madera de Pintor Central */}
    <g transform="translate(55, 62)">
      {/* Cuerpo de madera de la paleta con orificio para el pulgar */}
      <path 
        d="M20 50 C5 35 15 10 45 5 C85 -2 125 15 125 45 C125 75 95 85 65 80 C48 78 40 85 30 82 C18 78 15 62 20 50 Z" 
        fill="url(#wood-art)" 
        stroke="#1E1E24" 
        strokeWidth="2.5" 
      />
      {/* Agujero para el pulgar */}
      <ellipse cx="32" cy="62" rx="7" ry="10" fill="#3C1004" stroke="#1E1E24" strokeWidth="2" />

      {/* Manchas de óleo espesas y brillantes en la paleta */}
      <circle cx="45" cy="20" r="7" fill="#EF4444" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="43" cy="18" r="2.5" fill="#FCA5A5" />

      <circle cx="68" cy="14" r="7.5" fill="#F59E0B" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="66" cy="12" r="2.5" fill="#FDE68A" />

      <circle cx="92" cy="20" r="7" fill="#10B981" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="90" cy="18" r="2.5" fill="#A7F3D0" />

      <circle cx="108" cy="38" r="7.5" fill="#3B82F6" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="106" cy="36" r="2.5" fill="#BAE6FD" />

      <circle cx="98" cy="60" r="6.5" fill="#8B5CF6" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="96" cy="58" r="2" fill="#DDD6FE" />
    </g>

    {/* Pinceles Cruzados con cerdas coloridas */}
    <g transform="translate(100, 52) rotate(35)">
      {/* Mango del pincel 1 */}
      <path d="M12 0 L15 110" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      {/* Virola metálica */}
      <rect x="10" y="20" width="6" height="12" fill="#E2E8F0" stroke="#1E1E24" strokeWidth="1.2" />
      {/* Cerdas con pintura azul fresca */}
      <path d="M10 20 Q13 5 16 20 Z" fill="#0284C7" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="13" cy="6" r="2" fill="#38BDF8" />
    </g>
    <g transform="translate(138, 52) rotate(-28)">
      {/* Mango del pincel 2 */}
      <path d="M12 0 L15 110" stroke="#451A03" strokeWidth="4" strokeLinecap="round" />
      <rect x="10" y="20" width="6" height="12" fill="#FDE047" stroke="#1E1E24" strokeWidth="1.2" />
      {/* Cerdas con pintura carmín fresca */}
      <path d="M10 20 Q13 5 16 20 Z" fill="#E11D48" stroke="#1E1E24" strokeWidth="1.5" />
      <circle cx="13" cy="6" r="2" fill="#FDA4AF" />
    </g>
  </svg>
);

/**
 * Función selectora que devuelve la ilustración correspondiente según el nombre de la asignatura.
 */
export const getIlustracionAsignatura = (nombre: string, className = "w-full h-full") => {
  const norm = (nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('lengua') || norm.includes('espanol')) {
    return <IlusLenguaEspanola className={className} />;
  }
  if (norm.includes('matematica') || norm.includes('calculo')) {
    return <IlusMatematica className={className} />;
  }
  if (norm.includes('social') || norm.includes('historia')) {
    return <IlusCienciasSociales className={className} />;
  }
  if (norm.includes('naturaleza') || norm.includes('biolog') || norm.includes('quimic') || norm.includes('fisic') && norm.includes('cienc')) {
    return <IlusCienciasNaturaleza className={className} />;
  }
  if (norm.includes('ingl') || norm.includes('extranjer') || norm.includes('english')) {
    return <IlusIngles className={className} />;
  }
  if (norm.includes('fisica') || norm.includes('deporte')) {
    return <IlusEducacionFisica className={className} />;
  }
  if (norm.includes('artistic') || norm.includes('arte') || norm.includes('musica')) {
    return <IlusEducacionArtistica className={className} />;
  }
  return <IlusLenguaEspanola className={className} />;
};
