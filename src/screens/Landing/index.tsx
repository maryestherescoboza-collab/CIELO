import { LandingNavbar } from './components/LandingNavbar';
import { LandingFooter } from './components/LandingFooter';
import { LandingHero } from './components/LandingHero';
import { InteractiveDemo } from './components/InteractiveDemo';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingPricing } from './components/LandingPricing';
import { LandingCTA } from './components/LandingCTA';
import { useEffect } from 'react';
import { ReactLenis } from 'lenis/react';

export default function Landing() {
  // Configuración inicial o scroll to top si es necesario
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ReactLenis root>
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans selection:bg-primary selection:text-white">
        <LandingNavbar />
        
        <main className="flex-1">
          <LandingHero />
          <InteractiveDemo />
          <LandingFeatures />
          <LandingPricing />
          <LandingCTA />
        </main>

        <LandingFooter />
      </div>
    </ReactLenis>
  );
}
