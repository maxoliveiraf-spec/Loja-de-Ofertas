
import React, { useState, useEffect, useRef } from 'react';
import { Product, UserProfile } from '../types';
import { productService } from '../services/database';

interface ProductCardProps {
  product: Product;
  currentUser: UserProfile | null;
  onAuthRequired: () => void;
  onEdit?: (product: Product) => void;
  onSelect?: (product: Product) => void;
  isAdmin?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, currentUser, onAuthRequired, onEdit, onSelect, isAdmin }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&background=random&color=fff`;
    setImageLoaded(true);
  };

  // Lógica de Permissão Atualizada: Gestor pode editar TUDO. Autores editam apenas os próprios.
  const canEdit = isAdmin || (currentUser && product.authorId === currentUser.uid);
  const canDelete = isAdmin || (currentUser && product.authorId === currentUser.uid);

  return (
    <div 
      className="bg-white sm:rounded-2xl border-gray-100 overflow-hidden flex flex-col h-full relative group cursor-pointer active:scale-[0.98] transition-all" 
      onClick={handleOpenDetail}
    >
      {/* Menu Administrativo - Contextual para Gestor ou Autor */}
      {(canEdit || canDelete) && (
        <div className="absolute right-2 top-2 z-30" ref={optionsRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className="bg-white/80 backdrop-blur-md text-gray-800 p-1.5 rounded-full shadow-lg active:scale-90 transition-all flex items-center justify-center min-w-[32px] min-h-[32px]"
          >
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          {showOptions && (
            <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-fadeIn z-50">
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit?.(product); setShowOptions(false); }} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50">Editar</button>
              )}
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir oferta permanentemente?")) productService.delete(product.id); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Excluir</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Imagem do Produto */}
      <div className="aspect-[4/5] bg-gray-50 flex items-center justify-center relative overflow-hidden sm:rounded-xl m-1">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse"></div>}
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.title} 
          className={`w-full h-full object-contain mix-blend-multiply p-2 transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        
        {product.estimatedPrice && (
          <div className="absolute bottom-2 left-2 bg-brand-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black shadow-lg z-10 tracking-tight">
            {product.estimatedPrice}
          </div>
        )}
      </div>

      {/* Info & CTA */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="min-h-[32px]">
          <h3 className="text-[12px] sm:text-[14px] font-bold text-gray-800 leading-tight line-clamp-2">
            {product.title}
          </h3>
        </div>
        
        {/* Botão visível apenas no Desktop (sm e acima) */}
        <div className="mt-auto hidden sm:block">
           <button 
            type="button"
            className="w-full h-10 bg-gray-900 text-white text-[10px] font-black px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition-all uppercase tracking-widest"
          >
            Ver Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};
