import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, UserProfile, Comment } from '../types';
import { incrementClick, socialService, productService } from '../services/database';

interface ProductCardProps {
  product: Product;
  currentUser: UserProfile | null;
  onAuthRequired: () => void;
  onEdit?: (product: Product) => void;
  isAdmin?: boolean;
}

// Componente de botão otimizado para touch
const TouchButton: React.FC<{
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}> = ({ onClick, className = '', disabled = false, children, ariaLabel }) => {
  const [pressed, setPressed] = useState(false);
  const firedRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setPressed(true);
    
    if (!firedRef.current) {
      firedRef.current = true;
      onClick();
      setTimeout(() => { firedRef.current = false; }, 100);
    }
  }, [onClick, disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    if (!firedRef.current) onClick();
  }, [onClick, disabled]);

  return (
    <button
      type="button"
      className={`fast-btn ${className} ${pressed ? 'pressed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPressed(false)}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, currentUser, onAuthRequired, onEdit, isAdmin }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const optionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setIsLiked(product.likes?.includes(currentUser.uid) || false);
      setIsSaved(currentUser.savedProducts?.includes(product.id) || false);
    }
  }, [currentUser, product.likes, product.id]);

  useEffect(() => {
    if (showComments) {
      return socialService.subscribeComments(product.id, setComments);
    }
  }, [showComments, product.id]);

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

  // Handlers otimizados
  const handleLike = useCallback(() => {
    if (!currentUser) return onAuthRequired();
    setIsLiked(prev => !prev);
    socialService.toggleLike(product.id, currentUser.uid, isLiked).catch(console.error);
  }, [currentUser, isLiked, onAuthRequired, product.id]);

  const handleSave = useCallback(() => {
    if (!currentUser) return onAuthRequired();
    setIsSaved(prev => !prev);
    socialService.toggleSave(currentUser.uid, product.id, isSaved).catch(console.error);
  }, [currentUser, isSaved, onAuthRequired, product.id]);

  const handleShare = useCallback(() => {
    const siteLink = "https://loja-de-ofertas.vercel.app/";
    const shareMessage = `🔥 Olha essa oferta: ${product.title}\n${product.url}\n\nMais informações\n${siteLink}`;
    
    if (navigator.share) {
      navigator.share({ title: product.title, text: shareMessage }).catch(console.debug);
    } else {
      navigator.clipboard.writeText(shareMessage);
      alert("Copiado: Link da oferta!");
    }
  }, [product.title, product.url]);

  const handlePromoClick = useCallback(() => {
    incrementClick(product.id).catch(console.debug);
  }, [product.id]);

  const handleAddComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return onAuthRequired();
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment(''); // Limpar imediatamente para feedback
    
    try {
      await socialService.addComment(product.id, {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL,
        text: commentText,
        timestamp: Date.now()
      });
    } catch (e) {
      setNewComment(commentText); // Restaurar se falhar
      console.error(e);
    }
  }, [currentUser, newComment, onAuthRequired, product.id]);

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
        
        {/* Menu de Opções */}
        <div className="relative" ref={optionsRef}>
          <TouchButton
            onClick={() => setShowOptions(prev => !prev)}
            className="icon-btn text-gray-400 p-3 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
            ariaLabel="Opções"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </TouchButton>
          
          {showOptions && (canEdit || canDelete) && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
              {canEdit && (
                <TouchButton
                  onClick={() => { onEdit?.(product); setShowOptions(false); }}
                  className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 min-h-[48px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  <span>Editar Oferta</span>
                </TouchButton>
              )}
              {canDelete && (
                <TouchButton
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 min-h-[48px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  <span>Excluir Oferta</span>
                </TouchButton>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Imagem Principal - Clicável para abrir link de afiliado */}
      <a 
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handlePromoClick}
        className="fast-btn aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden border-y border-gray-50 sm:border-none cursor-pointer block"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse pointer-events-none"></div>
        )}
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.title} 
          className={`w-full h-full object-contain pointer-events-none ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
        {product.estimatedPrice && (
          <div className="absolute bottom-3 left-3 bg-brand-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 pointer-events-none">
            {product.estimatedPrice}
          </div>
        )}
        {/* Indicador visual de que a imagem é clicável */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-full text-[10px] font-bold shadow-md z-10 pointer-events-none flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          <span>Ver</span>
        </div>
      </a>

      {/* Barra de Ações */}
      <div className="flex items-center justify-between px-1 pt-2 pb-1">
        <div className="flex items-center">
          <TouchButton
            onClick={handleLike}
            className={`icon-btn ${isLiked ? 'text-red-500' : 'text-gray-700'} p-3 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center`}
            ariaLabel={isLiked ? "Descurtir" : "Curtir"}
          >
            <svg className={`w-7 h-7 ${isLiked ? 'scale-110' : ''}`} fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </TouchButton>
          
          <TouchButton
            onClick={() => setShowComments(prev => !prev)}
            className="icon-btn text-gray-700 p-3 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center"
            ariaLabel="Comentários"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </TouchButton>
          
          <TouchButton
            onClick={handleShare}
            className="icon-btn text-gray-700 p-3 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center"
            ariaLabel="Compartilhar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </TouchButton>
        </div>
        
        <TouchButton
          onClick={handleSave}
          className={`icon-btn ${isSaved ? 'text-brand-600' : 'text-gray-700'} p-3 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center`}
          ariaLabel={isSaved ? "Remover dos salvos" : "Salvar"}
        >
          <svg className="w-7 h-7" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </TouchButton>
      </div>

      {/* Legenda */}
      <div className="px-3 pb-3 flex flex-col">
        <p className="text-xs font-bold text-gray-900 mb-1">{product.likes?.length || 0} curtidas</p>
        <div className="text-xs text-gray-900">
          <span className="font-bold mr-1">{product.authorName || 'Guia da Promoção'}</span>
          <span className="font-semibold">{product.title}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        
        {product.commentsCount ? (
          <TouchButton
            onClick={() => setShowComments(true)}
            className="text-[11px] text-gray-400 mt-2 text-left min-h-[40px] flex items-center"
          >
            <span>Ver todos os {product.commentsCount} comentários</span>
          </TouchButton>
        ) : null}

        {/* Botão Ver Promoção */}
        <div className="pt-3">
          <a 
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePromoClick}
            className="fast-btn w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-extrabold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm min-h-[52px]"
          >
            <span>Ver a Promoção</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
      </div>

      {/* Gaveta de Comentários */}
      {showComments && (
        <div className="bg-gray-50 p-4 border-t border-gray-100 max-h-80 overflow-y-auto animate-fadeIn smooth-scroll">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comentários</span>
            <TouchButton
              onClick={() => setShowComments(false)}
              className="icon-btn text-gray-400 p-2 hover:bg-gray-200 rounded-full min-h-[40px] min-w-[40px] flex items-center justify-center"
              ariaLabel="Fechar"
            >
              <span className="text-lg">✕</span>
            </TouchButton>
          </div>
          
          <div className="space-y-4 mb-4">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Seja o primeiro a comentar!</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 items-start">
                <img 
                  src={c.userPhoto} 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.userName)}&background=random&color=fff`;
                  }}
                />
                <p className="text-[12px] text-gray-800"><span className="font-bold mr-1">{c.userName}</span>{c.text}</p>
              </div>
            ))}
          </div>
          
          {/* Formulário de Comentário */}
          <form onSubmit={handleAddComment} className="flex gap-2 items-center sticky bottom-0 bg-gray-50 pt-2">
            <input 
              ref={inputRef}
              type="text" 
              inputMode="text"
              autoComplete="off"
              autoCorrect="on"
              enterKeyHint="send"
              placeholder="Adicione um comentário..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand-500 min-h-[48px]"
              style={{ fontSize: '16px' }}
            />
            <TouchButton
              onClick={() => {
                if (newComment.trim() && currentUser) {
                  handleAddComment({ preventDefault: () => {} } as React.FormEvent);
                } else if (!currentUser) {
                  onAuthRequired();
                }
              }}
              disabled={!newComment.trim()}
              className="bg-brand-600 text-white px-4 py-3 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center disabled:opacity-30 disabled:bg-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </TouchButton>
          </form>
        </div>
      )}
    </div>
  );
};
