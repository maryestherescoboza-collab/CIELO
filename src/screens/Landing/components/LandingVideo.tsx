import { useState, useRef } from 'react';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';

const chapters = [
  { id: 'intro', title: 'Introducción', time: '00:00', seconds: 0, desc: 'La importancia de la evaluación continua.' },
  { id: 'dashboard', title: 'Dashboard y Reportes', time: '00:32', seconds: 32, desc: 'Informes y seguimiento de estudiantes.' },
  { id: 'cursos', title: 'Cursos y Actividades', time: '02:06', seconds: 126, desc: 'Creación de actividades por competencia.' },
  { id: 'evaluacion', title: 'Registro de Calificaciones', time: '02:37', seconds: 157, desc: 'Tres formas de registrar calificaciones.' },
  { id: 'rubricas', title: 'Rúbricas y Cotejos', time: '03:32', seconds: 212, desc: 'Evaluación rápida sin promediar.' },
  { id: 'historico', title: 'Histórico y Evidencias', time: '05:31', seconds: 331, desc: 'Registro detallado para responder dudas.' }
];

export function LandingVideo() {
  const [activeChapter, setActiveChapter] = useState(0);
  const playerRef = useRef<any>(null);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      color: 'white',
    },
  };

  const onReady = (event: any) => {
    playerRef.current = event.target;
  };

  const handleChapterClick = (index: number, seconds: number) => {
    setActiveChapter(index);
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  return (
    <section className="py-24 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif text-[#2C2A26] mb-4">
            Conoce CIELO
          </h2>
          <p className="text-xl text-[#5C5A56] max-w-2xl mx-auto">
            Descubre cómo transformamos la evaluación por competencias en una experiencia simple y efectiva.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Video Player */}
          <div className="w-full lg:w-2/3 rounded-xl overflow-hidden bg-[#2C2A26] aspect-video border border-[#E5E0D8]">
            <YouTube 
              videoId="FwjSLLEetyM" 
              opts={opts} 
              onReady={onReady} 
              className="w-full h-full"
            />
          </div>

          {/* Chapters */}
          <div className="w-full lg:w-1/3 flex flex-col gap-2">
            <h3 className="text-lg font-medium text-[#2C2A26] mb-4">
              En este video
            </h3>
            
            <div className="flex flex-col gap-1">
              {chapters.map((chapter, index) => {
                const isActive = activeChapter === index;
                
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterClick(index, chapter.seconds)}
                    className={`text-left p-4 rounded-lg transition-all duration-200 border-l-4 ${
                      isActive 
                        ? 'bg-white border-[#DEAE4D]' 
                        : 'border-transparent hover:bg-[#F5F2EC]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 text-sm font-medium ${isActive ? 'text-[#DEAE4D]' : 'text-[#8C8A86]'}`}>
                        {chapter.time}
                      </div>
                      <div>
                        <div className={`font-medium ${isActive ? 'text-[#2C2A26]' : 'text-[#5C5A56]'}`}>
                          {(index + 1).toString().padStart(2, '0')} · {chapter.title}
                        </div>
                        {isActive && (
                          <div className="text-sm text-[#8C8A86] mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            {chapter.desc}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
