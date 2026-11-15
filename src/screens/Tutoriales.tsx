import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CentroTutorialesView, type TutorialItem } from '../components/tutorials/CentroTutorialesModal';
import { startGuide } from '../guides/driverGuides';

export default function Tutoriales() {
  const navigate = useNavigate();

  const handleSelectTutorial = (item: TutorialItem) => {
    navigate('/inicio');
    setTimeout(() => {
      startGuide(item.guideId);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Barra superior de retorno */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-(--border-soft) text-xs font-bold text-(--ink-soft) hover:text-(--ink) hover:bg-(--linen)/40 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Volver</span>
          </button>
        </div>

        {/* Vista principal estilo Padlet */}
        <CentroTutorialesView
          onSelectTutorial={handleSelectTutorial}
          isModal={false}
        />
      </div>
    </div>
  );
}

