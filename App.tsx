
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { TopProductsCarousel } from './components/TopProductsCarousel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SEO } from './components/SEO';
import { NotificationBell, NotificationItem } from './components/NotificationBell';
import { Product, ProductStatus, UserProfile } from './types';
import { productService, trackSiteVisit, trackNotificationSent, socialService, authService } from './services/database';
import { enrichProductData } from './services/geminiService';
import { Footer } from './components/Footer';

const GOOGLE_CLIENT_ID = "14302060436-3nsfssbbrs3fgrphslk1g9nncura8nnb.apps.googleusercontent.com"; 
const ADMIN_EMAIL = "maxoliveiraf@gmail.com";
const INITIAL_ITEMS = 12;
const ITEMS_PER_PAGE = 8;

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
  
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const authModalGoogleRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ 
    url: '', 
    title: '', 
    estimatedPrice: '', 
    category: 'Geral', 
    imageUrl: '', 
    description: '',
    isFeatured: false
  });

  const isUserAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const processedProducts = useMemo(() => {
    if (products.length === 0) return [];
    if (searchQuery.trim()) {
      return products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...products].sort((a, b) => b.addedAt - a.addedAt);
  }, [products, searchQuery]);

  // Encontra o produto em destaque (ou o mais recente se nenhum estiver marcado)
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processedProducts.length) {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [processedProducts.length, visibleCount]);

  useEffect(() => {
    if ((isPostModalOpen || isAnalyticsOpen || isAuthModalOpen) && !user && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback
      });
      const target = isAuthModalOpen ? authModalGoogleRef : googleButtonRef;
      if (target.current) {
        window.google.accounts.id.renderButton(target.current, { theme: "outline", size: "large", width: 250 });
      }
    }
  }, [isPostModalOpen, isAnalyticsOpen, isAuthModalOpen, user]);

  const handleGoogleCallback = async (response: any) => {
    try {
      const fbUser = await authService.loginWithToken(response.credential);
      if (fbUser) {
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/configuration-not-found') {
        alert(`FALHA DE CONFIGURAÇÃO:\n\n1. O login do Google precisa ser ativado no Firebase Console.\n2. O domínio "${window.location.hostname}" deve ser autorizado em Authentication > Settings > Authorized domains.`);
      } else {
        alert("Erro ao conectar com o banco de dados: " + (err.code || "Tente novamente"));
      }
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja sair?")) {
      await authService.logout();
      setUser(null);
    }
  };

  const handleAddProduct = async (e: any) => {
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
      console.error("Save Error:", err);
      alert(err.code === 'permission-denied' 
        ? "❌ Erro de Permissão: Verifique se suas 'Rules' no Firebase permitem gravação para " + user.email 
        : "Erro ao salvar: " + err.message);
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

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      url: product.url,
      title: product.title,
      estimatedPrice: product.estimatedPrice || '',
      category: product.category,
      imageUrl: product.imageUrl || '',
      description: product.description || '',
      isFeatured: product.isFeatured || false
    });
    setIsPostModalOpen(true);
  };

  const closePostModal = () => {
    setIsPostModalOpen(false);
    setEditingProduct(null);
    setFormData({ url: '', title: '', estimatedPrice: '', category: 'Geral', imageUrl: '', description: '', isFeatured: false });
  };

  const pagedProducts = processedProducts.slice(0, visibleCount);

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
      <main className="flex-1 w-full max-w-7xl mx-auto overflow-hidden sm:px-4">
          {user && (
            <div className="px-4 py-2 bg-brand-50 flex justify-between items-center border-b border-brand-100 sm:rounded-b-2xl mb-4 animate-fadeIn">
               <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isUserAdmin ? 'bg-green-500' : 'bg-brand-500'}`}></div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Logado: <span className="text-gray-900">{user.email}</span> {isUserAdmin && <span className="text-green-600 font-black ml-1">[ADMIN]</span>}
                  </span>
               </div>
               <button onClick={handleLogout} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sair</button>
            </div>
          )}
          
          <div className="mt-2"><TopProductsCarousel products={products} /></div>

          {/* SEÇÃO: PRODUTO EM DESTAQUE (VITRINE HERO) */}
          {!searchQuery && featuredProduct && (
            <section className="px-2 sm:px-0 mb-8 animate-fadeIn">
              <div 
                onClick={() => setSelectedProduct(featuredProduct)}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col md:flex-row cursor-pointer group active:scale-[0.99] transition-all"
              >
                {/* Imagem Clicável */}
                <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-white p-8 sm:p-12 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-50 overflow-hidden">
                  <img 
                    src={featuredProduct.imageUrl} 
                    alt={featuredProduct.title} 
                    className="max-w-full max-h-[400px] object-contain group-hover:scale-105 transition-transform duration-700" 
                  />
                </div>
                
                {/* Copy e Informações */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 w-fit shadow-lg shadow-brand-200">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    Oferta em Destaque
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight tracking-tight uppercase mb-4">
                    {featuredProduct.title}
                  </h2>
                  <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 line-clamp-3 md:line-clamp-none font-medium">
                    {featuredProduct.marketingPitch || featuredProduct.description}
                  </p>
                  
                  {/* Preço: Visível apenas no Desktop */}
                  <div className="hidden md:flex items-center gap-6 mb-8">
                    <div className="text-4xl font-black text-gray-900">{featuredProduct.estimatedPrice}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-l border-gray-200 pl-4">Melhor Preço<br/>Encontrado</div>
                  </div>
                  
                  {/* Botão: Visível apenas no Desktop */}
                  <button className="hidden md:flex w-full bg-brand-600 text-white font-black py-6 rounded-2xl shadow-xl shadow-brand-100 group-hover:bg-brand-700 transition-all items-center justify-center gap-4 uppercase tracking-widest text-sm">
                    Ver Detalhes da Oferta
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </button>

                  {/* Feedback Visual para Mobile (opcional, para indicar que é clicável) */}
                  <div className="md:hidden mt-4 text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2">
                    Clique para ver mais detalhes
                    <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                </div>
              </div>
            </section>
          )}

          {isAnalyticsOpen && isUserAdmin && (
            <div className="m-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-900">Métricas Administrativas</h2>
                 <button onClick={() => setIsAnalyticsOpen(false)} className="text-gray-400 p-2">✕</button>
              </div>
              <AnalyticsDashboard products={products} />
            </div>
          )}
          
          <div className="px-2 sm:px-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Explorar Outras Ofertas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
              {pagedProducts.map(p => (
                <div key={p.id} className="h-full">
                  <ProductCard product={p} currentUser={user} onAuthRequired={() => setIsAuthModalOpen(true)} onEdit={openEdit} onSelect={(product) => setSelectedProduct(product)} isAdmin={isUserAdmin} />
                </div>
              ))}
            </div>
          </div>
          
          {processedProducts.length > visibleCount && (
            <div ref={observerTarget} className="w-full py-16 flex flex-col items-center justify-center gap-3">
               <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
          )}
      </main>
      <Footer onOpenAdmin={() => user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true)} />
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around h-16 sm:hidden px-4">
         <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center gap-1 text-brand-600">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
           <span className="text-[10px] font-bold">Início</span>
         </button>
         <button onClick={() => { setEditingProduct(null); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }} className="flex flex-col items-center justify-center -translate-y-4 w-12 h-12 bg-brand-600 text-white rounded-full shadow-lg">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
         </button>
         <button onClick={() => !user ? setIsAuthModalOpen(true) : handleLogout()} className="flex flex-col items-center gap-1 text-gray-400">
           {user ? <img src={user.photoURL} className="w-6 h-6 rounded-full border border-gray-200" alt="" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
           <span className="text-[10px] font-bold">{user ? 'Sair' : 'Perfil'}</span>
         </button>
      </nav>
      <NotificationBell notifications={notifications} onClear={() => setNotifications([])} onMarkRead={() => {}} />
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slideUp">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
               <h2 className="font-black text-gray-900 text-lg uppercase tracking-tight">{editingProduct ? 'Editar Oferta' : 'Nova Oferta'}</h2>
               <button onClick={closePostModal} className="p-2 text-gray-500">✕</button>
             </div>
             <form onSubmit={handleAddProduct} className="p-6 sm:p-8 space-y-5 max-h-[80vh] overflow-y-auto pb-10 sm:pb-8">
                <input required type="url" placeholder="Link de Afiliado..." value={formData.url} onChange={(e) => handleUrlChange(e.target.value)} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm outline-none focus:border-brand-500" />
                {isEnriching && <p className="text-[10px] text-brand-600 animate-pulse font-bold">IA Analisando Link...</p>}
                <input required placeholder="Título do Produto" value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm" />
                <input required placeholder="Preço (R$ 0,00)" value={formData.estimatedPrice} onChange={(e)=>setFormData({...formData, estimatedPrice: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm" />
                
                {isUserAdmin && (
                  <label className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl border-2 border-brand-100 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isFeatured} 
                      onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" 
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-brand-900 uppercase">Destaque na Vitrine</span>
                      <span className="text-[10px] text-brand-700 font-bold">Aparecerá com foto grande no topo da página.</span>
                    </div>
                  </label>
                )}

                <textarea placeholder="Pequena descrição ou destaques..." value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm min-h-[100px]" />
                <input required type="url" placeholder="URL da Imagem do Produto" value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm" />
                <button disabled={isSaving} type="submit" className="w-full bg-brand-600 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest disabled:opacity-50 active:scale-95 transition-all">
                  {isSaving ? 'Salvando...' : 'Publicar Oferta'}
                </button>
             </form>
          </div>
        </div>
      )}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xs w-full text-center animate-slideUp">
            <h3 className="text-2xl font-black mb-3 text-gray-900">Acesso Restrito</h3>
            <p className="text-[12px] text-gray-500 mb-10 leading-relaxed">Faça login com sua conta para gerenciar as ofertas da loja.</p>
            <div ref={authModalGoogleRef} className="flex justify-center mb-8"></div>
            <button onClick={() => setIsAuthModalOpen(false)} className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Voltar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
