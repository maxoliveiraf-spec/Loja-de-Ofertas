import React from 'react';

interface HeaderProps {
  onOpenAdmin: () => void;
  onOpenAnalytics: () => void;
  totalProducts: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAdmin, onOpenAnalytics, searchQuery, onSearchChange }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-brand-500/20 shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h1 className="hidden sm:block text-lg font-black text-gray-900 tracking-tight">GUIA PROMO</h1>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-full py-2 px-4 text-sm focus:ring-2 focus:ring-brand-500 transition-shadow"
                placeholder="Pesquisar ofertas..."
              />
            </div>
          </div>
          
          {/* Menu */}
          <div className="flex items-center gap-3">
             <button 
              onClick={onOpenAdmin} 
              className="bg-brand-600 text-white p-2 rounded-full hover:bg-brand-700 transition-all shadow-md flex items-center gap-1 sm:px-3"
              title="Postar Nova Oferta"
             >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline text-xs font-bold uppercase">Postar</span>
             </button>
             <button onClick={onOpenAnalytics} className="hidden sm:block text-gray-600 hover:text-brand-600 p-2 rounded-full hover:bg-gray-100 transition-all">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};