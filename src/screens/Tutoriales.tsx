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
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Barra superior de retorno minimalista */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:text-black hover:border-black transition-all cursor-pointer shadow-none"
          >
            <ArrowLeft size={14} />
            <span>Volver</span>
          </button>
        </div>

        {/* Vista principal minimalista monocromática */}
        <CentroTutorialesView
          onSelectTutorial={handleSelectTutorial}
          isModal={false}
        />
      </div>
    </div>
  );
}
