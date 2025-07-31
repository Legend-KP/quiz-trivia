"use client";

/**
 * HomeTab component displays the Quiz Trivia poster design.
 * 
 * This replicates the vibrant gradient poster with "CENTRAL DAO PRESENTS QUIZ TRIVIA"
 * and includes the stylized globe icon and 3D text effects.
 * 
 * @example
 * ```tsx
 * <HomeTab />
 * ```
 */
export function HomeTab() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Gradient Background - Full Frame */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-500"></div>
      
      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        
        {/* CENTRAL DAO Logo */}
        <div className="mb-6">
          <img 
            src="/founder/CentralDAO.png" 
            alt="CENTRAL DAO" 
            className="w-64 h-auto max-w-full"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            }}
          />
        </div>

        {/* PRESENTS - New Font */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-light text-white uppercase tracking-widest" style={{
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '0.2em'
          }}>
            PRESENTS
          </h2>
        </div>

        {/* QUIZ TRIVIA - New Font and Enhanced 3D Effect */}
        <div className="relative">
          <h3 className="text-5xl md:text-7xl font-black text-yellow-400 uppercase tracking-wider relative" style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            textShadow: '2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6)'
          }}>
            {/* Multiple layers for enhanced 3D effect */}
            <span className="absolute inset-0 transform translate-x-2 translate-y-2 text-yellow-600 opacity-40">QUIZ TRIVIA</span>
            <span className="absolute inset-0 transform translate-x-1 translate-y-1 text-yellow-500 opacity-70">QUIZ TRIVIA</span>
            <span className="relative z-10 drop-shadow-lg">QUIZ TRIVIA</span>
          </h3>
        </div>

        {/* Enhanced depth styling */}
        <div className="mt-8">
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
} 