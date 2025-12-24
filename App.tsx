
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { TopProductsCarousel } from './components/TopProductsCarousel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SEO } from './components/SEO';
import { NotificationBell, NotificationItem } from './components/NotificationBell';
import { Product, ProductStatus, UserProfile } from './types';
import { productService, trackSiteVisit, trackNotificationSent, socialService } from './services/database';
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
    description: '' 
  });

  const isUserAdmin = user?.email === ADMIN_EMAIL;

  // Lógica de Prioridade Aleatória para Produtos do Gestor
  const processedProducts = useMemo(() => {
    if (products.length === 0) return [];

    // Se houver busca, não aplicamos a prioridade aleatória para não confundir o usuário
    if (searchQuery.trim()) {
      return products.filter(p => {
        const query = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
      });
    }

    const gestorProducts = products.filter(p => p.isGestor);
    const otherProducts = products.filter(p => !p.isGestor);

    if (gestorProducts.length === 0) return products;

    // Embaralha produtos do gestor para escolher 2 aleatórios
    const shuffledGestor = [...gestorProducts].sort(() => 0.5 - Math.random());
    const priority = shuffledGestor.slice(0, 2);
    const remainingGestor = shuffledGestor.slice(2);

    // O restante deve ser mantido por ordem de data (mais recentes primeiro)
    const rest = [...otherProducts, ...remainingGestor].sort((a, b) => b.addedAt - a.addedAt);

    return [...priority, ...rest];
  }, [products, searchQuery]);

  useEffect(() => {
    trackSiteVisit();
    let isInitialLoad = true;
    const unsubscribe = productService.subscribe(
      (updatedProducts) => {
        if (!isInitialLoad && updatedProducts.length > products.length) {
          triggerNotification({
             title: 'Nova Oferta! 🎉',
             message: `Acabou de chegar: ${updatedProducts[0].title}`,
             url: updatedProducts[0].url,
             imageUrl: updatedProducts[0].imageUrl
          });
        }
        setProducts(updatedProducts);
        isInitialLoad = false;
      }
    );
    return () => unsubscribe();
  }, [products.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processedProducts.length) {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

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
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const payload = JSON.parse(jsonPayload);

    const newUser: UserProfile = {
      uid: payload.sub,
      displayName: payload.name,
      email: payload.email,
      photoURL: payload.picture,
      savedProducts: []
    };

    const dbProfile = await socialService.getUserProfile(newUser.uid);
    setUser({ ...newUser, ...dbProfile });
    setIsAuthModalOpen(false);
  };

  const triggerNotification = (data: any) => {
     setNotifications(prev => [{ id: Date.now().toString(), ...data, timestamp: Date.now(), read: false }, ...prev]);
     trackNotificationSent();
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    if (!editingProduct && (url.includes('mercadolivre') || url.includes('amazon')) && !formData.title) {
      setIsEnriching(true);
      try {
        const enriched = await enrichProductData(url);
        setFormData(prev => ({
          ...prev,
          title: enriched.title || prev.title,
          description: enriched.description || prev.description,
          category: enriched.category || prev.category,
          estimatedPrice: enriched.estimatedPrice || prev.estimatedPrice
        }));
      } catch (e) {
        console.error("Enrichment failed", e);
      } finally {
        setIsEnriching(false);
      }
    }
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      if (editingProduct) {
        // Se o gestor editar um produto de outro, ele assume a marcação de Gestor
        await productService.update(editingProduct.id, { 
          ...formData, 
          isGestor: isUserAdmin ? true : editingProduct.isGestor 
        });
        alert("🎉 Oferta atualizada!");
      } else {
        await productService.add({ 
          ...formData, 
          status: ProductStatus.READY, 
          addedAt: Date.now(),
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          authorId: user.uid,
          isGestor: isUserAdmin // Marca se é o gestor postando
        });
        alert("🎉 Oferta publicada!");
      }
      setFormData({ url: '', title: '', estimatedPrice: '', category: 'Geral', imageUrl: '', description: '' });
      setEditingProduct(null);
      setIsPostModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar.");
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
      description: product.description || ''
    });
    setIsPostModalOpen(true);
  };

  const pagedProducts = processedProducts.slice(0, visibleCount);

  if (selectedProduct) {
    return (
      <HelmetProvider>
        <div className="min-h-screen bg-white">
          <SEO products={[selectedProduct]} />
          <ProductDetail 
            product={selectedProduct} 
            relatedProducts={products.filter(p => p.category === selectedProduct.category)}
            onBack={() => setSelectedProduct(null)}
            onSelectProduct={(p) => setSelectedProduct(p)}
            currentUser={user}
          />
        </div>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 sm:pb-0">
        <SEO products={products} />

        <Header 
          onOpenAdmin={() => { setEditingProduct(null); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }}
          onOpenAnalytics={() => isUserAdmin ? setIsAnalyticsOpen(true) : alert("Acesso restrito.")}
          totalProducts={products.length}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setVisibleCount(INITIAL_ITEMS); }}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto overflow-hidden sm:px-4">
            
            <div className="mt-2 sm:mt-6">
              <TopProductsCarousel products={products} />
            </div>

            {isAnalyticsOpen && isUserAdmin && (
              <div className="m-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-xl animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-gray-900">Painel de Métricas</h2>
                   <button onClick={() => setIsAnalyticsOpen(false)} className="text-gray-400 p-2">✕</button>
                </div>
                <AnalyticsDashboard products={products} />
              </div>
            )}

            {/* Grid Mobile Estilo Shopee (2 Colunas) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6 pt-2 sm:pt-8 px-2 sm:px-0">
               {pagedProducts.map(p => (
                 <div key={p.id} className="h-full">
                   <ProductCard 
                     product={p} 
                     currentUser={user} 
                     onAuthRequired={() => setIsAuthModalOpen(true)}
                     onEdit={openEdit}
                     onSelect={(product) => setSelectedProduct(product)}
                     isAdmin={isUserAdmin}
                   />
                 </div>
               ))}
            </div>

            {processedProducts.length > visibleCount && (
              <div ref={observerTarget} className="w-full py-16 flex flex-col items-center justify-center gap-3">
                 <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Buscando novas ofertas</p>
              </div>
            )}

            {processedProducts.length === 0 && (
              <div className="text-center py-24 px-4 animate-fadeIn">
                <div className="text-5xl mb-4 opacity-20">🔎</div>
                <p className="text-gray-400 font-bold italic">Nenhuma oferta encontrada...</p>
              </div>
            )}
        </main>

        <Footer onOpenAdmin={() => user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true)} />

        {/* Barra de Navegação Inferior (Mobile Only) */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around h-16 sm:hidden px-4">
           <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center gap-1 text-brand-600">
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
             <span className="text-[10px] font-bold">Início</span>
           </button>
           <button onClick={() => document.querySelector('input')?.focus()} className="flex flex-col items-center gap-1 text-gray-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
             <span className="text-[10px] font-bold">Explorar</span>
           </button>
           <button 
             onClick={() => { setEditingProduct(null); user ? setIsPostModalOpen(true) : setIsAuthModalOpen(true); }}
             className="flex flex-col items-center justify-center -translate-y-4 w-12 h-12 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-200"
            >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
           </button>
           <button onClick={() => isUserAdmin ? setIsAnalyticsOpen(true) : alert("Área Administrativa")} className="flex flex-col items-center gap-1 text-gray-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
             <span className="text-[10px] font-bold">Painel</span>
           </button>
           <button onClick={() => !user && setIsAuthModalOpen(true)} className="flex flex-col items-center gap-1 text-gray-400">
             {user ? (
               <img src={user.photoURL} className="w-6 h-6 rounded-full border border-gray-200" alt="" />
             ) : (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
             )}
             <span className="text-[10px] font-bold">Perfil</span>
           </button>
        </nav>

        <NotificationBell notifications={notifications} onClear={() => setNotifications([])} onMarkRead={() => {}} />

        {isPostModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slideUp">
               <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                 <h2 className="font-black text-gray-900 text-lg uppercase tracking-tight">{editingProduct ? 'Editar Oferta' : 'Nova Publicação'}</h2>
                 <button onClick={() => setIsPostModalOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-500 hover:bg-gray-300">✕</button>
               </div>
               <form onSubmit={handleAddProduct} className="p-6 sm:p-8 space-y-5 max-h-[80vh] overflow-y-auto pb-10 sm:pb-8">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">URL de Afiliado (ML/Amazon)</label>
                    <input required type="url" placeholder="Cole o link aqui..." value={formData.url} onChange={(e) => handleUrlChange(e.target.value)} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm focus:border-brand-500 transition-colors" />
                    {isEnriching && <p className="text-[10px] text-brand-600 animate-pulse font-bold ml-1">IA está analisando o produto...</p>}
                  </div>
                  <input required placeholder="Nome do Produto" value={formData.title} onChange={(e)=>setFormData({...formData, title: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm focus:border-brand-500" />
                  <input required placeholder="Preço (ex: R$ 199,90)" value={formData.estimatedPrice} onChange={(e)=>setFormData({...formData, estimatedPrice: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm focus:border-brand-500" />
                  <textarea placeholder="Pequena descrição ou destaque..." value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm min-h-[120px] focus:border-brand-500" />
                  <div className="grid grid-cols-1 gap-4">
                    <select value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm bg-white focus:border-brand-500">
                       <option>Geral</option><option>Eletrônicos</option><option>Moda</option><option>Casa</option><option>Beleza</option><option>Games</option><option>Cozinha</option>
                    </select>
                    <input required type="url" placeholder="URL da Imagem do Produto" value={formData.imageUrl} onChange={(e)=>setFormData({...formData, imageUrl: e.target.value})} className="w-full border-2 border-gray-100 p-4 rounded-2xl text-sm focus:border-brand-500" />
                  </div>
                  <button type="submit" className="w-full bg-brand-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-200 active:scale-95 transition-all uppercase tracking-widest text-xs">
                    {editingProduct ? 'Salvar Mudanças' : 'Publicar na Loja'}
                  </button>
               </form>
            </div>
          </div>
        )}

        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-xs w-full text-center shadow-2xl animate-slideUp">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-600">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h3 className="text-2xl font-black mb-3 text-gray-900 tracking-tight">Postar Oferta</h3>
              <p className="text-[12px] text-gray-500 mb-10 px-2 leading-relaxed font-medium">Apenas curadores autorizados podem postar novas ofertas. Entre com sua conta para continuar.</p>
              <div ref={authModalGoogleRef} className="flex justify-center mb-8"></div>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] p-2 hover:text-gray-600 transition-colors">Voltar</button>
            </div>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
}

export default App;
