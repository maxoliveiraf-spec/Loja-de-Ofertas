import React, { useState, useEffect, useRef } from 'react';
import { Product, UserProfile, Comment } from '../types';
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
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setIsLiked(product.likes?.includes(currentUser.uid) || false);
      setIsSaved(currentUser.savedProducts?.includes(product.id) || false);
    }
  }, [currentUser, product.likes]);

  useEffect(() => {
    if (showComments) {
      return socialService.subscribeComments(product.id, setComments);
    }
  }, [showComments, product.id]);

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

  const handleLike = async () => {
    if (!currentUser) return onAuthRequired();
    setIsLiked(!isLiked);
    await socialService.toggleLike(product.id, currentUser.uid, isLiked);
  };

  const handleSave = async () => {
    if (!currentUser) return onAuthRequired();
    setIsSaved(!isSaved);
    await socialService.toggleSave(currentUser.uid, product.id, isSaved);
  };

  const handleShare = async () => {
    const siteLink = "https://loja-de-ofertas.vercel.app/";
    const shareMessage = `🔥 Olha essa oferta: ${product.title}\n${product.url}\n\n\nMais informações\n${siteLink}`;
    
    const shareData = {
      title: product.title,
      text: shareMessage
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.debug("Share cancelled or failed", err);
      }
    } else {
      await navigator.clipboard.writeText(shareMessage);
      alert("Copiado: Link da oferta e informações da loja!");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return onAuthRequired();
    if (!newComment.trim()) return;

    await socialService.addComment(product.id, {
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      text: newComment,
      timestamp: Date.now()
    });
    setNewComment('');
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza que deseja excluir esta oferta permanentemente?")) {
      try {
        await productService.delete(product.id);
        setShowOptions(false);
      } catch (e) {
        alert("Erro ao excluir produto.");
      }
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.authorName || 'User')}&background=random&color=fff`;
  };

  const canEdit = currentUser && product.authorId === currentUser.uid;
  const canDelete = isAdmin || (currentUser && product.authorId === currentUser.uid);

  return (
    <div className="bg-white border-b sm:border sm:rounded-xl border-gray-200 overflow-hidden flex flex-col shadow-sm transition-shadow hover:shadow-md h-fit relative">
      {/* Header do Post */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-brand-700 p-0.5">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
               <img 
                 src={product.authorPhoto || "/favicon.ico"} 
                 className="w-full h-full object-cover" 
                 alt={product.authorName}
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
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
          
          {showOptions && (canEdit || canDelete) && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
              {canEdit && (
                <button 
                  onClick={() => { onEdit?.(product); setShowOptions(false); }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  Editar Oferta
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Excluir Oferta
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Imagem Principal */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative group overflow-hidden border-y border-gray-50 sm:border-none">
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
          alt={product.title} 
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {product.estimatedPrice && (
          <div className="absolute bottom-3 left-3 bg-brand-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            {product.estimatedPrice}
          </div>
        )}
      </div>

      {/* Barra de Ações */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className={`${isLiked ? 'text-red-500 scale-110' : 'text-gray-700'} transition-all active:scale-125`}>
            <svg className="w-7 h-7" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="text-gray-700">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785 0 00.19.23c.957.045 1.9-.314 2.556-1.003.3-.315.68-.512 1.08-.512h.239c.39 0 .77.054 1.14.155z" />
            </svg>
          </button>
          <button onClick={handleShare} className="text-gray-700">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <button onClick={handleSave} className={`${isSaved ? 'text-brand-600' : 'text-gray-700'}`}>
          <svg className="w-7 h-7" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>
      </div>

      {/* Legenda e Comentários */}
      <div className="px-3 pb-3 flex flex-col h-auto">
        <p className="text-xs font-bold text-gray-900 mb-1">{product.likes?.length || 0} curtidas</p>
        <div className="text-xs text-gray-900 leading-snug">
          <span className="font-bold mr-1">{product.authorName || 'Guia da Promoção'}</span>
          <span className="font-semibold">{product.title}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        
        {product.commentsCount ? (
          <button onClick={() => setShowComments(true)} className="text-[11px] text-gray-400 mt-2 text-left">
            Ver todos os {product.commentsCount} comentários
          </button>
        ) : null}

        {/* Botão Ver Promoção */}
        <div className="pt-3">
           <a 
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => incrementClick(product.id)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-bold py-2 rounded flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            Ver a Promoção
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
      </div>

      {/* Gaveta de Comentários */}
      {showComments && (
        <div className="bg-gray-50 p-3 border-t border-gray-100 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
             <span className="text-[10px] font-bold text-gray-400 uppercase">Comentários</span>
             <button onClick={() => setShowComments(false)} className="text-gray-400">✕</button>
          </div>
          <div className="space-y-3 mb-3">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2 items-start">
                <img 
                  src={c.userPhoto} 
                  className="w-5 h-5 rounded-full object-cover" 
                  alt={c.userName} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.userName)}&background=random&color=fff`;
                  }}
                />
                <p className="text-[11px] text-gray-800"><span className="font-bold mr-1">{c.userName}</span>{c.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Adicione um comentário..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button disabled={!newComment.trim()} className="text-brand-600 font-bold text-[11px] uppercase disabled:opacity-30">Postar</button>
          </form>
        </div>
      )}
    </div>
  );
};