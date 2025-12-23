import React, { useState, useEffect, useRef } from 'react';
import { Product, UserProfile } from '../types';
import { incrementClick, socialService, productService } from '../services/database';

interface ProductCardProps {
  product: Product;
  currentUser: UserProfile | null;
  onAuthRequired: () => void;
  onEdit?: (product: Product) => void;
  isAdmin?: boolean;
}

// Função auxiliar para gerenciar ID de visitante anônimo
const getVisitorId = () => {
  let vid = localStorage.getItem('visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visitor_id', vid);
  }
  return vid;
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, currentUser, onAuthRequired, onEdit, isAdmin }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = currentUser?.uid || getVisitorId();
    setIsLiked(product.likes?.includes(userId) || false);
  }, [currentUser, product.likes]);

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

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Agora permite curtir sem estar logado usando o Visitor ID
    const userId = currentUser?.uid || getVisitorId();
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    
    socialService.toggleLike(product.id, userId, isLiked).catch(console.error);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const siteLink = window.location.origin;
    const shareMessage = `🔥 Olha essa oferta: ${product.title}\n${product.url}\n\nConfira mais ofertas em: ${siteLink}`;
    
    if (navigator.share) {
      navigator.share({ title: product.title, text: shareMessage }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareMessage);
      alert("Copiado: Link da oferta e informações da loja!");
    }
  };

  const handlePromoClick = () => {
    incrementClick(product.id).catch(console.debug);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&background=random&color=fff`;
    setImageLoaded(true);
  };

  const canEdit = currentUser && product.authorId === currentUser.uid;
  const canDelete = isAdmin || (currentUser && product.authorId === currentUser.uid);

  return (
    <div className="bg-white border-b sm:border sm:rounded-xl border-gray-100 overflow-hidden flex flex-col h-fit relative mb-2 sm:mb-0">
      {/* Menu Administrativo */}
      {(canEdit || canDelete) && (
        <div className="absolute right-3 top-3 z-30" ref={optionsRef}>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="bg-white/90 backdrop-blur-sm text-gray-800 p-2 rounded-full shadow-lg active:scale-90 transition-all"
          >
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          {showOptions && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-fadeIn z-50">
              {canEdit && (
                <button onClick={() => { onEdit?.(product); setShowOptions(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50">Editar</button>
              )}
              {canDelete && (
                <button onClick={() => { if(window.confirm("Excluir oferta?")) productService.delete(product.id); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">Excluir</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Imagem do Produto (Link de Afiliado) */}
      <a 
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handlePromoClick}
        className="aspect-square bg-white flex items-center justify-center relative overflow-hidden group"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-50 animate-pulse"></div>
        )}
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.title} 
          className={`w-full h-full object-contain transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        
        {/* Badge de Preço */}
        {product.estimatedPrice && (
          <div className="absolute bottom-4 left-4 bg-[#0091FF] text-white px-4 py-1.5 rounded-lg text-sm font-black shadow-xl z-10 tracking-tight">
            {product.estimatedPrice}
          </div>
        )}

        {/* Indicador de Click */}
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
           Ver Oferta <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </div>
      </a>

      {/* Ações Sociais e Botão Principal */}
      <div className="flex items-center justify-between px-4 py-3 sm:py-4">
        <div className="flex items-center gap-5 sm:gap-6">
          <button 
            onClick={handleLike} 
            className={`${isLiked ? 'text-red-500' : 'text-gray-900'} active:scale-150 transition-all duration-200 transform`}
            title="Curtir"
          >
            <svg className="w-8 h-8 sm:w-9 sm:h-9" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          <button 
            onClick={handleShare} 
            className="text-gray-900 active:scale-125 transition-all"
            title="Compartilhar"
          >
            <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        
        <a 
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handlePromoClick}
          className="bg-[#0284c7] text-white text-[13px] sm:text-sm font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 shadow-lg hover:bg-[#0369a1] active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Ver Oferta
        </a>
      </div>

      {/* Informações do Produto */}
      <div className="px-4 pb-5 flex flex-col gap-1">
        <p className="text-[13px] font-black text-gray-900 mb-0.5">
          {product.likes?.length || 0} {product.likes?.length === 1 ? 'curtida' : 'curtidas'}
        </p>
        <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
          {product.title}
        </h3>
        <p className="text-[13px] text-gray-500 line-clamp-2 leading-snug mt-1">
          {product.description}
        </p>
      </div>
    </div>
  );
};