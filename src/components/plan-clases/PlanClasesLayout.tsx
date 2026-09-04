import { Outlet } from 'react-router-dom';
import PlanClasesSidebar from './sidebar/PlanClasesSidebar';

export default function PlanClasesLayout() {
  return (
    <div className="flex h-screen bg-white font-body" style={{ fontFamily: 'Manrope, Inter, system-ui' }}>
      <PlanClasesSidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 h-full overflow-y-auto bg-white relative min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
