import React, { useState, useCallback, useRef } from 'react';

interface HeaderProps {
  onOpenAdmin: () => void;
  onOpenAnalytics: () => void;
  totalProducts: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Componente de botão otimizado para touch
const TouchButton: React.FC<{
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}> = ({ onClick, className = '', children, title }) => {
  const [pressed, setPressed] = useState(false);
  const firedRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setPressed(true);
    
    if (!firedRef.current) {
      firedRef.current = true;
      onClick();
      setTimeout(() => { firedRef.current = false; }, 100);
    }
  }, [onClick]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firedRef.current) onClick();
  }, [onClick]);

  return (
    <button
      type="button"
      className={`fast-btn ${className} ${pressed ? 'pressed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPressed(false)}
      onClick={handleClick}
      title={title}
    >
      {children}
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({ onOpenAdmin, onOpenAnalytics, searchQuery, onSearchChange }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Logo */}
          <TouchButton 
            className="flex items-center gap-2 flex-shrink-0 p-1 -ml-1 rounded-lg" 
            onClick={() => window.scrollTo({top:0, behavior:'smooth'})}
          >
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-brand-500/20 shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <h1 className="hidden sm:block text-lg font-black text-gray-900 tracking-tight">GUIA PROMO</h1>
          </TouchButton>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-full py-2 px-4 text-base focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Pesquisar ofertas..."
              style={{ fontSize: '16px' }}
            />
          </div>
          
          {/* Menu */}
          <div className="flex items-center gap-2">
          <TouchButton 
            onClick={onOpenAdmin} 
            className="icon-btn bg-brand-600 text-white p-3 rounded-full hover:bg-brand-700 shadow-md flex items-center justify-center gap-1 sm:px-4 min-h-[44px] min-w-[44px]"
            title="Postar Nova Oferta"
          >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline text-xs font-bold uppercase">Postar</span>
            </TouchButton>
            
            <TouchButton 
              onClick={onOpenAnalytics} 
              className="icon-btn hidden sm:flex text-gray-600 hover:text-brand-600 p-3 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </TouchButton>
          </div>
        </div>
      </div>
    </header>
  );
};
