import React from 'react';

interface HeaderProps {
  onOpenAdmin: () => void;
  onOpenAnalytics: () => void;
  totalProducts: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAdmin, onOpenAnalytics, totalProducts, searchQuery, onSearchChange }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Changed from flex-col to flex-row to keep items in one line on mobile */}
        <div className="flex flex-row justify-between items-center h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            
            {/* Title & Subtitle - Hidden on Mobile */}
            <div className="hidden sm:flex flex-col justify-center">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none tracking-tight">
                Guia da Promoção
              </h1>
              <span className="text-[10px] sm:text-xs text-brand-600 font-bold tracking-widest uppercase mt-0.5">
                Loja de Ofertas
              </span>
            </div>
          </div>

          {/* Search Bar Section - Expands to fill space */}
          <div className="flex-1 w-full max-w-2xl px-1 sm:px-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-xs sm:text-sm transition-shadow shadow-sm"
                placeholder="Buscar..."
              />
            </div>
          </div>
          
          {/* Actions Section */}
          <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
            <span className="text-xs text-gray-500 font-medium hidden lg:block bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
              {totalProducts} ofertas
            </span>
            
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 border border-transparent sm:border-gray-200 text-sm font-medium rounded-full sm:rounded-lg shadow-sm text-gray-500 bg-white hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200"
              title="Estatísticas do Site"
            >
               <svg className="h-5 w-5 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
               </svg>
               <span className="hidden sm:inline">Análise</span>
            </button>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 border border-gray-200 text-sm font-medium rounded-full sm:rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 hover:text-brand-600 hover:border-brand-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 group"
              aria-label="Gestor"
            >
              {/* Gear Icon */}
              <svg className="h-5 w-5 sm:mr-2 text-gray-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543 .826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              
              {/* Text Label - Hidden on Mobile */}
              <span className="hidden sm:inline">Gestor</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};