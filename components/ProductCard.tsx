import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, UserProfile } from '../types';
import { incrementClick, socialService, productService } from '../services/database';

interface ProductCardProps {
  product: Product;
  currentUser: UserProfile | null;
  onAuthRequired: () => void;
  onEdit?: (product: Product) => void;
  isAdmin?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, currentUser, onAuthRequired, onEdit, isAdmin }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(product.likes?.length || 0);
  const [showOptions, setShowOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const localLikes = JSON.parse(localStorage.getItem('likedProducts') || '[]');
    setIsLiked(localLikes.includes(product.id));
    setLikesCount(product.likes?.length || 0);
  }, [product.id, product.likes]);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions]);

  // Curtir sem necessidade de login
  const handleLike = useCallback(() => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

    const localLikes = JSON.parse(localStorage.getItem('likedProducts') || '[]');
    if (newIsLiked) {
      localLikes.push(product.id);
    } else {
      const index = localLikes.indexOf(product.id);
      if (index > -1) localLikes.splice(index, 1);
    }
    localStorage.setItem('likedProducts', JSON.stringify(localLikes));

    if (currentUser) {
      socialService.toggleLike(product.id, currentUser.uid, !newIsLiked).catch(console.error);
    }
  }, [isLiked, currentUser, product.id]);

  const handleShare = useCallback(() => {
    const siteLink = "https://loja-de-ofertas.vercel.app/";
    const shareMessage = `🔥 Olha essa oferta: ${product.title}\n\n${product.estimatedPrice || 'Preço especial'}\n\n${product.url}\n\nMais ofertas em: ${siteLink}`;
    
    if (navigator.share) {
      navigator.share({ 
        title: product.title, 
        text: shareMessage,
        url: product.url 
      }).catch(console.debug);
    } else {
      navigator.clipboard.writeText(shareMessage);
      alert("✓ Link copiado!");
    }
  }, [product.title, product.url, product.estimatedPrice]);

  const handlePromoClick = useCallback(() => {
    incrementClick(product.id).catch(console.debug);
  }, [product.id]);

  const handleDelete = useCallback(async () => {
    if (window.confirm("Excluir esta oferta permanentemente?")) {
      try {
        await productService.delete(product.id);
        setShowOptions(false);
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  }, [product.id]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.authorName || 'User')}&background=random&color=fff`;
    setImageLoaded(true);
  }, [product.authorName]);

  const canEdit = currentUser && product.authorId === currentUser.uid;
  const canDelete = isAdmin || canEdit;

  return (
    <div className="bg-white border-b sm:border sm:rounded-xl border-gray-200 overflow-hidden flex flex-col shadow-sm h-fit relative card">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-brand-700 p-0.5">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
               <img 
                 src={product.authorPhoto || "/favicon.ico"} 
                 className="w-full h-full object-cover" 
                 alt=""
                 referrerPolicy="no-referrer"
                 onError={handleImageError}
               />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 leading-none">
              {product.authorName || 'Guia da Promoção'}
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-tighter">{product.category}</span>
          </div>
        </div>
        
        {/* Menu de Opções - Apenas para autor/admin */}
        {(canEdit || canDelete) && (
          <div className="relative" ref={optionsRef}>
            <button
              type="button"
              onClick={() => setShowOptions(prev => !prev)}
              className="icon-btn text-gray-400 p-3 hover:bg-gray-100 rounded-full flex items-center justify-center"
              aria-label="Opções"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
            
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { onEdit?.(product); setShowOptions(false); }}
                    className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    <span>Editar Oferta</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    <span>Excluir Oferta</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Imagem Principal - Clicável para abrir link de afiliado */}
      <a 
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handlePromoClick}
        className="press-btn aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden border-y border-gray-50 sm:border-none cursor-pointer block"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"></div>
        )}
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.title} 
          className={`w-full h-full object-contain ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        {product.estimatedPrice && (
          <div className="absolute bottom-3 left-3 bg-brand-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            {product.estimatedPrice}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-full text-[10px] font-bold shadow-md z-10 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          <span>Ver</span>
        </div>
      </a>

      {/* Barra de Ações - Curtir, Compartilhar e Ver Promoção */}
      <div className="flex items-center justify-between px-3 py-3 gap-2">
        <div className="flex items-center gap-2">
          {/* Botão Curtir */}
          <button
            type="button"
            onClick={handleLike}
            className={`icon-btn ${isLiked ? 'text-red-500' : 'text-gray-700'} p-3 rounded-full flex items-center justify-center active:scale-90`}
            aria-label={isLiked ? "Descurtir" : "Curtir"}
          >
            <svg 
              className={`w-7 h-7 ${isLiked ? 'scale-110' : ''}`} 
              fill={isLiked ? "currentColor" : "none"} 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          
          {/* Botão Compartilhar */}
          <button
            type="button"
            onClick={handleShare}
            className="icon-btn text-gray-700 p-3 rounded-full flex items-center justify-center active:scale-90"
            aria-label="Compartilhar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        
        {/* Botão Ver Oferta */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handlePromoClick}
          className="press-btn flex-shrink-0 bg-brand-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-brand-700 flex items-center justify-center gap-1.5 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>Ver Oferta</span>
        </a>
      </div>

      {/* Título e Descrição */}
      <div className="px-3 pb-3">
        {likesCount > 0 && (
          <p className="text-xs font-bold text-gray-900 mb-2">
            {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
          </p>
        )}
        <h3 className="text-sm font-bold text-gray-900 mb-1 leading-tight">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
};
