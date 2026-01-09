
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { TopProductsCarousel } from './components/TopProductsCarousel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SEO } from './components/SEO';
import { NotificationBell, NotificationItem } from './components/NotificationBell';
import { Product, ProductStatus, UserProfile } from './types';
import { productService, trackSiteVisit, socialService, authService } from './services/database';
import { enrichProductData } from './services/geminiService';
import { Footer } from './components/Footer';

const GOOGLE_CLIENT_ID = "14302060436-3nsfssbbrs3fgrphslk1g9nncura8nnb.apps.googleusercontent.com"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";
const INITIAL_ITEMS = 12;
const ITEMS_PER_PAGE = 8;

const GoogleSignInButton = ({ onCallback }: { onCallback: (resp: any) => void }) => {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.google && btnRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCallback
      });
      window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", width: 250 });
    }
  }, [onCallback]);

  return <div ref={btnRef} className="flex justify-center"></div>;
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ 
    url: '', 
    title: '', 
    estimatedPrice: '', 
    category: 'Geral', 
    imageUrl: '', 
    additionalImages: [] as string[],
    description: '',
    isFeatured: false
  });

  const isUserAdmin = useMemo(() => user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(), [user]);

  const processedProducts = useMemo(() => {
    if (products.length === 0) return [];
    let filtered = products;
    if (searchQuery.trim()) {
      filtered = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...filtered].sort((a, b) => b.addedAt - a.addedAt);
  }, [products, searchQuery]);

  const featuredProduct = useMemo(() => {
    if (products.length === 0) return null;
    const explicitlyFeatured = products.find(p => p.isFeatured);
    return explicitlyFeatured || processedProducts[0];
  }, [products, processedProducts]);

  useEffect(() => {
    trackSiteVisit();
    const unsubscribe = productService.subscribe((updatedProducts) => {
        setProducts(updatedProducts);
    });

    const unsubAuth = authService.onAuthChange(async (fbUser) => {
      if (fbUser) {
        const dbProfile = await socialService.getUserProfile(fbUser.uid);
        setUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'Usuário',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || '',
          savedProducts: dbProfile?.savedProducts || []
        });
      } else {
        setUser(null);
      }
    });

    return () => { unsubscribe(); unsubAuth(); };
  }, []);

  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processedProducts.length) {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [processedProducts.length, visibleCount]);

  const handleGoogleCallback = useCallback(async (response: any) => {
    try {
      const fbUser = await authService.loginWithToken(response.credential);
      if (fbUser) {
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
    }
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Deseja sair?")) {
      await authService.logout();
      setUser(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsSaving(true);
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, { ...formData, isGestor: isUserAdmin });
        alert("🎉 Oferta atualizada!");
      } else {
        await productService.add({ 
          ...formData, 
          status: ProductStatus.READY, 
          addedAt: Date.now(),
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          authorId: user.uid,
          isGestor: isUserAdmin 
        });
        alert("🎉 Oferta publicada!");
      }
      closePostModal();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally { setIsSaving(false); }
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    if (!editingProduct && (url.includes('mercadolivre') || url.includes('amazon')) && !formData.title) {
      setIsEnriching(true);
      try {
        const enriched = await enrichProductData(url);
        setFormData(prev => ({ ...prev, ...enriched }));
      } catch (e) {} finally { setIsEnriching(false); }
    }
  };

  const handleAdditionalImageChange = (index: number, value: string) => {
    const updated = [...formData.additionalImages];
    updated[index] = value;
    setFormData({ ...formData, additionalImages: updated });
  };

  const addImageField = () => {
    setFormData({ ...formData, additionalImages: [...formData.additionalImages, ''] });
  };

  const removeImageField = (index: number) => {
    const updated = formData.additionalImages.filter((_, i) => i !== index);
    setFormData({ ...formData, additionalImages: updated });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      url: product.url,
      title: product.title,
      estimatedPrice: product.estimatedPrice || '',
      category: product.category,
      imageUrl: product.imageUrl || '',
      additionalImages: product.additionalImages || [],
      description: product.description || '',
      isFeatured: product.isFeatured || false
    });
    setIsPostModalOpen(true);
  };

  const closePostModal = () => {
    setIsPostModalOpen(false);
    setEditingProduct(null);
    setFormData({ url: '', title: '', estimatedPrice: '', category: 'Geral', imageUrl: '', additionalImages: [], description: '', isFeatured: false });
  };

  const pagedProducts = useMemo(() => processedProducts.slice(0, visibleCount), [processedProducts, visibleCount]);

  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-white">
        <SEO products={[selectedProduct]} />
        <ProductDetail 
          product={selectedProduct} 
          relatedProducts={products} 
          onBack={() => setSelectedProduct(null)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          currentUser={user}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 sm:pb-0">
      <SEO products={products} />
      <Header 
        onOpenAdmin={() => { setEditingProduct(null); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }}
        onOpenAnalytics={() => isUserAdmin ? setIsAnalyticsOpen(true) : alert("Acesso restrito ao Administrador.")}
        totalProducts={products.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setVisibleCount(INITIAL_ITEMS); }}
      />
      
      {user && (
        <div className="bg-gray-900 px-4 py-2 flex justify-between items-center text-white/70">
           <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isUserAdmin ? 'bg-green-400' : 'bg-blue-400'}`}></div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none pt-0.5">
                {user.email} {isUserAdmin && <span className="text-green-400 font-black ml-1">[ADMIN]</span>}
              </span>
           </div>
           <button onClick={handleLogout} className="text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors">Sair</button>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto overflow-hidden sm:px-4">
          
          {!searchQuery && featuredProduct && (
            <section className="px-2 sm:px-0 mb-8 animate-fadeIn mt-4">
              <div 
                onClick={() => setSelectedProduct(featuredProduct)}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col md:flex-row cursor-pointer group active:scale-[0.99] transition-all"
              >
                <div className="w-full md:w-5/12 aspect-square md:aspect-auto bg-white p-6 sm:p-12 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-50">
                  <img 
                    src={featuredProduct.imageUrl} 
                    alt={featuredProduct.title} 
                    className="max-w-full max-h-[250px] md:max-h-[350px] object-contain group-hover:scale-105 transition-transform duration-700" 
                  />
                </div>
                
                <div className="w-full md:w-7/12 p-8 sm:p-14 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 w-fit">
                    🔥 Oferta do Dia
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tighter uppercase mb-3">
                    {featuredProduct.title}
                  </h2>
                  <p className="text-gray-500 text-[11px] sm:text-sm leading-relaxed mb-6 line-clamp-3 font-medium">
                    {String(featuredProduct.marketingPitch || featuredProduct.description || '')}
                  </p>
                  
                  <div className="flex items-center gap-6 mb-8">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Menor Preço Encontrado</div>
                      <div className="text-3xl sm:text-4xl font-black text-success-500">{featuredProduct.estimatedPrice}</div>
                    </div>
                  </div>
                  
                  <button className="hidden md:flex w-full bg-success-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-success-100 group-hover:bg-success-600 transition-all items-center justify-center gap-3 uppercase tracking-widest text-xs">
                    Comparar Preços Agora
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </button>

                  <div className="md:hidden text-[10px] font-black text-success-500 uppercase tracking-widest flex items-center gap-2">
                    Toque para ver detalhes
                    <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="mb-10"><TopProductsCarousel products={products} /></div>

          {isAnalyticsOpen && isUserAdmin && (
            <div className="m-4 p-8 bg-white rounded-[2rem] border border-gray-100 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Métricas Guia Pro</h2>
                 <button onClick={() => setIsAnalyticsOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-2">✕</button>
              </div>
              <AnalyticsDashboard products={products} />
            </div>
          )}
          
          <div className="px-3 sm:px-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 ml-2">Vitrine de Oportunidades</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {pagedProducts.map(p => (
                <div key={p.id} className="h-full">
                  <ProductCard product={p} currentUser={user} onAuthRequired={() => setIsAuthModalOpen(true)} onEdit={openEdit} onSelect={(product) => setSelectedProduct(product)} isAdmin={isUserAdmin} />
                </div>
              ))}
            </div>
          </div>
          
          <div ref={observerTarget} className="w-full py-16 flex flex-col items-center justify-center gap-3 h-20">
            {processedProducts.length > visibleCount && (
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            )}
          </div>
      </main>
      <Footer onOpenAdmin={() => user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true)} />
      
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around h-16 sm:hidden px-4 shadow-2xl">
         <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center gap-1 text-gray-900">
           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
           <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
         </button>
         <button onClick={() => { setEditingProduct(null); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }} className="flex flex-col items-center justify-center -translate-y-4 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg active:scale-90 transition-transform">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
         </button>
         <button onClick={() => !user ? setIsAuthModalOpen(true) : handleLogout()} className="flex flex-col items-center gap-1 text-gray-400">
           {user ? <img src={user.photoURL} className="w-5 h-5 rounded-full border border-gray-200" alt="" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
           <span className="text-[9px] font-black uppercase tracking-widest">{user ? 'Sair' : 'Perfil'}</span>
         </button>
      </nav>

      <NotificationBell notifications={notifications} onClear={() => setNotifications([])} onMarkRead={() => {}} />

      {isPostModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slideUp">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
               <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">{editingProduct ? 'Editar Oferta' : 'Nova Oferta'}</h2>
               <button onClick={closePostModal} className="p-2 text-gray-500">✕</button>
             </div>
             <form onSubmit={handleAddProduct} className="p-6 sm:p-8 space-y-4 max-h-[80vh] overflow-y-auto pb-10 sm:pb-8">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Link de Afiliado</label>
                   <input required type="url" placeholder="https://..." value={formData.url} onChange={(e) => handleUrlChange(e.target.value)} className="w-full border border-gray-200 p-4 rounded-2xl text-xs outline-none focus:border-gray-900 transition-all" />
                </div>
                {isEnriching && <p className="text-[9px] text-blue-600 animate-pulse font-black uppercase tracking-widest">Consultando IA...</p>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Título</label>
                    <input required placeholder="..." value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full border border-gray-200 p-4 rounded-2xl text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço</label>
                    <input required placeholder="R$ 0,00" value={formData.estimatedPrice} onChange={(e)=>setFormData({...formData, estimatedPrice: e.target.value})} className="w-full border border-gray-200 p-4 rounded-2xl text-xs" />
                  </div>
                </div>
                
                {isUserAdmin && (
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer transition-colors hover:bg-white">
                    <input 
                      type="checkbox" 
                      checked={formData.isFeatured} 
                      onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" 
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-900 uppercase">Banner de Destaque</span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Colocar produto no topo da vitrine.</span>
                    </div>
                  </label>
                )}

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
                   <textarea placeholder="Características principais..." value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 p-4 rounded-2xl text-xs min-h-[80px]" />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-50">
                   <div className="flex justify-between items-center">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fotos do Produto</label>
                     <button type="button" onClick={addImageField} className="text-[9px] font-black text-brand-600 uppercase border border-brand-100 px-2 py-1 rounded-lg">Adicionar Foto</button>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="space-y-1">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Foto Principal (Capa)</span>
                        <input required type="url" placeholder="URL da Foto Principal..." value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} className="w-full border border-gray-200 p-4 rounded-2xl text-xs" />
                     </div>
                     
                     {formData.additionalImages.map((img, idx) => (
                       <div key={idx} className="space-y-1 relative group">
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Foto Extra {idx + 1}</span>
                          <div className="flex gap-2">
                            <input type="url" placeholder="URL da Foto Extra..." value={img} onChange={(e) => handleAdditionalImageChange(idx, e.target.value)} className="flex-1 border border-gray-200 p-4 rounded-2xl text-xs" />
                            <button type="button" onClick={() => removeImageField(idx)} className="p-2 text-red-400 hover:text-red-600">✕</button>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>

                <button disabled={isSaving} type="submit" className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-[0.2em] disabled:opacity-50 active:scale-95 transition-all shadow-xl shadow-gray-200">
                  {isSaving ? 'Processando...' : 'Salvar e Publicar'}
                </button>
             </form>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xs w-full text-center animate-slideUp shadow-2xl">
            <h3 className="text-xl font-black mb-2 text-gray-900 uppercase tracking-tighter">Acesso Guia Pro</h3>
            <p className="text-[10px] text-gray-400 mb-8 leading-relaxed font-bold uppercase tracking-widest">Faça login para gerenciar as ofertas verificadas.</p>
            <GoogleSignInButton onCallback={handleGoogleCallback} />
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-8 text-[9px] text-gray-300 hover:text-gray-900 transition-colors font-black uppercase tracking-widest">Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
