import { Outlet } from 'react-router-dom';
import PlanClasesSidebar from './sidebar/PlanClasesSidebar';

export default function PlanClasesLayout() {
  return (
    <div
      className="grid grid-cols-[clamp(13.5rem,16vw,17.5rem)_minmax(0,1fr)] h-screen w-full bg-white font-body overflow-hidden"
      style={{ fontFamily: '"Inter", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <PlanClasesSidebar />

      {/* MAIN CONTENT AREA */}
      <div className="h-full overflow-y-auto bg-white relative min-w-0 w-full">
        <Outlet />
      </div>
    </div>
  );
}
