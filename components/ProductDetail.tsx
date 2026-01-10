
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [activeImage, setActiveImage] = useState(product.imageUrl || '');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [visibleDiscoverItems, setVisibleDiscoverItems] = useState(6);
  const infiniteRef = useRef<HTMLDivElement>(null);

  // Verifica se o preço é "longo" (mais de 3 dígitos antes da vírgula) para ajustar o layout mobile
  const isLongPrice = useMemo(() => {
    if (!product.estimatedPrice) return false;
    // Remove símbolos e foca na parte inteira antes da vírgula
    const rawValue = product.estimatedPrice.replace(/[^\d,]/g, '').split(',')[0];
    return rawValue.length > 3;
  }, [product.estimatedPrice]);

  const allImages = useMemo(() => {
    const images = [product.imageUrl || ''];
    if (product.additionalImages) {
      images.push(...product.additionalImages.filter(img => img.trim() !== ''));
    }
    return images;
  }, [product]);

  const getStoreInfo = (url: string) => {
    if (url.includes('mercadolivre')) return { name: 'Mercado Livre', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (url.includes('amazon')) return { name: 'Amazon', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { name: 'Loja Parceira', color: 'text-brand-600', bg: 'bg-brand-50' };
  };

  const store = getStoreInfo(product.url);

  const discoveryList = useMemo(() => {
    const others = relatedProducts.filter(p => p.id !== product.id);
    return others.sort((a, b) => {
      const aIsSame = a.category === product.category;
      const bIsSame = b.category === product.category;
      if (aIsSame && !bIsSame) return -1;
      if (!aIsSame && bIsSame) return 1;
      return b.addedAt - a.addedAt;
    });
  }, [relatedProducts, product]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImage(product.imageUrl || '');
    
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
        try { await productService.update(product.id, { marketingPitch: text }); } catch (dbError) {}
      } catch (error) {
        setPitch("Esta é uma oferta incrível selecionada por nossa curadoria!");
      } finally { setLoadingPitch(false); }
    };
    fetchPitch();
    const unsubscribeComments = commentService.subscribe(product.id, (fetched) => setComments(fetched));
    return () => unsubscribeComments();
  }, [product.id, product.marketingPitch, product.title, product.description, product.imageUrl]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleDiscoverItems < discoveryList.length) {
        setVisibleDiscoverItems(prev => prev + 6);
      }
    }, { threshold: 0.1 });
    if (infiniteRef.current) observer.observe(infiniteRef.current);
    return () => observer.disconnect();
  }, [discoveryList.length, visibleDiscoverItems]);

  const handleBuy = () => {
    incrementClick(product.id);
    if (typeof window.gtag_report_conversion === 'function') {
      window.gtag_report_conversion(product.url);
    } else {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fadeIn">
      {/* Header Compacto */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-900 active:scale-90 transition-transform">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Oferta Verificada</span>
        <button onClick={() => { navigator.share?.({ title: product.title, url: window.location.href }); }} className="p-2 -mr-2 text-brand-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        {/* Card Principal de Resumo */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-4 sm:p-6 flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-1/2 space-y-4">
            <div className="aspect-square flex items-center justify-center bg-white rounded-2xl border border-gray-50 p-4 overflow-hidden">
              <img src={activeImage} alt={product.title} className="max-w-full max-h-full object-contain transition-all duration-500" />
            </div>
            {/* Galeria de Miniaturas */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1">
                {allImages.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(img)}
                    className={`w-14 h-14 rounded-lg border-2 flex-shrink-0 overflow-hidden transition-all ${activeImage === img ? 'border-brand-600 shadow-md scale-105' : 'border-gray-100 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center py-2">
            <div className="mb-6">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Cores e Modelos Disponíveis</span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight">{product.title}</h1>
            </div>
            
            {/* Bloco de Preço Otimizado para Mobile com Redução Dinâmica */}
            <div className="flex items-center justify-between bg-gray-50/80 p-5 sm:p-6 rounded-[2rem] border border-gray-100 gap-2">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none truncate">Menor preço via</span>
                <span className={`text-[10px] font-black uppercase mb-1 truncate ${store.color}`}>{store.name}</span>
                <div className={`font-black text-success-500 leading-none transition-all ${isLongPrice ? 'text-xl sm:text-3xl' : 'text-2xl sm:text-3xl'}`}>
                  {product.estimatedPrice}
                </div>
              </div>
              <button 
                onClick={handleBuy}
                className="bg-success-500 text-white font-black px-5 py-4 sm:px-8 sm:py-4 rounded-2xl text-[10px] sm:text-xs uppercase tracking-[0.15em] shadow-xl shadow-success-100 active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
              >
                Ir à Loja
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Preços (Simulação de Comparação) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 pt-2">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Oferta em Destaque</h3>
             <span className="text-[10px] font-black text-success-500 bg-success-50 px-2 py-0.5 rounded-full uppercase">Melhor Escolha</span>
          </div>
          <div 
            onClick={handleBuy}
            className="bg-white rounded-3xl border-2 border-success-500/30 p-5 flex items-center justify-between cursor-pointer group hover:bg-success-50/20 transition-all shadow-sm"
          >
             <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-full flex-shrink-0 ${store.bg} flex items-center justify-center`}>
                   <svg className={`w-6 h-6 ${store.color}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <div className="min-w-0">
                   <div className={`font-black text-gray-900 truncate ${isLongPrice ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                    {product.estimatedPrice} <span className="text-[10px] text-gray-400 font-normal ml-1">à vista</span>
                   </div>
                   <div className="text-[10px] font-bold text-gray-400 uppercase truncate">Vendido por <span className="text-gray-900">{store.name}</span></div>
                </div>
             </div>
             <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:block text-[10px] font-black text-success-500 uppercase tracking-widest">Ir para Loja</span>
                <div className="w-10 h-10 bg-success-500 text-white rounded-xl flex items-center justify-center shadow-md">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </div>
             </div>
          </div>
        </div>

        {/* Histórico de Preços */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Histórico de Preços</h3>
              <div className="flex gap-2">
                 <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-full uppercase">6 Meses</span>
              </div>
           </div>
           {/* Gráfico SVG Simulado: Mostra um platô estável após queda */}
           <div className="relative h-24 w-full bg-gray-50/50 rounded-2xl overflow-hidden flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                 <path 
                   d="M0,22 L15,20 L30,24 L45,10 L60,12 L75,18 L100,18" 
                   fill="none" 
                   stroke="#0ea5e9" 
                   strokeWidth="1.5" 
                   className="animate-pulse"
                 />
                 <path 
                   d="M0,22 L15,20 L30,24 L45,10 L60,12 L75,18 L100,18 L100,30 L0,30 Z" 
                   fill="url(#gradient)" 
                   fillOpacity="0.1" 
                 />
                 <defs>
                   <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#0ea5e9" />
                     <stop offset="100%" stopColor="transparent" />
                   </linearGradient>
                 </defs>
              </svg>
              <div className="absolute top-2 right-2 text-[8px] font-black text-brand-600 bg-white px-2 py-0.5 rounded shadow-sm border border-brand-100">R$ {product.estimatedPrice}</div>
           </div>
           <div className="flex justify-between mt-3 px-2">
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Jul</span>
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Ago</span>
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Set</span>
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Out</span>
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Hoje</span>
           </div>
        </div>

        {/* Análise IA */}
        <div className="space-y-4 pt-2">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Por que vale a pena?</h3>
           <div className="bg-white border-l-4 border-brand-600 p-6 rounded-3xl shadow-sm text-gray-700 leading-relaxed font-medium text-sm">
              {loadingPitch ? (
                <div className="flex gap-2 items-center py-2">
                   <div className="w-1.5 h-1.5 bg-brand-100 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-brand-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1.5 h-1.5 bg-brand-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">Consultando Guia IA...</span>
                </div>
              ) : ( <p className="italic">"{pitch}"</p> )}
           </div>
        </div>

        {/* Captura de Lead */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] shadow-xl text-white">
          {!isSaved ? (
            <div className="animate-fadeIn">
              <h4 className="text-sm font-black uppercase tracking-tight mb-2">Quer um preço ainda menor?</h4>
              <p className="text-[11px] text-gray-400 mb-6 font-medium">Avisaremos você por e-mail assim que este produto baixar de preço ou surgir um cupom.</p>
              <form onSubmit={async (e) => { e.preventDefault(); if(email) { await interestService.saveEmail(email, product.id, product.title); setIsSaved(true); } }} className="flex gap-2">
                <input required type="email" placeholder="Seu e-mail..." value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-white/10 border border-white/5 p-4 rounded-2xl text-xs outline-none focus:border-brand-600" />
                <button type="submit" className="bg-brand-600 text-white font-black px-5 py-4 rounded-2xl uppercase text-[9px] tracking-widest">Monitorar</button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4 animate-fadeIn flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
              <span className="text-[11px] font-black uppercase tracking-widest">Alerta de Preço Ativado!</span>
            </div>
          )}
        </div>

        {/* Outras Ofertas Sugeridas */}
        {discoveryList.length > 0 && (
          <div className="pt-10 space-y-4">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Pessoas também compararam</h3>
             <div className="flex flex-col gap-3">
                {discoveryList.slice(0, visibleDiscoverItems).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => onSelectProduct(p)}
                    className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all text-left w-full group active:scale-[0.98]"
                  >
                     <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0 border border-gray-50 overflow-hidden">
                        <img src={p.imageUrl} alt={p.title} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-black text-gray-900 line-clamp-1 uppercase tracking-tight mb-2">{p.title}</h4>
                        <div className="flex items-center justify-between">
                           <span className="text-[12px] font-black text-brand-600">{p.estimatedPrice}</span>
                           <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest group-hover:text-brand-600">Ver Oferta</span>
                        </div>
                     </div>
                  </button>
                ))}
                {visibleDiscoverItems < discoveryList.length && <div ref={infiniteRef} className="h-10"></div>}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
