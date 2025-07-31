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
    <div className="relative w-full h-[calc(100vh-200px)] overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-500 opacity-90"></div> 
      
      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        
        {/* CENTRAL DAO */}
        <div className="mb-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-wider">
            <span className="inline-block">
              C
              <span className="inline-block transform -translate-y-1">
                <span className="block h-1 w-4 bg-white mb-1"></span>
                <span className="block h-1 w-4 bg-white mb-1"></span>
                <span className="block h-1 w-4 bg-white"></span>
              </span>
              NTRAL
            </span>
            <span className="ml-4">DAO</span>
          </h1>
          
          {/* Globe Icon */}
          <div className="inline-block ml-4 relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-600 border-2 border-white/30 relative">
              {/* Grid lines */}
              <div className="absolute inset-1 border border-white/20 rounded-full"></div>
              <div className="absolute inset-2 border border-white/10 rounded-full"></div>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 transform -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 transform -translate-x-1/2"></div>
            </div>
          </div>
        </div>

        {/* PRESENTS */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-medium text-white uppercase tracking-wider">
            PRESENTS
          </h2>
        </div>

        {/* QUIZ TRIVIA - 3D Effect */}
        <div className="relative">
          <h3 className="text-5xl md:text-7xl font-black text-yellow-400 uppercase tracking-wider relative">
            {/* Multiple layers for 3D effect */}
            <span className="absolute inset-0 transform translate-x-1 translate-y-1 text-yellow-600 opacity-60">QUIZ TRIVIA</span>
            <span className="absolute inset-0 transform translate-x-0.5 translate-y-0.5 text-yellow-500 opacity-80">QUIZ TRIVIA</span>
            <span className="relative z-10">QUIZ TRIVIA</span>
          </h3>
        </div>

        {/* Additional styling for depth */}
        <div className="mt-8">
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto rounded-full opacity-60"></div>
        </div>
      </div>
    </div>
  );
} 