import React, { useState, useCallback, useRef } from 'react';

interface FooterProps {
  onOpenAdmin: () => void;
}

// Componente de botão otimizado para touch
const TouchButton: React.FC<{
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className = '', children }) => {
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
    >
      {children}
    </button>
  );
};

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              GP
            </div>
            <span className="text-sm font-semibold text-gray-900">Guia da Promoção</span>
          </div>

          <div className="flex gap-1 flex-wrap justify-center">
            <TouchButton className="text-sm text-gray-500 hover:text-brand-600 px-4 py-3 rounded-lg min-h-[44px]">
              <span>Termos de Uso</span>
            </TouchButton>
            <TouchButton className="text-sm text-gray-500 hover:text-brand-600 px-4 py-3 rounded-lg min-h-[44px]">
              <span>Privacidade</span>
            </TouchButton>
            <TouchButton 
              onClick={onOpenAdmin} 
              className="text-sm text-gray-500 hover:text-brand-600 px-4 py-3 rounded-lg min-h-[44px]"
            >
              <span>Acesso Gestor</span>
            </TouchButton>
          </div>

          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} Guia da Promoção.
          </div>
        </div>
      </div>
    </footer>
  );
};
