import React from 'react';

interface FooterProps {
  onOpenAdmin: () => void;
}

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

          <div className="flex gap-6">
             <button className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
               Termos de Uso
             </button>
             <button className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
               Privacidade
             </button>
             <button onClick={onOpenAdmin} className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
               Acesso Gestor
             </button>
          </div>

          <div className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Guia da Promoção.
          </div>
        </div>
      </div>
    </footer>
  );
};