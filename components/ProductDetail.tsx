
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, UserProfile, Comment } from '../types';
import { incrementClick, interestService, commentService, productService } from '../services/database';
import { generateMarketingPitch } from '../services/geminiService';

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  currentUser: UserProfile | null;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product, relatedProducts, onBack, onSelectProduct, currentUser }) => {
  const [email, setEmail] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [pitch, setPitch] = useState<string>(product.marketingPitch || '');
  const [loadingPitch, setLoadingPitch] = useState(!product.marketingPitch);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [visibleDiscoverItems, setVisibleDiscoverItems] = useState(6);
  const infiniteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchPitch = async () => {
      if (product.marketingPitch) {
        setPitch(product.marketingPitch);
        setLoadingPitch(false);
        return;
      }

      setLoadingPitch(true);
      try {
        const text = await generateMarketingPitch(product.title, product.description);
        setPitch(text);
        try {
          await productService.update(product.id, { marketingPitch: text });
        } catch (dbError) {}
      } catch (error) {
        setPitch("Esta é uma oferta incrível selecionada por nossa curadoria!");
      } finally {
        setLoadingPitch(false);
      }
    };
    
    fetchPitch();

    const unsubscribeComments = commentService.subscribe(product.id, (fetched) => {
      setComments(fetched);
    });

    return () => {
      unsubscribeComments();
    };
  }, [product.id, product.marketingPitch, product.title, product.description]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleDiscoverItems < relatedProducts.length) {
          setVisibleDiscoverItems(prev => prev + 6);
        }
      },
      { threshold: 0.1 }
    );
    if (infiniteRef.current) observer.observe(infiniteRef.current);
    return () => observer.disconnect();
  }, [relatedProducts.length, visibleDiscoverItems]);

  const handleBuy = () => {
    incrementClick(product.id);
    window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  const handleInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    try {
      // Salva no Firestore para o Admin ver no Dashboard
      await interestService.saveEmail(email, product.id, product.title);
      setIsSaved(true);
      // Não limpamos o e-mail agora para permitir o fallback mailto se ele quiser
    } catch (err) {
      alert("Erro ao salvar interesse.");
    }
  };

  const handleManualEmailSend = () => {
    const subject = encodeURIComponent(`🔥 Oferta: ${product.title}`);
    const body = encodeURIComponent(`Olá! Salvei esta oferta para ver depois:\n\nProduto: ${product.title}\nPreço: ${product.estimatedPrice}\nLink: ${window.location.href}\n\nEnviado via Guia da Promoção.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await commentService.add(product.id, {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL,
        text: newComment.trim(),
        timestamp: Date.now()
      });
      setNewComment('');
    } catch (err) {
      alert("Erro ao comentar.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    const shareData = {
      title: product.title,
      text: `🔥 Oferta Imperdível: ${product.title}!`,
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado!");
    }
  };

  const formatCommentDate = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-white pb-24 animate-fadeIn">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-900 active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Detalhes da Oferta</span>
        <button onClick={handleShare} className="p-2 -mr-2 text-brand-600 active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        
        {/* Card Principal */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 aspect-square bg-white p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-50">
            <img src={product.imageUrl} alt={product.title} className="max-w-full max-h-full object-contain" />
          </div>
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
             <div className="mb-6">
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">{product.category}</span>
                <h1 className="text-2xl font-black text-gray-900 mt-3 leading-tight tracking-tight uppercase">{product.title}</h1>
             </div>
             <div className="mb-8">
                <div className="text-3xl font-black text-gray-900">{product.estimatedPrice}</div>
                <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Oferta por tempo limitado</p>
             </div>
             <button 
              onClick={handleBuy}
              className="w-full bg-[#0284c7] text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Quero Comprar
             </button>
          </div>
        </div>

        {/* Pitch IA */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Análise do Curador</h3>
           <div className="bg-white border-l-4 border-brand-500 p-6 sm:p-10 rounded-3xl shadow-sm italic text-gray-700 leading-relaxed font-medium">
              {loadingPitch ? (
                <div className="flex gap-2 items-center">
                   <div className="w-2 h-2 bg-brand-200 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-brand-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-2 h-2 bg-brand-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">IA analisando...</span>
                </div>
              ) : (
                <p>"{pitch}"</p>
              )}
           </div>
        </div>

        {/* Captura de Interesse / E-mail */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Salvar esta oferta</h3>
           <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 sm:p-10 rounded-[2.5rem] shadow-xl text-white">
              {!isSaved ? (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h4 className="text-lg font-black uppercase tracking-tight">Enviar para meu E-mail</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-6 font-medium leading-relaxed">
                    Deixe seu e-mail para registrar interesse. Enviaremos a oferta para você assim que o sistema automático processar.
                  </p>
                  <form onSubmit={handleInterest} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      required
                      type="email"
                      placeholder="Seu melhor e-mail..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-white/10 border-2 border-white/5 p-4 rounded-2xl text-sm focus:border-brand-500 outline-none transition-all text-white placeholder:text-gray-500"
                    />
                    <button 
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-500 text-white font-black px-8 py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                    >
                      Registrar Interesse
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-4 animate-fadeIn">
                  <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-xl font-black mb-2 uppercase tracking-tight">Interesse Registrado!</h4>
                  <p className="text-sm text-gray-400 font-medium mb-6">Seu e-mail foi salvo em nossa lista. Se quiser receber agora mesmo, use o botão abaixo:</p>
                  <button 
                    onClick={handleManualEmailSend}
                    className="bg-white text-gray-900 font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 mx-auto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Abrir no meu Aplicativo de E-mail
                  </button>
                </div>
              )}
           </div>
        </div>

        {/* Detalhes Técnicos */}
        <div className="space-y-4 pt-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Mais informações</h3>
           <div className="bg-gray-50 p-6 sm:p-10 rounded-3xl text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
           </div>
        </div>

        {/* Comentários */}
        <div className="pt-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Comentários ({comments.length})</h3>
          </div>

          <div className="bg-gray-50 rounded-[2rem] p-6 sm:p-8 space-y-8">
            {currentUser ? (
              <form onSubmit={handlePostComment} className="flex flex-col gap-4">
                <div className="flex gap-4 items-start">
                  <img src={currentUser.photoURL} alt="" className="w-10 h-10 rounded-full border border-gray-200" />
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="O que você achou desta oferta?"
                    className="flex-1 bg-white border-2 border-transparent p-4 rounded-2xl text-sm focus:border-brand-500 outline-none shadow-sm min-h-[100px] transition-all"
                  />
                </div>
                <div className="flex justify-end">
                   <button 
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="bg-brand-600 text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
                   >
                     {isSubmittingComment ? 'Postando...' : 'Postar Comentário'}
                   </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-sm text-gray-500 font-medium mb-1">Faça login para comentar</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Compartilhe sua experiência!</p>
              </div>
            )}

            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-gray-400 font-bold py-4 uppercase tracking-widest">Seja o primeiro a comentar!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group animate-fadeIn">
                    <img src={comment.userPhoto} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-gray-900">{comment.userName}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{formatCommentDate(comment.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl rounded-tl-none shadow-sm">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Feed Explorar */}
        <div className="pt-12 space-y-8">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Explorar mais descobertas</h3>
           </div>

           <div className="flex flex-col gap-4">
              {relatedProducts.filter(p => p.id !== product.id).slice(0, visibleDiscoverItems).map(p => (
                <button 
                  key={p.id} 
                  onClick={() => onSelectProduct(p)}
                  className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full group"
                >
                   <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center p-2 flex-shrink-0 overflow-hidden">
                      <img src={p.imageUrl} alt={p.title} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{p.category}</p>
                      <h4 className="text-sm font-black text-gray-900 line-clamp-1 uppercase tracking-tight mb-2">{p.title}</h4>
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-black text-brand-600">{p.estimatedPrice}</span>
                         <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-brand-600 transition-colors">Ver Agora →</span>
                      </div>
                   </div>
                </button>
              ))}

              {visibleDiscoverItems < relatedProducts.length && (
                <div ref={infiniteRef} className="py-10 flex justify-center items-center">
                   <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};
