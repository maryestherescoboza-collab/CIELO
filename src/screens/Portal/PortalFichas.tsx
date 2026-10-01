import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePortal, rutaPortal } from './portalContext';

interface FichaCompartida {
  id: string;
  titulo: string;
  fecha: string;
  curso_id: number;
}

export default function PortalFichas() {
  const { sessionToken, asignaturas, selectedPeriodo, token } = usePortal();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fichasCompartidas, setFichasCompartidas] = useState<FichaCompartida[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!sessionToken || asignaturas.length === 0) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Fichas Reales Compartidas
        const { data: fichasData, error: fichasError } = await supabase.rpc('portal_get_fichas_compartidas', {
          p_session_token: sessionToken
        });
        
        if (fichasError) throw fichasError;
        if (fichasData && !fichasData.error) {
          setFichasCompartidas(fichasData);
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar las fichas');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [sessionToken, selectedPeriodo, asignaturas]);



  const getSubjectIcon = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes('lengu')) return '📖';
    if (l.includes('mat')) return '📐';
    if (l.includes('cienc')) return '🔬';
    if (l.includes('hist')) return '⏳';
    if (l.includes('art')) return '🎨';
    if (l.includes('ing')) return '🌐';
    return '📚';
  };

  // Componentes preparados para sustituir posteriormente por assets animados personalizados
  const IconoMisionProducto = () => (
    <svg className="w-6.25 h-6.25 mr-3 shrink-0 animate-[pulse_2.5s_ease-in-out_infinite]" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path d="M401.92 888.32L371.2 750.08l-130.56 57.6 175.36-348.16 161.28 80.64z" fill="#E64C45" />
        <path d="M396.8 926.72L362.24 768l-148.48 66.56 197.12-392.96 184.32 92.16L396.8 926.72z m-16.64-194.56l26.88 119.04 153.6-305.92L422.4 476.16 268.8 782.08l111.36-49.92z" fill="#231C1C" />
        <path d="M624.64 888.32l30.72-138.24 130.56 57.6-175.36-348.16-161.28 80.64z" fill="#E64C45" />
        <path d="M629.76 926.72L432.64 533.76l184.32-92.16 197.12 392.96L665.6 768l-35.84 158.72zM467.2 545.28l153.6 305.92 26.88-119.04 111.36 49.92-153.6-305.92-138.24 69.12z" fill="#231C1C" />
        <path d="M719.36 609.28l-96 11.52-70.4 65.28-84.48-46.08-96 11.52-40.96-88.32-84.48-47.36 19.2-94.72-40.96-87.04 70.4-66.56 19.2-94.72 96-11.52 70.4-66.56 84.48 47.36 96-11.52 40.96 88.32 84.48 47.36-19.2 94.72 40.96 87.04-70.4 66.56z" fill="#00B2AE" />
        <path d="M554.24 702.72l-89.6-49.92-101.12 12.8-42.24-92.16-89.6-49.92 19.2-99.84-42.24-92.16 74.24-69.12 19.2-99.84 101.12-12.8 74.24-69.12 89.6 49.92 101.12-12.8 42.24 92.16 89.6 49.92-17.92 98.56 42.24 92.16-74.24 69.12-19.2 99.84-101.12 12.8-75.52 70.4z m-83.2-76.8l79.36 44.8 66.56-62.72 90.88-11.52 17.92-89.6 66.56-62.72-38.4-83.2 17.92-89.6-80.64-44.8-38.4-83.2-89.6 12.8-80.64-44.8-66.56 62.72-90.88 11.52-17.92 89.6-66.56 62.72 38.4 83.2-17.92 89.6 80.64 44.8 38.4 83.2 90.88-12.8z" fill="#231C1C" />
        <path d="M353.28 390.4a166.4 166.4 0 1 0 332.8 0 166.4 166.4 0 1 0-332.8 0Z" fill="#FAF1C7" />
        <path d="M519.68 569.6c-98.56 0-179.2-80.64-179.2-179.2s80.64-179.2 179.2-179.2 179.2 80.64 179.2 179.2c-1.28 98.56-80.64 179.2-179.2 179.2z m0-332.8c-84.48 0-153.6 69.12-153.6 153.6s69.12 153.6 153.6 153.6 153.6-69.12 153.6-153.6c-1.28-84.48-69.12-153.6-153.6-153.6z" fill="#231C1C" />
    </svg>
  );

  const IconoMisionRuta = () => (
    <svg className="w-6.25 h-6.25 mr-3 shrink-0 animate-[pulse_2.5s_ease-in-out_infinite]" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path d="M528.64 482.56m-396.8 0a396.8 396.8 0 1 0 793.6 0 396.8 396.8 0 1 0-793.6 0Z" fill="#A7BFB7" />
        <path d="M528.64 892.16c-225.28 0-409.6-184.32-409.6-409.6s184.32-409.6 409.6-409.6 409.6 184.32 409.6 409.6-184.32 409.6-409.6 409.6z m0-793.6c-211.2 0-384 172.8-384 384s172.8 384 384 384 384-172.8 384-384-172.8-384-384-384z" fill="#231C1C" />
        <path d="M528.64 482.56m-345.6 0a345.6 345.6 0 1 0 691.2 0 345.6 345.6 0 1 0-691.2 0Z" fill="#F2E5CA" />
        <path d="M528.64 840.96c-197.12 0-358.4-161.28-358.4-358.4s161.28-358.4 358.4-358.4 358.4 161.28 358.4 358.4-161.28 358.4-358.4 358.4z m0-691.2c-183.04 0-332.8 149.76-332.8 332.8s149.76 332.8 332.8 332.8 332.8-149.76 332.8-332.8-149.76-332.8-332.8-332.8z" fill="#231C1C" />
        <path d="M528.64 814.08l-75.52-331.52 75.52-331.52 74.24 331.52z" fill="#B8CA43" />
        <path d="M528.64 826.88c-6.4 0-11.52-3.84-12.8-10.24l-75.52-331.52v-5.12l75.52-331.52c1.28-6.4 6.4-10.24 12.8-10.24s11.52 3.84 12.8 10.24l75.52 331.52v5.12l-75.52 331.52c-2.56 6.4-7.68 10.24-12.8 10.24z m-62.72-344.32l61.44 273.92L588.8 482.56l-61.44-273.92-61.44 273.92z" fill="#231C1C" />
        <path d="M195.84 482.56l332.8-75.52 331.52 75.52-331.52 75.52z" fill="#B8CA43" />
        <path d="M528.64 570.88h-2.56l-331.52-75.52c-6.4-1.28-10.24-6.4-10.24-12.8s3.84-11.52 10.24-12.8L524.8 395.52h5.12l331.52 75.52c6.4 1.28 10.24 6.4 10.24 12.8s-3.84 11.52-10.24 12.8l-331.52 75.52c0-2.56-1.28-1.28-1.28-1.28z m-273.92-88.32l273.92 61.44 273.92-61.44-273.92-61.44-273.92 61.44z" fill="#231C1C" />
        <path d="M323.84 687.36l158.72-250.88 249.6-158.72-157.44 250.88z" fill="#B8CA43" />
        <path d="M323.84 700.16c-3.84 0-6.4-1.28-8.96-3.84-3.84-3.84-5.12-10.24-1.28-15.36l158.72-250.88 3.84-3.84 250.88-158.72c5.12-2.56 11.52-2.56 15.36 1.28 3.84 3.84 5.12 10.24 1.28 15.36L584.96 535.04l-3.84 3.84-250.88 158.72c-1.28 1.28-3.84 2.56-6.4 2.56z m167.68-254.72l-126.72 199.68 199.68-126.72L691.2 320l-199.68 125.44z" fill="#231C1C" />
        <path d="M323.84 277.76l250.88 158.72 157.44 250.88-249.6-158.72z" fill="#B8CA43" />
        <path d="M732.16 700.16c-2.56 0-5.12-1.28-6.4-2.56L474.88 540.16l-3.84-3.84-157.44-250.88c-2.56-5.12-2.56-11.52 1.28-15.36 3.84-3.84 10.24-5.12 15.36-1.28l250.88 158.72 3.84 3.84 158.72 250.88c2.56 5.12 2.56 11.52-1.28 15.36-3.84 1.28-6.4 2.56-10.24 2.56zM491.52 519.68L691.2 646.4l-126.72-199.68L364.8 320l126.72 199.68z" fill="#231C1C" />
        <path d="M528.64 482.56m-230.4 0a230.4 230.4 0 1 0 460.8 0 230.4 230.4 0 1 0-460.8 0Z" fill="#A7BFB7" />
        <path d="M528.64 725.76c-134.4 0-243.2-108.8-243.2-243.2s108.8-243.2 243.2-243.2 243.2 108.8 243.2 243.2-108.8 243.2-243.2 243.2z m0-460.8c-120.32 0-217.6 97.28-217.6 217.6s97.28 217.6 217.6 217.6 217.6-97.28 217.6-217.6-97.28-217.6-217.6-217.6z" fill="#231C1C" />
        <path d="M304.64 705.28l172.8-272.64 273.92-172.8-172.8 272.64z" fill="#FAC546" />
        <path d="M304.64 718.08c-3.84 0-6.4-1.28-8.96-3.84-3.84-3.84-5.12-10.24-1.28-15.36l172.8-273.92 3.84-3.84 273.92-172.8c5.12-2.56 11.52-2.56 15.36 1.28s5.12 10.24 1.28 15.36L590.08 540.16l-3.84 3.84L312.32 716.8c-2.56 1.28-5.12 1.28-7.68 1.28z m183.04-276.48L345.6 664.32l222.72-140.8 140.8-222.72-221.44 140.8z" fill="#231C1C" />
        <path d="M528.64 482.56m-38.4 0a38.4 38.4 0 1 0 76.8 0 38.4 38.4 0 1 0-76.8 0Z" fill="#E64C45" />
        <path d="M528.64 533.76c-28.16 0-51.2-23.04-51.2-51.2s23.04-51.2 51.2-51.2 51.2 23.04 51.2 51.2-23.04 51.2-51.2 51.2z m0-76.8c-14.08 0-25.6 11.52-25.6 25.6s11.52 25.6 25.6 25.6 25.6-11.52 25.6-25.6-11.52-25.6-25.6-25.6z" fill="#231C1C" />
    </svg>
  );

  return (
    <div className="pt-2 px-5">
      <div className="mb-5">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 pointer-events-none text-neutral-800">
            <svg className="w-4 h-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <input 
            className="w-full h-11 pl-10 pr-4 bg-white border border-black rounded-lg text-xs placeholder:text-neutral-500 focus:outline-none focus:ring-0 focus:border-black font-normal" 
            placeholder="Buscar asignaturas o fichas de clase..." 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <section className="mb-5">
        <div className="flex space-x-2 overflow-x-auto custom-scrollbar -mx-1 px-1 py-1">
          <button 
            onClick={() => setSelectedSubject(null)}
            className={`flex-none px-3 py-1.5 border border-black rounded-lg text-xs flex items-center space-x-1.5 transition ${!selectedSubject ? 'bg-black text-white font-bold' : 'bg-white text-black font-semibold hover:bg-neutral-50'}`}
          >
            <span className="text-[11px]">📋</span>
            <span>Todas</span>
          </button>
          
          {asignaturas.map(asig => {
            const isSelected = selectedSubject === asig.asignatura;
            return (
              <button 
                key={asig.asignatura}
                onClick={() => setSelectedSubject(asig.asignatura)}
                className={`flex-none px-3 py-1.5 border border-black rounded-lg text-xs flex items-center space-x-1.5 transition ${isSelected ? 'bg-brand-purple text-black font-bold shadow-sm' : 'bg-white text-black font-semibold hover:bg-neutral-50'}`}
              >
                <span className="text-[11px]">{getSubjectIcon(asig.asignatura)}</span>
                <span className="truncate max-w-25">{asig.asignatura}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black ml-1"></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-black tracking-tight">Fichas de Clase</h2>
        </div>
        
        {!loading && !error && fichasCompartidas.length === 0 ? (
          <div className="text-center py-6 bg-white border border-neutral-200 rounded-xl mb-6">
             <p className="text-neutral-500 text-sm">No hay fichas compartidas.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {fichasCompartidas.map((ficha) => (
              <article key={`ficha-${ficha.id}`} className="w-full border border-black rounded-xl p-4 bg-white shadow-sm flex flex-col">
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-black">{ficha.titulo || 'Sin título'}</h3>
                      <div className="mt-1 flex items-center">
                        <span className="text-[11px] font-bold text-neutral-500">Publicado el {new Date(ficha.fecha).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(rutaPortal(token, 'fichas', ficha.id))}
                      className="text-[11px] font-bold text-black bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors shrink-0"
                    >
                      Leer ›
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Misiones</h4>
                  <div className="space-y-3">
                    <div className="flex items-center text-[13px] font-bold text-[#1B1F2A]">
                      <IconoMisionProducto />
                      Subir producto
                    </div>

                    <div className="flex items-center text-[13px] font-bold text-[#1B1F2A]">
                      <IconoMisionRuta />
                      Completar ruta de aprendizaje
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>
    </div>
  );
}
