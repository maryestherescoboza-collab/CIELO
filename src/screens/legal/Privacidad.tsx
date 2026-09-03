import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { ShieldAlert, ChevronLeft } from 'lucide-react';

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-(--background) font-sans pb-16">
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-[rgba(46,51,48,0.08)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 group">
            <img src={logo} alt="CIELO Logo" className="w-16 h-16 object-contain" />
            <span className="text-[9px] font-bold text-slate-500 bg-[#E6E1D8]/40 border border-slate-350/20 px-1.5 py-0.5 rounded-full select-none capitalize tracking-normal leading-none">Beta</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-(--ink-soft) hover:text-(--primary) flex items-center gap-1">
            <ChevronLeft size={16} /> Volver
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32">
        <div className="mb-12">
          <div className="w-16 h-16 bg-(--linen) rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-(--border-soft)">
            <ShieldAlert className="text-(--primary)" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-(--ink) tracking-tight mb-4">
            Aviso de Privacidad
          </h1>
          <div className="flex flex-col gap-1 text-sm text-(--ink-soft)">
            <p><strong>Fecha de última actualización:</strong> 3/9/2026</p>
            <p><strong>Versión:</strong> 1.0</p>
          </div>
        </div>

        <div className="prose prose-sm prose-slate max-w-none text-(--ink) space-y-8">
          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">1. Responsable</h2>
            <p>
              MARY ESTHER MARTÍNEZ ESCOBOZA es la Responsable del tratamiento de los datos personales recabados a través de la plataforma CIELO.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">2. Información recopilada</h2>
            <p>
              Para operar CIELO, podemos recopilar y tratar las siguientes categorías de información:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Información de cuenta:</strong> Nombres, apellidos, correo electrónico y contraseña (encriptada).</li>
              <li><strong>Información de contacto:</strong> Datos provistos para soporte o comunicaciones.</li>
              <li><strong>Información de docentes e instituciones:</strong> Perfiles profesionales, datos del centro educativo, cursos asignados.</li>
              <li><strong>Información académica:</strong> Datos sobre cursos, evaluaciones, calificaciones y registros educativos introducidos por los docentes.</li>
              <li><strong>Información de estudiantes:</strong> Nombres e identificadores necesarios para la evaluación académica.</li>
              <li><strong>Información relacionada con suscripciones:</strong> Historial de pagos y estado de suscripción.</li>
              <li><strong>Información técnica:</strong> Direcciones IP, tipo de navegador, sistema operativo y registros de uso (logs) necesarios para operar el servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">3. Finalidades</h2>
            <p>
              Utilizamos la información recopilada para:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Crear, gestionar y mantener su Cuenta en CIELO.</li>
              <li>Proveer las funcionalidades educativas de la Plataforma.</li>
              <li>Procesar las Suscripciones y gestionar el acceso premium.</li>
              <li>Proporcionar soporte técnico y atención al usuario.</li>
              <li>Mejorar nuestros servicios mediante el análisis de uso.</li>
              <li>Cumplir con obligaciones legales aplicables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">4. Información académica</h2>
            <p>
              Los datos educativos (evaluaciones, calificaciones, reportes) introducidos por los Usuarios son tratados exclusivamente con el fin de proveer la herramienta de evaluación. CIELO actúa como encargado del tratamiento tecnológico, siendo el Docente o la Institución el responsable de los datos introducidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">5. Estudiantes</h2>
            <p>
              La información relacionada con estudiantes es sensible y debe ser introducida y gestionada por los Usuarios (docentes o instituciones) con el debido cuidado y legitimación, conforme a la normativa local aplicable en su jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">6. Proveedores tecnológicos</h2>
            <p>
              Para prestar nuestros servicios, CIELO utiliza proveedores tecnológicos externos que actúan bajo nuestras instrucciones y cumplen con altos estándares de seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">7. Uso de Supabase</h2>
            <p>
              Nuestra infraestructura de base de datos y autenticación está alojada en <strong>Supabase</strong>, proveedor que almacena de forma segura los datos de cuentas, contraseñas encriptadas y la información generada en la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">8. Proveedores de pago</h2>
            <p>
              Para gestionar las suscripciones, utilizamos pasarelas de pago externas (actualmente <strong>PayPal</strong>). CIELO no tiene acceso ni almacena los datos de su tarjeta de crédito o información bancaria completa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">9. Cookies y tecnologías similares</h2>
            <p>
              Utilizamos cookies técnicas y de sesión (como los tokens de autenticación de Supabase) estrictamente necesarias para mantener su sesión activa y asegurar el correcto funcionamiento de CIELO. No utilizamos cookies invasivas de seguimiento publicitario de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">10. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas razonables (como encriptación, control de acceso y protocolos seguros) para proteger la información contra accesos no autorizados, pérdida o alteración. Sin embargo, ningún sistema es completamente infalible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">11. Conservación</h2>
            <p>
              La información se conserva durante el tiempo que mantenga activa su Cuenta y sea necesario para prestar los Servicios, así como para cumplir con posibles obligaciones legales o resolver disputas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">12. Derechos de los usuarios</h2>
            <p>
              Dependiendo de su jurisdicción, usted puede tener derecho a acceder, rectificar, cancelar u oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos enviando una solicitud a través de nuestros canales de contacto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">13. Transferencias internacionales</h2>
            <p>
              Al utilizar proveedores tecnológicos globales (como Supabase), es posible que su información sea transferida y almacenada en servidores ubicados fuera de su país de residencia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">14. Cambios del aviso</h2>
            <p>
              Nos reservamos el derecho de actualizar este Aviso de Privacidad. Notificaremos cualquier cambio significativo publicando la nueva versión en la Plataforma con la fecha de actualización correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">15. Contacto</h2>
            <p>
              Si tiene dudas sobre cómo manejamos su privacidad o desea ejercer sus derechos, por favor contáctenos en: soporte@evaluacielo.com
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
