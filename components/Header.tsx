
import React from 'react';

interface HeaderProps {
  onOpenAdmin: () => void;
  onOpenAnalytics: () => void;
  totalProducts: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenAdmin, 
  onOpenAnalytics, 
  totalProducts, 
  searchQuery, 
  onSearchChange 
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-4">
          
          <div 
            className="flex items-center gap-2 flex-shrink-0 cursor-pointer active:scale-95 transition-transform duration-75" 
            onClick={() => window.scrollTo({top:0, behavior:'smooth'})}
          >
            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h1 className="hidden sm:block text-base font-black text-gray-900 tracking-tighter uppercase">Guia Pro</h1>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 px-10 text-xs font-medium focus:ring-2 focus:ring-gray-900 transition-all outline-none"
                placeholder={`O que você procura hoje? (${totalProducts} ofertas)`}
              />
              <svg className="absolute left-4 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
              onClick={onOpenAdmin} 
              className="bg-gray-900 text-white p-2 rounded-full active:scale-90 transition-all shadow-md flex items-center gap-1 sm:px-4 h-10 min-w-10"
              title="Postar Nova Oferta"
             >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Ofertar</span>
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};
