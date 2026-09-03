import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Shield, ChevronLeft } from 'lucide-react';

export default function Terminos() {
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
            <Shield className="text-(--primary)" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-(--ink) tracking-tight mb-4">
            Términos y Condiciones
          </h1>
          <div className="flex flex-col gap-1 text-sm text-(--ink-soft)">
            <p><strong>Fecha de entrada en vigor:</strong> 3/9/2026</p>
            <p><strong>Versión:</strong> 1.0</p>
          </div>
        </div>

        <div className="prose prose-sm prose-slate max-w-none text-(--ink) space-y-8">
          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">1. Introducción</h2>
            <p>
              Bienvenido a CIELO (plataforma SaaS educativa para evaluación por competencias). 
              Estos Términos y Condiciones ("Términos") regulan el acceso y uso de nuestra plataforma y servicios. 
              Al acceder o utilizar CIELO, usted acepta quedar vinculado por estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">2. Definiciones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>CIELO:</strong> La plataforma SaaS de evaluación por competencias.</li>
              <li><strong>Usuario:</strong> Cualquier persona que acceda o utilice la Plataforma.</li>
              <li><strong>Docente:</strong> Usuario registrado con perfil de profesor o educador.</li>
              <li><strong>Institución:</strong> Centro educativo u organización que contrata servicios para múltiples docentes.</li>
              <li><strong>Estudiante:</strong> Sujeto de la evaluación académica gestionada a través de la Plataforma.</li>
              <li><strong>Cuenta:</strong> Registro personal o institucional creado para acceder a CIELO.</li>
              <li><strong>Plataforma / Servicios:</strong> Todo el software, funcionalidades, y herramientas provistas por CIELO.</li>
              <li><strong>Suscripción:</strong> Plan de pago contratado para acceder a funcionalidades premium.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">3. Aceptación de los términos</h2>
            <p>
              El registro, acceso y utilización de determinados servicios de CIELO implica la aceptación expresa, plena y sin reservas de estos Términos. Si no está de acuerdo con alguna de las condiciones, no debe utilizar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">4. Registro de cuenta</h2>
            <p>
              Para utilizar CIELO, es necesario registrarse y crear una Cuenta. Usted declara y garantiza que la información proporcionada es precisa y veraz.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Es responsable de mantener la confidencialidad de sus credenciales.</li>
              <li>Queda estrictamente prohibido compartir su cuenta con terceros, salvo autorización expresa en planes institucionales.</li>
              <li>Es su obligación mantener su información de registro actualizada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">5. Uso de CIELO</h2>
            <p>
              Usted se compromete a utilizar CIELO de conformidad con la ley, la moral, el orden público y estos Términos, haciendo un uso adecuado de los Servicios exclusivamente para fines educativos y de gestión académica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">6. Usos prohibidos</h2>
            <p>Queda terminantemente prohibido:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Cualquier uso fraudulento o contrario a la legalidad vigente.</li>
              <li>El acceso no autorizado a cuentas de otros usuarios o a los sistemas de CIELO.</li>
              <li>La manipulación, ingeniería inversa o modificación no autorizada de la Plataforma.</li>
              <li>La extracción sistemática de información (scraping, minería de datos).</li>
              <li>Llevar a cabo ataques de denegación de servicio (DDoS) u otros abusos técnicos.</li>
              <li>La utilización ilícita o abusiva de los servicios provistos.</li>
              <li>La suplantación de identidad de cualquier usuario o entidad.</li>
              <li>La introducción de virus, troyanos, o cualquier otro contenido malicioso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">7. Funcionalidades educativas</h2>
            <p>
              CIELO proporciona herramientas tecnológicas para apoyar la labor docente, tales como planificación, evaluación, rúbricas, listas de cotejo, gestión de cursos, calificaciones, seguimiento académico y generación de documentos (según disponibilidad). Estas herramientas son un apoyo y no sustituyen el juicio profesional del educador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">8. Contenido introducido por los usuarios</h2>
            <p>
              Usted es el único responsable por la exactitud, calidad, legalidad e integridad de todos los datos y contenidos (el "Contenido") que introduzca en CIELO. CIELO no reclama la propiedad de dicho Contenido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">9. Información académica</h2>
            <p>
              La información académica y de estudiantes introducida en CIELO debe cumplir con las normativas locales aplicables. El Usuario o Institución es el responsable legal (controlador) de dichos datos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">10. Propiedad intelectual</h2>
            <p>
              La marca CIELO, el software, interfaz, diseño, código, documentación, metodología propia, elementos gráficos y contenidos propios son propiedad exclusiva de CIELO o de sus licenciantes, y están protegidos por leyes de propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">11. Suscripciones</h2>
            <p>
              CIELO ofrece funcionalidades mediante Suscripciones de pago.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Planes:</strong> Disponemos de planes Docente Independiente, Plan Anual y Plan Institucional.</li>
              <li><strong>Modalidades:</strong> Existen modalidades de facturación mensual y anual, con renovación automática según el ciclo elegido.</li>
              <li><strong>Activación:</strong> La Suscripción se activa tras la confirmación exitosa del pago.</li>
              <li><strong>Cancelación:</strong> Puede cancelar la renovación de su Suscripción en cualquier momento desde su panel de control.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">12. Pagos</h2>
            <p>
              Los pagos son procesados mediante proveedores externos autorizados (actualmente PayPal). CIELO no almacena directamente la información financiera completa o números de tarjeta de crédito en sus servidores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">13. Servicios de terceros</h2>
            <p>
              Determinadas funciones de CIELO pueden depender o integrarse con proveedores tecnológicos externos. No somos responsables por las fallas o disponibilidad de dichos servicios de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">14. Disponibilidad</h2>
            <p>
              Procuramos mantener el servicio de CIELO disponible y operativo de manera continua. Sin embargo, pueden existir interrupciones derivadas del mantenimiento, fallos técnicos, problemas con proveedores externos, o circunstancias de fuerza mayor fuera de nuestro control razonable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">15. Seguridad</h2>
            <p>
              Implementamos medidas razonables y estándares de la industria para proteger la información y la Plataforma, aunque no podemos garantizar una seguridad absoluta e infalible frente a ataques cibernéticos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">16. Cancelación y terminación</h2>
            <p>
              Usted puede cancelar su Cuenta en cualquier momento. CIELO se reserva el derecho de suspender o terminar el acceso a cualquier Cuenta en caso de incumplimiento de estos Términos, impago prolongado o actividades sospechosas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">17. Modificaciones del servicio</h2>
            <p>
              CIELO evoluciona continuamente, por lo que nos reservamos el derecho de modificar, agregar o actualizar funcionalidades de la Plataforma en cualquier momento, buscando siempre mejorar la experiencia educativa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">18. Modificación de términos</h2>
            <p>
              Estos Términos pueden ser actualizados. Notificaremos a los usuarios sobre cambios sustanciales, y el uso continuado de la Plataforma tras dichas modificaciones implicará su aceptación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">19. Privacidad</h2>
            <p>
              El tratamiento de sus datos personales se rige por nuestro <Link to="/privacidad" className="text-(--primary) hover:underline">Aviso de Privacidad</Link>, el cual forma parte integral de estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">20. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley, CIELO no será responsable por daños indirectos, incidentales, o consecuentes derivados del uso o incapacidad de uso de la Plataforma, ni por la pérdida de datos atribuible al mal uso del Usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">21. Ley aplicable y jurisdicción</h2>
            <p>
              La relación entre el Usuario y la Responsable se regirá por la normativa vigente aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-(--ink) mb-3">22. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos Términos, puede contactarnos a través de los canales de soporte disponibles en CIELO. soporte@evaluacielo.com
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
