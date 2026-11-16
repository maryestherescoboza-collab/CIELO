import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CentroTutorialesView, type TutorialItem } from '../components/tutorials/CentroTutorialesModal';
import { startGuide } from '../guides/driverGuides';

export default function Tutoriales() {
  const navigate = useNavigate();

  const handleSelectTutorial = (item: TutorialItem, reset = false) => {
    navigate('/inicio');
    setTimeout(() => {
      if (reset && item.guideId === 'iniciacion') {
        startGuide('iniciacion', 0, undefined, true);
      } else {
        startGuide(item.guideId);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Barra superior de retorno minimalista */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-white border border-(--border-soft) text-xs font-semibold text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/30 transition-all cursor-pointer shadow-none"
          >
            <ArrowLeft size={14} />
            <span>Volver</span>
          </button>
        </div>

        {/* Vista principal con tarjetas de diseño idéntico a Guías */}
        <CentroTutorialesView
          onSelectTutorial={handleSelectTutorial}
          isModal={false}
        />
      </div>
    </div>
  );
}
