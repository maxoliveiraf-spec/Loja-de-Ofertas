
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
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&background=f1f5f9&color=334155`;
    setImageLoaded(true);
  };

  const canEdit = isAdmin || (currentUser && product.authorId === currentUser.uid);
  const canDelete = isAdmin || (currentUser && product.authorId === currentUser.uid);

  return (
    <div 
      className="bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col h-full relative group cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md" 
      onClick={handleOpenDetail}
    >
      {(canEdit || canDelete) && (
        <div className="absolute right-3 top-3 z-30" ref={optionsRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
            className="bg-white/90 backdrop-blur-md text-gray-800 w-8 h-8 rounded-full shadow-md active:scale-90 transition-all flex items-center justify-center border border-gray-100"
          >
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          {showOptions && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-fadeIn z-50">
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit?.(product); setShowOptions(false); }} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase text-gray-700 hover:bg-gray-50 border-b border-gray-50">Editar</button>
              )}
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir?")) productService.delete(product.id); }} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase text-red-600 hover:bg-red-50">Excluir</button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="aspect-square bg-white flex items-center justify-center relative overflow-hidden p-4">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-50 animate-pulse"></div>}
        <img 
          src={product.imageUrl} 
          alt={product.title} 
          className={`w-full h-full object-contain transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
      </div>

      <div className="p-4 flex flex-col flex-1 bg-white">
        <h3 className="text-[11px] font-bold text-gray-900 leading-snug line-clamp-2 uppercase h-8 mb-3">
          {product.title}
        </h3>
        
        <div className="mt-auto">
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Melhor Preço</div>
          <div className="text-sm font-black text-success-500">
            {product.estimatedPrice}
          </div>
          
          <div className="mt-3 block sm:hidden text-[9px] font-black text-brand-600 uppercase tracking-widest">
            Análise do Preço →
          </div>
          
          <button 
            type="button"
            className="hidden sm:flex mt-3 w-full h-9 bg-gray-50 border border-gray-100 text-gray-900 text-[9px] font-black px-4 rounded-xl items-center justify-center gap-2 hover:bg-gray-900 hover:text-white active:scale-95 transition-all uppercase tracking-widest"
          >
            Comparar Preços
          </button>
        </div>
      </div>
    </div>
  );
};
